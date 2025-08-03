import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/model/users";
import RefreshToken from "@/model/refreshtoken";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Extract client IP address from request headers.
 *
 * @param {Request} request The incoming request object
 * @returns {String} Client IP address or 'unknown' if not found
 */
function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    await connectToDatabase();
    
    const data = await request.json();
    const { username, password } = data;

    if (!username || !password) {
      await SecurityLog.logEvent({
        eventType: 'LOGIN_FAILURE',
        username: username || 'unknown',
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: 'Missing credentials' },
        severity: 'LOW'
      });
      return NextResponse.json({ error: "Invalid username and/or password" }, { status: 400 });
    }

    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      await SecurityLog.logEvent({
        eventType: 'LOGIN_FAILURE',
        username: username,
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: 'User not found' },
        severity: 'MEDIUM'
      });
      return NextResponse.json({ error: "Invalid username and/or password" }, { status: 401 });
    }

    if (user.isAccountLocked) {
      await SecurityLog.logEvent({
        eventType: 'LOGIN_FAILURE',
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: 'Account locked' },
        severity: 'HIGH'
      });
      return NextResponse.json({ 
        error: "Account is temporarily locked due to multiple failed login attempts. Please try again later." 
      }, { status: 423 });
    }

    if (!user.isActive) {
      await SecurityLog.logEvent({
        eventType: 'LOGIN_FAILURE',
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: 'Account inactive' },
        severity: 'HIGH'
      });
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      
      await SecurityLog.logEvent({
        eventType: 'LOGIN_FAILURE',
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { 
          reason: 'Invalid password',
          attemptCount: user.loginAttempts + 1 
        },
        severity: 'MEDIUM'
      });
      
      return NextResponse.json({ error: "Invalid username and/or password" }, { status: 401 });
    }

    await user.resetLoginAttempts();

    const accessToken = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    await RefreshToken.deleteMany({ user: user._id });
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip: clientIP,
      userAgent: userAgent
    });

    await SecurityLog.logEvent({
      eventType: 'LOGIN_SUCCESS',
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent: userAgent,
      details: { loginMethod: 'credentials' },
      severity: 'LOW'
    });

    const cookieStore = await cookies();
    cookieStore.set({
      name: "accessToken",
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 15,
    });

    cookieStore.set({
      name: "refreshToken",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: 60 * 60 * 24 * 7,
    });

    const responseData = {
      message: "Login successful!",
      user: {
        username: user.username,
        role: user.role,
      }
    };

    if (user.previousLogin) {
      responseData.lastLogin = {
        timestamp: user.previousLogin,
        message: `Last login: ${user.previousLogin.toLocaleString()}`
      };
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Login API Error:", error);
    
    await SecurityLog.logEvent({
      eventType: 'LOGIN_FAILURE',
      username: 'unknown',
      ipAddress: clientIP,
      userAgent: userAgent,
      details: { reason: 'System error', error: error.message },
      severity: 'HIGH'
    });
    
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 });
  }
}

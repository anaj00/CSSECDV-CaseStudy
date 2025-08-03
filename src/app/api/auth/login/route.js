import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/model/users";
import RefreshToken from "@/model/refreshtoken";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * Extract client IP address from request headers.
 */
function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const { username, password } = await request.json();

    if (!username || !password) {
      await SecurityLog.logEvent(
        "LOGIN_FAILURE",
        null,
        username || "unknown",
        clientIP,
        userAgent,
        "LOW",
        { reason: "Missing credentials" }
      );
      return NextResponse.json(
        { error: "Invalid username and/or password" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      await SecurityLog.logEvent(
        "LOGIN_FAILURE",
        null,
        username,
        clientIP,
        userAgent,
        "MEDIUM",
        { reason: "User not found" }
      );
      return NextResponse.json(
        { error: "Invalid username and/or password" },
        { status: 401 }
      );
    }

    if (user.isAccountLocked) {
      await SecurityLog.logEvent(
        "LOGIN_FAILURE",
        user._id,
        user.username,
        clientIP,
        userAgent,
        "HIGH",
        { reason: "Account locked" }
      );
      return NextResponse.json(
        {
          error:
            "Account is temporarily locked due to multiple failed login attempts. Please try again later.",
        },
        { status: 423 }
      );
    }

    if (!user.isActive) {
      await SecurityLog.logEvent(
        "LOGIN_FAILURE",
        user._id,
        user.username,
        clientIP,
        userAgent,
        "HIGH",
        { reason: "Account inactive" }
      );
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      await SecurityLog.logEvent(
        "LOGIN_FAILURE",
        user._id,
        user.username,
        clientIP,
        userAgent,
        "MEDIUM",
        {
          reason: "Invalid password",
          attemptCount: user.loginAttempts + 1,
        }
      );
      return NextResponse.json(
        { error: "Invalid username and/or password" },
        { status: 401 }
      );
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
      userAgent: userAgent,
    });

    await SecurityLog.logEvent(
      "LOGIN_SUCCESS",
      user._id,
      user.username,
      clientIP,
      userAgent,
      "LOW",
      { loginMethod: "credentials" }
    );

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
      },
    };

    if (user.previousLogin) {
      responseData.lastLogin = {
        timestamp: user.previousLogin,
        message: `Last login: ${user.previousLogin.toLocaleString()}`,
      };
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Login API Error:", error);

    await SecurityLog.logEvent(
      "LOGIN_FAILURE",
      null,
      username || "unknown",
      clientIP,
      userAgent,
      "HIGH",
      {
        reason: "System error",
        error: error.message,
      }
    );

    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}

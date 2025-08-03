import { NextResponse } from "next/server";
import User from "@/model/users";
import SecurityLog from "@/model/securitylog";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";

import { getClientIP } from "@/lib/utils";

export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    await connectToDatabase();
    
    const { username, email, password, role } = await request.json();

    if (!username || !email || !password) {
      await SecurityLog.logEvent({
        eventType: 'VALIDATION_FAILURE',
        username: username || 'unknown',
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: 'Missing required fields' },
        severity: 'LOW'
      });
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      await SecurityLog.logEvent({
        eventType: 'REGISTRATION',
        username: username,
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: 'User already exists', email: email },
        severity: 'LOW'
      });
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
    }

    let userRole = 'user';
    if (role && ['admin', 'moderator'].includes(role)) {
      userRole = role;
    }

    const newUser = new User({ 
      username, 
      email, 
      password,
      role: userRole
    });
    await newUser.save();

    await SecurityLog.logEvent({
      eventType: 'REGISTRATION',
      userId: newUser._id,
      username: newUser.username,
      ipAddress: clientIP,
      userAgent: userAgent,
      details: { email: newUser.email, role: newUser.role },
      severity: 'LOW'
    });

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const cookieStore = await cookies();
    cookieStore.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ message: "Registered successfully", user: { username: newUser.username, role: newUser.role } }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors[field] = error.errors[field].message;
      }
      
      await SecurityLog.logEvent({
        eventType: 'VALIDATION_FAILURE',
        username: 'unknown',
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { validationErrors },
        severity: 'LOW'
      });
      
      return NextResponse.json({ 
        error: "Validation failed", 
        details: validationErrors 
      }, { status: 400 });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      
      await SecurityLog.logEvent({
        eventType: 'VALIDATION_FAILURE',
        username: 'unknown',
        ipAddress: clientIP,
        userAgent: userAgent,
        details: { reason: `Duplicate ${field}`, field },
        severity: 'LOW'
      });
      
      return NextResponse.json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      }, { status: 409 });
    }
    
    await SecurityLog.logEvent({
      eventType: 'REGISTRATION',
      username: 'unknown',
      ipAddress: clientIP,
      userAgent: userAgent,
      details: { reason: 'System error', error: error.message },
      severity: 'HIGH'
    });
    
    return NextResponse.json({ error: "An error occurred during registration" }, { status: 500 });
  }
}

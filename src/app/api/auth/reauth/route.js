import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/model/users";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromCookie } from "@/lib/auth";
import { getClientIP } from "@/lib/utils";

export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const currentUser = await getUserFromCookie();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required for re-authentication" },
        { status: 400 }
      );
    }

    const user = await User.findById(currentUser.id).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await SecurityLog.logEvent({
        eventType: "REAUTH_FAILURE",
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent,
        severity: "HIGH",
        details: { reason: "Invalid password" },
      });

      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Generate re-auth token (5 minute expiry)
    const reauthToken = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        purpose: "reauth",
        timestamp: Date.now()
      },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    await SecurityLog.logEvent({
      eventType: "REAUTH_SUCCESS",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "LOW",
      details: { purpose: "critical_operation" },
    });

    return NextResponse.json({ 
      message: "Re-authentication successful",
      reauthToken 
    });

  } catch (error) {
    console.error("Re-auth API Error:", error);

    await SecurityLog.logEvent({
      eventType: "REAUTH_FAILURE",
      userId: null,
      username: "unknown",
      ipAddress: clientIP,
      userAgent,
      severity: "HIGH",
      details: {
        reason: "System error",
        error: error.message,
      },
    });

    return NextResponse.json(
      { error: "An error occurred during re-authentication" },
      { status: 500 }
    );
  }
}
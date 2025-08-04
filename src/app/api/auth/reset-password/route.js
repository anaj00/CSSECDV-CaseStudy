import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "@/model/users";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";
import { getClientIP } from "@/lib/utils";

export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const { resetToken, newPassword } = await request.json();

    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { error: "Reset token and new password are required" },
        { status: 400 }
      );
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.purpose !== "password_reset") {
        throw new Error("Invalid token purpose");
      }
    } catch (error) {
      await SecurityLog.logEvent({
        eventType: "PASSWORD_RESET_FAILURE",
        userId: null,
        username: "unknown",
        ipAddress: clientIP,
        userAgent,
        severity: "HIGH",
        details: { reason: "Invalid reset token" },
      });

      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.id).select("+password +passwordHistory");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('Password reset - user found:', user.username);
    console.log('Password history count:', user.passwordHistory ? user.passwordHistory.length : 0);
    console.log('Current password exists:', !!user.password);

    // Check if new password is being reused
    const isReused = await user.isPasswordReused(newPassword);
    console.log('Password reuse check result:', isReused);
    if (isReused) {
      await SecurityLog.logEvent({
        eventType: "PASSWORD_RESET_FAILURE",
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent,
        severity: "MEDIUM",
        details: { reason: "Password reuse detected" },
      });

      return NextResponse.json(
        { error: "Cannot reuse any of your last 5 passwords" },
        { status: 400 }
      );
    }

    // Add current password to history before changing
    if (user.password) {
      user.passwordHistory.push({
        password: user.password,
        createdAt: new Date()
      });

      // Keep only last 5 passwords in history
      if (user.passwordHistory.length > 5) {
        user.passwordHistory = user.passwordHistory.slice(-5);
      }
    }

    // Update password and timestamp
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    
    await user.save();

    await SecurityLog.logEvent({
      eventType: "PASSWORD_RESET_SUCCESS",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "MEDIUM",
      details: { method: "security_questions" },
    });

    return NextResponse.json({ message: "Password reset successfully" });

  } catch (error) {
    console.error("Password reset API Error:", error);

    await SecurityLog.logEvent({
      eventType: "PASSWORD_RESET_FAILURE",
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
      { error: "An error occurred while resetting password" },
      { status: 500 }
    );
  }
}
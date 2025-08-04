import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
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

    const { currentPassword, newPassword, reauthToken } = await request.json();

    if (!currentPassword || !newPassword || !reauthToken) {
      return NextResponse.json(
        { error: "Current password, new password, and re-authentication token are required" },
        { status: 400 }
      );
    }

    // Verify re-authentication token
    const user = await User.findById(currentUser.id).select("+password");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if password can be changed (age restriction)
    if (!user.canChangePassword()) {
      await SecurityLog.logEvent({
        eventType: "PASSWORD_CHANGE_BLOCKED",
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent,
        severity: "MEDIUM",
        details: { reason: "Password too recent" },
      });

      return NextResponse.json(
        { error: "Password must be at least 1 day old before it can be changed" },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await SecurityLog.logEvent({
        eventType: "PASSWORD_CHANGE_FAILURE",
        userId: user._id,
        username: user.username,
        ipAddress: clientIP,
        userAgent,
        severity: "HIGH",
        details: { reason: "Invalid current password" },
      });

      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Check if new password is being reused
    const isReused = await user.isPasswordReused(newPassword);
    if (isReused) {
      await SecurityLog.logEvent({
        eventType: "PASSWORD_CHANGE_FAILURE",
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
    const currentPasswordHash = user.password;
    user.passwordHistory.push({
      password: currentPasswordHash,
      createdAt: new Date()
    });

    // Keep only last 5 passwords in history
    if (user.passwordHistory.length > 5) {
      user.passwordHistory = user.passwordHistory.slice(-5);
    }

    // Update password and timestamp
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    
    await user.save();

    await SecurityLog.logEvent({
      eventType: "PASSWORD_CHANGE_SUCCESS",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "LOW",
      details: { method: "self_service" },
    });

    return NextResponse.json({ message: "Password changed successfully" });

  } catch (error) {
    console.error("Password change API Error:", error);

    await SecurityLog.logEvent({
      eventType: "PASSWORD_CHANGE_FAILURE",
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
      { error: "An error occurred while changing password" },
      { status: 500 }
    );
  }
}
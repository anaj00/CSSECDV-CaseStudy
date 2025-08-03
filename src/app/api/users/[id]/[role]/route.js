import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/model/users";
import SecurityLog from "@/model/securitylog";
import { getUserFromCookie } from "@/lib/auth";

export async function PATCH(req, { params }) {
  await connectDB();
  const { id } = params;
  const { newRole } = await req.json();

  const validRoles = ["user", "moderator"];

  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const actingUser = await getUserFromCookie();

  if (!actingUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent modifying admins unless you are admin
  if (targetUser.role === "admin" && actingUser.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: Cannot modify admin" },
      { status: 403 }
    );
  }

  // Moderators cannot assign the "admin" role
  if (actingUser.role === "moderator" && newRole === "admin") {
    return NextResponse.json(
      { error: "Forbidden: Cannot assign admin role" },
      { status: 403 }
    );
  }

  // Moderators can only modify user/moderator roles
  if (
    actingUser.role === "moderator" &&
    !(targetUser.role === "user" || targetUser.role === "moderator")
  ) {
    return NextResponse.json(
      { error: "Forbidden: Cannot modify this user" },
      { status: 403 }
    );
  }

  const oldRole = targetUser.role;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: newRole },
      { new: true }
    );

    await SecurityLog.create({
      eventType: "ROLE_UPDATE",
      username: actingUser.username,
      ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: req.headers.get("user-agent") ?? "unknown",
      severity: "MEDIUM",
      details: {
        targetUserId: updatedUser._id,
        oldRole,
        newRole,
        by: actingUser.username,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (err) {
    console.error("Role update error:", err);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

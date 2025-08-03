import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Thread from "@/model/thread";
import { getClientIP } from "@/lib/utils";
import { getUserFromCookie } from "@/lib/auth";
import SecurityLog from "@/model/securitylog";
import Reply from "@/model/reply";

export async function GET(req, context) {
  try {
    const { id } = context.params || {};

    await connectToDatabase();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread ID" },
        { status: 400 }
      );
    }

    const thread = await Thread.findById(id)
      .populate("createdBy", "username")
      .lean();

    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: thread });
  } catch (error) {
    console.error("GET /api/threads/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE THREAD
export async function DELETE(request, { params }) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();
    const user = await getUserFromCookie();
    const { id } = params;

    if (!user || !['admin', 'moderator'].includes(user.role)) {
      await SecurityLog.logEvent({
        eventType: "UNAUTHORIZED_DELETE_THREAD_ATTEMPT",
        username: user?.username || "unknown",
        ipAddress: clientIP,
        userAgent,
        severity: "HIGH",
        details: { threadId: id, reason: "User is not admin or moderator" },
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thread = await Thread.findById(id);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Delete all replies associated with the thread
    await Reply.deleteMany({ thread: id });

    // Delete the thread
    await Thread.findByIdAndDelete(id);

    await SecurityLog.logEvent({
      eventType: "DELETE_THREAD",
      userId: user._id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      severity: "MEDIUM",
      details: { threadId: id, title: thread.title },
    });

    return NextResponse.json({ message: "Thread and replies deleted successfully" });
  } catch (error) {
    console.error("Error deleting thread:", error);

    await SecurityLog.logEvent({
      eventType: "DELETE_THREAD_ERROR",
      username: user?.username || "unknown",
      ipAddress: clientIP,
      userAgent,
      severity: "HIGH",
      details: { threadId: params?.id, error: error.message },
    });

    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }
}



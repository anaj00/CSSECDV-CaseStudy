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
  const clientIP = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await connectToDatabase();

    const user = await getUserFromCookie(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
    }

    const thread = await mongoose.connection
      .collection("threads")
      .findOne({ _id: new mongoose.Types.ObjectId(id) });

    const isAdmin = user.role === "admin";
    const isModerator = user.role === "moderator";
    const isOwner = thread?.createdBy === user.id;

    if (!thread || (!isOwner && !isAdmin && !isModerator)) {
      await SecurityLog.logEvent({
        eventType: "THREAD_FORBIDDEN_ACCESS",
        userId: user.id,
        username: user.username,
        ipAddress: clientIP,
        userAgent,
        details: { attemptedThreadId: id, action: "delete" },
        severity: "HIGH",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await mongoose.connection
      .collection("threads")
      .deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    await SecurityLog.logEvent({
      eventType: "THREAD_DELETED",
      userId: user.id,
      username: user.username,
      ipAddress: clientIP,
      userAgent,
      details: { threadId: id, title: thread.title },
      severity: "MEDIUM",
    });

    return NextResponse.json({ success: true, message: "Thread deleted" });
  } catch (error) {
    console.error("Error deleting thread:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete thread" },
      { status: 500 }
    );
  }
}



// EDIT THREAD
export async function PUT(req, { params }) {
  await connectToDatabase();
  const { id } = await params;
  const { title, content } = await req.json();
  const user = await getUserFromCookie();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await Thread.findById(id);
  if (!thread)
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const isCreator = thread.createdBy.toString() === user.id;
  const isAdmin = user.role === "admin";

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  thread.title = title;
  thread.content = content;
  await thread.save();

  return NextResponse.json({ data: thread });
}

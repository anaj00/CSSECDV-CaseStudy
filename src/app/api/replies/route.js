import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromCookie } from "@/lib/auth";
import Reply from "@/model/reply";
import SecurityLog from "@/model/securitylog";

// Helper: convert to ObjectId safely
function toObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid ObjectId");
  return new mongoose.Types.ObjectId(id);
}

// ✅ CREATE REPLY
export async function POST(request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!data.content || !data.threadId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const threadId = data.threadId;
    const userId = user.id;

    if (
      !mongoose.Types.ObjectId.isValid(threadId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return NextResponse.json(
        { error: "Invalid threadId or userId" },
        { status: 400 }
      );
    }

    const reply = await Reply.create({
      content: data.content,
      thread: new mongoose.Types.ObjectId(threadId),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await SecurityLog.logEvent({
      eventType: "REPLY_CREATED",
      userId: userId,
      username: user.username,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      details: { replyId: reply._id, threadId },
      severity: "LOW",
    });

    let populatedReply;

    try {
      populatedReply = await Reply.findById(reply._id)
        .populate("createdBy", "username")
        .lean();
    } catch (populateError) {
      console.warn("⚠️ populate failed, using raw reply");
      populatedReply = reply;
    }

    return NextResponse.json({ success: true, data: populatedReply });
  } catch (err) {
    console.error("❌ Error in POST /api/replies:", err);
    return NextResponse.json(
      { error: "Failed to create reply", details: err.message },
      { status: 500 }
    );
  }
}



// ✅ GET REPLIES FOR THREAD
export async function GET(request) {
  await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");

  if (!threadId)
    return NextResponse.json({ error: "Thread ID required" }, { status: 400 });

  if (!mongoose.Types.ObjectId.isValid(threadId))
    return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });

  try {
    const replies = await Reply.find({ thread: toObjectId(threadId) })
      .sort({ createdAt: 1 })
      .populate("createdBy", "username");

    return NextResponse.json({ success: true, data: replies });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch replies" },
      { status: 500 }
    );
  }
}

// ✅ UPDATE REPLY
export async function PUT(request) {
  await connectToDatabase();
  const { id, content } = await request.json();
  const user = await getUserFromCookie();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!id || !content)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const reply = await Reply.findById(id);
    if (!reply || reply.createdBy.toString() !== user.id) {
      await SecurityLog.logEvent({
        eventType: "REPLY_FORBIDDEN_ACCESS",
        userId: user.id,
        username: user.username,
        details: { attemptedReplyId: id },
        severity: "HIGH",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    reply.content = content;
    reply.edited = true;
    reply.updatedAt = new Date();
    await reply.save();

    await SecurityLog.logEvent({
      eventType: "REPLY_UPDATED",
      userId: user.id,
      username: user.username,
      details: { replyId: reply._id },
      severity: "LOW",
    });

    return NextResponse.json({ success: true, data: reply });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update reply" },
      { status: 500 }
    );
  }
}

// ✅ DELETE REPLY
export async function DELETE(request) {
  await connectToDatabase();
  const { id } = await request.json();
  const user = await getUserFromCookie();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const reply = await Reply.findById(id);
    if (!reply || reply.createdBy.toString() !== user.id) {
      await SecurityLog.logEvent({
        eventType: "REPLY_FORBIDDEN_ACCESS",
        userId: user.id,
        username: user.username,
        details: { attemptedReplyId: id },
        severity: "HIGH",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await reply.deleteOne();

    await SecurityLog.logEvent({
      eventType: "REPLY_DELETED",
      userId: user.id,
      username: user.username,
      details: { replyId: id },
      severity: "MEDIUM",
    });

    return NextResponse.json({ success: true, message: "Reply deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete reply" },
      { status: 500 }
    );
  }
}

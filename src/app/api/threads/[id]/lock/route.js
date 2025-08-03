import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromCookie } from "@/lib/auth";
import Thread from "@/model/thread";
import SecurityLog from "@/model/securitylog";
import { getClientIP } from "@/lib/utils";

export async function PATCH(request, { params }) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const { id } = await params;

  await connectToDatabase();
  const user = await getUserFromCookie();

  if (!user || !["admin", "moderator"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const thread = await Thread.findById(id);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  thread.isLocked = !thread.isLocked;
  await thread.save();

  await SecurityLog.logEvent({
    eventType: thread.isLocked ? "THREAD_LOCKED" : "THREAD_UNLOCKED",
    username: user.username,
    ipAddress: clientIP,
    userAgent,
    details: { threadId: id, title: thread.title },
    severity: "LOW",
  });

  return NextResponse.json({
    success: true,
    message: `Thread ${thread.isLocked ? "locked" : "unlocked"}`,
    data: thread,
  });
}

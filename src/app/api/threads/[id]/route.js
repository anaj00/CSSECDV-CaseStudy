import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Thread from "@/model/thread";

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

import { NextResponse } from "next/server";
import Forum from "@/model/forum";
import Thread from "@/model/thread";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import { getClientIP } from "@/lib/utils";
import { getUserFromCookie } from "@/lib/auth";

/**
 * Validate if the provided ID is a valid MongoDB ObjectId
 *
 * @param {string} id The ID to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/forums/[id]/threads
 * Retrieve all threads for a specific forum with pagination
 */
export async function GET(request, context) {
  const { id } = await context.params;
  const clientIP = getClientIP(request);

  try {
    await connectToDatabase();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid forum ID format" },
        { status: 400 }
      );
    }

    const forum = await Forum.findById(id);
    if (!forum) {
      return NextResponse.json(
        { success: false, error: "Forum not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    let query = { forum: id };
    if (search) {
      query = {
        ...query,
        $or: [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ],
      };
    }

    const threads = await Thread.find(query)
      .populate("createdBy", "username")
      .populate("forum", "title")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Thread.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        forum: {
          id: forum._id,
          title: forum.title,
          description: forum.description,
        },
        threads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching forum threads:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch forum threads",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST /api/forums/[id]/threads
export async function POST(request, context) {
  const { id } = await context.params;
  const user = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const body = await request.json();

  try {
    const newThread = await Thread.create({
      title: body.title,
      content: body.content,
      forum: id,
      createdBy: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ data: newThread }, { status: 201 });
  } catch (err) {
    console.error("Error creating thread:", err);
    return NextResponse.json(
      { error: "Failed to create thread" },
      { status: 500 }
    );
  }
}

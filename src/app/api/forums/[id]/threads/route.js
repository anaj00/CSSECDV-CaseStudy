import { NextResponse } from "next/server";
import Forum from "@/model/forum";
import Thread from "@/model/thread";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

/**
 * Extract client IP address from request headers.
 *
 * @param {Request} request The incoming request object
 * @returns {String} Client IP address or 'unknown' if not found
 */
function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

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
export async function GET(request, { params }) {
  const clientIP = getClientIP(request);
  
  try {
    await connectToDatabase();
    
    const { id } = params;

    // Validate ObjectId
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid forum ID format" },
        { status: 400 }
      );
    }

    // Verify forum exists
    const forum = await Forum.findById(id);
    if (!forum) {
      return NextResponse.json(
        { success: false, error: "Forum not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search') || '';

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search query
    let query = { forum: id };
    if (search) {
      query = {
        ...query,
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get threads with population of creator info
    const threads = await Thread.find(query)
      .populate('createdBy', 'username email')
      .populate('forum', 'title')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Thread.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: {
        forum: {
          id: forum._id,
          title: forum.title,
          description: forum.description
        },
        threads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching forum threads:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch forum threads",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

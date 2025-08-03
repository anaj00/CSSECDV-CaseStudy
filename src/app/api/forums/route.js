import { NextResponse } from "next/server";
import Forum from "@/model/forum";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromCookie } from "@/lib/auth";

import { getClientIP } from "@/lib/utils";

/**
 * GET /api/forums
 * Retrieve all forums with optional pagination and sorting
 */
export async function GET(request) {
  const clientIP = getClientIP(request);
  
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const search = searchParams.get('search') || '';

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Get forums with population of creator info
    const forums = await Forum.find(query)
      .populate('createdBy', 'username email')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Forum.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: forums,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching forums:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch forums",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forums
 * Create a new forum (requires authentication)
 */
export async function POST(request) {
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    await connectToDatabase();
    
    // Check authentication
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { title, description } = await request.json();

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "Title and description are required" },
        { status: 400 }
      );
    }

    // Validate field lengths (based on schema)
    if (title.length < 5 || title.length > 100) {
      return NextResponse.json(
        { success: false, error: "Title must be between 5 and 100 characters" },
        { status: 400 }
      );
    }

    if (description.length < 10 || description.length > 500) {
      return NextResponse.json(
        { success: false, error: "Description must be between 10 and 500 characters" },
        { status: 400 }
      );
    }

    // Create new forum
    const forum = new Forum({
      title: title.trim(),
      description: description.trim(),
      createdBy: user.id
    });

    const savedForum = await forum.save();
    
    // Populate creator info for response
    await savedForum.populate('createdBy', 'username email');

    return NextResponse.json({
      success: true,
      message: "Forum created successfully",
      data: savedForum
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating forum:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { 
          success: false,
          error: "Validation failed",
          details: validationErrors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: "Failed to create forum",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
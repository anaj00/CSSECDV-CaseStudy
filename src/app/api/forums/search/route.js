import { NextResponse } from "next/server";
import Forum from "@/model/forum";
import { connectToDatabase } from "@/lib/mongodb";

import { getClientIP } from "@/lib/utils";

/**
 * GET /api/forums/search
 * Advanced search functionality for forums
 */
export async function GET(request) {
  const clientIP = getClientIP(request);
  
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const creator = searchParams.get('creator') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!query.trim()) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search pipeline
    let pipeline = [];

    // Match stage - search in title and description
    let matchStage = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };

    // Add date range filter if provided
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) {
        matchStage.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        matchStage.createdAt.$lte = new Date(dateTo);
      }
    }

    pipeline.push({ $match: matchStage });

    // Lookup creator information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator'
      }
    });

    pipeline.push({ $unwind: '$creator' });

    // Filter by creator if specified
    if (creator) {
      pipeline.push({
        $match: {
          $or: [
            { 'creator.username': { $regex: creator, $options: 'i' } },
            { 'creator.email': { $regex: creator, $options: 'i' } }
          ]
        }
      });
    }

    // Add relevance scoring
    pipeline.push({
      $addFields: {
        relevanceScore: {
          $add: [
            // Title matches score higher
            {
              $cond: [
                { $regexMatch: { input: '$title', regex: query, options: 'i' } },
                10,
                0
              ]
            },
            // Description matches score lower
            {
              $cond: [
                { $regexMatch: { input: '$description', regex: query, options: 'i' } },
                5,
                0
              ]
            },
            // Exact title match scores highest
            {
              $cond: [
                { $eq: [{ $toLower: '$title' }, query.toLowerCase()] },
                20,
                0
              ]
            }
          ]
        }
      }
    });

    // Lookup thread count for each forum
    pipeline.push({
      $lookup: {
        from: 'threads',
        localField: '_id',
        foreignField: 'forum',
        as: 'threads'
      }
    });

    pipeline.push({
      $addFields: {
        threadCount: { $size: '$threads' }
      }
    });

    // Project final fields
    pipeline.push({
      $project: {
        title: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        threadCount: 1,
        relevanceScore: 1,
        'creator.username': 1,
        'creator.email': 1,
        'creator._id': 1
      }
    });

    // Sort based on preference
    let sortStage = {};
    switch (sortBy) {
      case 'relevance':
        sortStage = { relevanceScore: -1, createdAt: -1 };
        break;
      case 'newest':
        sortStage = { createdAt: -1 };
        break;
      case 'oldest':
        sortStage = { createdAt: 1 };
        break;
      case 'threads':
        sortStage = { threadCount: -1, createdAt: -1 };
        break;
      case 'title':
        sortStage = { title: 1 };
        break;
      default:
        sortStage = { relevanceScore: -1, createdAt: -1 };
    }

    pipeline.push({ $sort: sortStage });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Forum.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute search
    const forums = await Forum.aggregate(pipeline);

    return NextResponse.json({
      success: true,
      data: {
        query,
        forums,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          creator: creator || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          sortBy
        }
      }
    });

  } catch (error) {
    console.error('Error searching forums:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to search forums",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

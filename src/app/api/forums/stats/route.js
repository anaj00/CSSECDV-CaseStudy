import { NextResponse } from "next/server";
import Forum from "@/model/forum";
import Thread from "@/model/thread";
import Post from "@/model/post";
import { connectToDatabase } from "@/lib/mongodb";

import { getClientIP } from "@/lib/utils";

/**
 * GET /api/forums/stats
 * Get comprehensive statistics about forums
 */
export async function GET(request) {
  const clientIP = getClientIP(request);
  
  try {
    await connectToDatabase();
    
    // Get total forum count
    const totalForums = await Forum.countDocuments();
    
    // Get total thread count
    const totalThreads = await Thread.countDocuments();
    
    // Get total post count
    const totalPosts = await Post.countDocuments();
    
    // Get most active forums (by thread count)
    const mostActiveForums = await Forum.aggregate([
      {
        $lookup: {
          from: 'threads',
          localField: '_id',
          foreignField: 'forum',
          as: 'threads'
        }
      },
      {
        $addFields: {
          threadCount: { $size: '$threads' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $unwind: '$creator'
      },
      {
        $project: {
          title: 1,
          description: 1,
          threadCount: 1,
          createdAt: 1,
          'creator.username': 1,
          'creator.email': 1
        }
      },
      {
        $sort: { threadCount: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    // Get recently created forums
    const recentForums = await Forum.find()
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    // Get forums with recent activity (based on latest thread creation)
    const forumsWithRecentActivity = await Forum.aggregate([
      {
        $lookup: {
          from: 'threads',
          localField: '_id',
          foreignField: 'forum',
          as: 'threads'
        }
      },
      {
        $match: {
          'threads.0': { $exists: true } // Only forums with at least one thread
        }
      },
      {
        $addFields: {
          latestThreadDate: { $max: '$threads.createdAt' },
          threadCount: { $size: '$threads' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator'
        }
      },
      {
        $unwind: '$creator'
      },
      {
        $project: {
          title: 1,
          description: 1,
          threadCount: 1,
          latestThreadDate: 1,
          createdAt: 1,
          'creator.username': 1,
          'creator.email': 1
        }
      },
      {
        $sort: { latestThreadDate: -1 }
      },
      {
        $limit: 5
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalForums,
          totalThreads,
          totalPosts,
          averageThreadsPerForum: totalForums > 0 ? Math.round(totalThreads / totalForums * 100) / 100 : 0
        },
        mostActiveForums,
        recentForums,
        forumsWithRecentActivity
      }
    });

  } catch (error) {
    console.error('Error fetching forum statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch forum statistics",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

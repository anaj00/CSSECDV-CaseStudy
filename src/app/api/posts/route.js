import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromCookie } from '@/lib/auth';
import Post from '@/model/post';
import SecurityLog from '@/model/securitylog';
import { ObjectId } from 'bson';

function toObjectId(id) {
  if (!ObjectId.isValid(id)) throw new Error('Invalid ObjectId');
  return ObjectId.createFromHexString(id);
}

// CREATE POST
export async function POST(request) {
  const db = await connectToDatabase();
  const data = await request.json();
  const user = getUserFromCookie();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!data.content || !data.threadId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const post = await Post.create({
    content: data.content,
    thread: toObjectId(data.threadId),
    createdBy: toObjectId(user.id),
  });

  await SecurityLog.logEvent({
    eventType: 'POST_CREATED',
    userId: user.id,
    username: user.username,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    details: { postId: post._id, threadId: data.threadId },
    severity: 'LOW',
  });

  return NextResponse.json(post);
}

// GET POSTS BY THREAD
export async function GET(request) {
  const db = await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get('threadId');

  if (!threadId) return NextResponse.json({ error: 'Thread ID required' }, { status: 400 });

  const posts = await Post.find({ thread: toObjectId(threadId) }).sort({ createdAt: 1 }).populate('createdBy', 'username');
  return NextResponse.json(posts);
}

// UPDATE POST
export async function PUT(request) {
  const db = await connectToDatabase();
  const { id, content } = await request.json();
  const user = getUserFromCookie();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!id || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const post = await Post.findById(id);
  if (!post || post.createdBy.toString() !== user.id) {
    await SecurityLog.logEvent({
      eventType: 'POST_FORBIDDEN_ACCESS',
      userId: user.id,
      username: user.username,
      details: { attemptedPostId: id },
      severity: 'HIGH'
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  post.content = content;
  post.edited = true;
  post.updatedAt = new Date();
  await post.save();

  await SecurityLog.logEvent({
    eventType: 'POST_UPDATED',
    userId: user.id,
    username: user.username,
    details: { postId: post._id },
    severity: 'LOW'
  });

  return NextResponse.json(post);
}

// DELETE POST
export async function DELETE(request) {
  const db = await connectToDatabase();
  const { id } = await request.json();
  const user = getUserFromCookie();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const post = await Post.findById(id);
  if (!post || post.createdBy.toString() !== user.id) {
    await SecurityLog.logEvent({
      eventType: 'POST_FORBIDDEN_ACCESS',
      userId: user.id,
      username: user.username,
      details: { attemptedPostId: id },
      severity: 'HIGH'
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await post.deleteOne();

  await SecurityLog.logEvent({
    eventType: 'POST_DELETED',
    userId: user.id,
    username: user.username,
    details: { postId: id },
    severity: 'MEDIUM'
  });

  return NextResponse.json({ message: 'Post deleted' });
}

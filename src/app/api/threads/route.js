import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import SecurityLog from '@/model/securitylog';

// GET ALL THREADS
export async function GET(request) {
  const db = await connectToDatabase();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = parseInt(searchParams.get('skip') || '0');
  const query = searchParams.get('q')?.toLowerCase();

  const filter = query ? { title: { $regex: query, $options: 'i' } } : {};

  const threads = await db
    .collection('threads')
    .find(filter)
    .sort({ lastActivityAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json(threads);
}

// CREATE THREAD
export async function POST(request) {
  const db = await connectToDatabase();
  const data = await request.json();
  const user = getUserFromCookie();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!data.title || !data.content) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

  const thread = {
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdBy: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    views: 0,
    likes: 0,
    replies: 0,
    isLocked: false,
    isPinned: false,
    lastActivityAt: new Date()
  };

  const result = await db.collection('threads').insertOne(thread);

  await SecurityLog.logEvent({
    eventType: 'THREAD_CREATED',
    userId: user.id,
    username: user.username,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    details: { threadId: result.insertedId, title: data.title },
    severity: 'LOW'
  });

  const newThread = await db.collection('threads').findOne({ _id: result.insertedId });
  return NextResponse.json(newThread);
}

// UPDATE THREAD
export async function PUT(request) {
  const db = await connectToDatabase();
  const { id, title, content, tags, isPinned, isLocked } = await request.json();
  const user = getUserFromCookie();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await db.collection('threads').findOne({ _id: new ObjectId(id) });
  if (!thread || (thread.createdBy !== user.id && user.role !== 'admin')) {
    await SecurityLog.logEvent({
      eventType: 'THREAD_FORBIDDEN_ACCESS',
      userId: user.id,
      username: user.username,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { attemptedThreadId: id, action: 'update' },
      severity: 'HIGH'
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.collection('threads').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...(title && { title }),
        ...(content && { content }),
        ...(tags && { tags }),
        ...(typeof isPinned === 'boolean' && { isPinned }),
        ...(typeof isLocked === 'boolean' && { isLocked }),
        updatedAt: new Date()
      }
    }
  );

  await SecurityLog.logEvent({
    eventType: 'THREAD_UPDATED',
    userId: user.id,
    username: user.username,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    details: { threadId: id, updatedFields: { title, content, tags, isPinned, isLocked } },
    severity: 'LOW'
  });

  const updated = await db.collection('threads').findOne({ _id: new ObjectId(id) });
  return NextResponse.json(updated);
}

// DELETE THREAD
export async function DELETE(request) {
  const db = await connectToDatabase();
  const { id } = await request.json();
  const user = getUserFromCookie();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await db.collection('threads').findOne({ _id: new ObjectId(id) });
  if (!thread || (thread.createdBy !== user.id && user.role !== 'admin')) {
    await SecurityLog.logEvent({
      eventType: 'THREAD_FORBIDDEN_ACCESS',
      userId: user.id,
      username: user.username,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { attemptedThreadId: id, action: 'delete' },
      severity: 'HIGH'
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.collection('threads').deleteOne({ _id: new ObjectId(id) });

  await SecurityLog.logEvent({
    eventType: 'THREAD_DELETED',
    userId: user.id,
    username: user.username,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    details: { threadId: id, title: thread.title },
    severity: 'MEDIUM'
  });

  return NextResponse.json({ message: 'Thread deleted' });
}
import clientPromise from '@/lib/mongodb'; 
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/auth';

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const threads = await db.collection('threads').find({}).toArray();
  return NextResponse.json(threads);
}

export async function POST(request) {
  const client = await clientPromise;
  const db = client.db();
  const data = await request.json();

  const user = getUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!data.title || !data.content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await db.collection('threads').insertOne({
    title: data.title,
    content: data.content,
    createdBy: user.id, // from JWT, not the request body!
    createdAt: new Date(),
  });

  const newThread = await db.collection('threads').findOne({ _id: result.insertedId });
  return NextResponse.json(newThread);
}

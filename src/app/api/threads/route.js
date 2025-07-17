import clientPromise from '@/lib/mongodb';

export async function GET(request) {
  const client = await clientPromise;
  const db = client.db();
  const threads = await db.collection('threads').find({}).toArray();
  return Response.json(threads);
}

export async function POST(request) {
  const client = await clientPromise;
  const db = client.db();
  const data = await request.json();
  const result = await db.collection('threads').insertOne({
    title: data.title,
    content: data.content,
    author: data.author,
    createdAt: new Date(),
  });
  return Response.json(result);
}

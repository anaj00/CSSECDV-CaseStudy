import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/model/users';

export async function GET() {
  await connectDB();

  try {
    const users = await User.find({}, '-password'); // exclude password
    return NextResponse.json({ users });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
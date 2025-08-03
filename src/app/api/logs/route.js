import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SecurityLog from '@/model/securitylog';
import { getUserFromCookie } from '@/lib/auth';

export async function GET(req) {
  await connectDB();

  try {
    const adminUser = await getUserFromCookie();

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await SecurityLog.find().sort({ createdAt: -1 });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error('Error fetching logs:', err);
    return NextResponse.json({ error: 'Failed to retrieve logs' }, { status: 500 });
  }
}

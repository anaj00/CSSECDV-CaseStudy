import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/model/users';
import SecurityLog from '@/model/securitylog';
import { getUserFromCookie } from '@/lib/auth';

export async function DELETE(req, { params }) {
  await connectDB();
  const { id } = await params;

  try {
    const adminUser = await getUserFromCookie();
    if (!adminUser || adminUser.role !== 'admin') {
        try {
            await SecurityLog.create({
            eventType: 'UNAUTHORIZED_DELETE_ATTEMPT',
            username: adminUser?.username ?? 'Unknown',
            ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
            userAgent: req.headers.get('user-agent') ?? 'unknown',
            severity: 'HIGH',
            details: {
                attemptedUserId: id,
            },
            });
        } catch (logErr) {
            console.error('Logging failed:', logErr);
        }

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      await SecurityLog.logEvent({
        eventType: 'DELETE_USER',
        username: adminUser.username,
        userId: deletedUser.username,
        ipAddress: clientIP,
        userAgent,
        details: {
          reason: 'Manual deletion by admin',
          deletedUser: deletedUser.username,
          deletedUserId: deletedUser._id.toString(),
        },
        severity: 'LOW',
      });
    } catch (logError) {
      console.error('Logging failed:', logError);
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Internal error during user deletion:', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

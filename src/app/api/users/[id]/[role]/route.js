import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/model/users';
import SecurityLog from '@/model/securitylog';
import { getUserFromCookie } from '@/lib/auth';

export async function PATCH(req, { params }) {
  await connectDB();
  const { id } = await params;
  const { newRole } = await req.json();

  // Validate role
  if (!['user', 'moderator'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const adminUser = await getUserFromCookie();

  // Check authorization
  if (!adminUser || adminUser.role !== 'admin') {
    try {
      await SecurityLog.create({
        eventType: 'UNAUTHORIZED_ROLE_CHANGE_ATTEMPT',
        username: adminUser?.username ?? 'Unknown',
        ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
        userAgent: req.headers.get('user-agent') ?? 'unknown',
        severity: 'HIGH',
        details: {
          attemptedUserId: id,
          attemptedNewRole: newRole,
        },
      });
    } catch (logErr) {
      console.error('Logging failed (unauthorized):', logErr);
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const oldRole = targetUser.role;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: newRole },
      { new: true }
    );

    try {
      await SecurityLog.create({
        eventType: 'ROLE_UPDATE',
        username: adminUser.username,
        ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
        userAgent: req.headers.get('user-agent') ?? 'unknown',
        severity: 'MEDIUM',
        details: {
          targetUserId: updatedUser._id,
          oldRole,
          newRole,
        },
      });
    } catch (logErr) {
      console.error('Logging failed (role update):', logErr);
    }

    return NextResponse.json({ user: updatedUser });

  } catch (err) {
    console.error('Role update error:', err);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

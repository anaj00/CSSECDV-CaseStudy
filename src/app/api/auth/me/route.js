import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import User from '@/model/users';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Get current user information from JWT tokens or NextAuth session
 */
export async function GET() {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    
    // Try access token first
    const accessToken = cookieStore.get('accessToken')?.value;
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && !user.isAccountLocked) {
          return NextResponse.json({ 
            user: {
              id: user._id,
              username: user.username,
              email: user.email,
              role: user.role
            }
          });
        }
      } catch (error) {
        // Token expired or invalid, try refresh token
      }
    }
    
    // Try legacy token
    const legacyToken = cookieStore.get('token')?.value;
    if (legacyToken) {
      try {
        const decoded = jwt.verify(legacyToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (user && !user.isAccountLocked) {
          return NextResponse.json({ 
            user: {
              id: user._id,
              username: user.username,
              email: user.email,
              role: user.role
            }
          });
        }
      } catch (error) {
        // Token invalid
      }
    }
    
    return NextResponse.json({ user: null }, { status: 401 });
    
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

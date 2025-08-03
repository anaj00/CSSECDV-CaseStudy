import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import RefreshToken from "@/model/refreshtoken";
import SecurityLog from "@/model/securitylog";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request) {
  try {
    await connectToDatabase();
    
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;
    const accessToken = cookieStore.get("accessToken")?.value;
    const legacyToken = cookieStore.get("token")?.value;

    let userId = null;
    let username = 'unknown';

    // Try to extract user info from any available token
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        userId = decoded?.id;
        username = decoded?.username || 'unknown';
      } catch (error) {
        console.log('Failed to decode refresh token');
      }
    } else if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken);
        userId = decoded?.id;
        username = decoded?.username || 'unknown';
      } catch (error) {
        console.log('Failed to decode access token');
      }
    } else if (legacyToken) {
      try {
        const decoded = jwt.decode(legacyToken);
        userId = decoded?.id;
        username = decoded?.username || 'unknown';
      } catch (error) {
        console.log('Failed to decode legacy token');
      }
    }

    // Remove refresh tokens from database if user ID is available
    if (userId && refreshToken) {
      await RefreshToken.deleteMany({ user: userId, token: refreshToken });
    }

    // Log the logout event
    await SecurityLog.logEvent(
      'LOGOUT',
      userId,
      username,
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
        request.headers.get('x-real-ip') || 
        'unknown',
      request.headers.get('user-agent') || 'unknown',
      'LOW',
      { reason: 'User initiated logout' }
    );

    // Clear all auth cookies
    cookieStore.set("accessToken", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    
    cookieStore.set("refreshToken", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    
    cookieStore.set("token", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return NextResponse.json({ message: "Logged out successfully." }, { status: 200 });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}

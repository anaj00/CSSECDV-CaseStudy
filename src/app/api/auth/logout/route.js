import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import RefreshToken from "@/model/refreshtoken";

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token found." }, { status: 200 });
    }

    // Decode token to get user ID 
    const decoded = jwt.decode(refreshToken);

    if (decoded?.id && decoded?.role === "admin") {
    
        // Remove refresh token
        await RefreshToken.deleteMany({ user: decoded.id, token: refreshToken });

        // Log the logout in AuditLog only if the user is an admin
        await AuditLog.create({
            action: "logout",
            model: "User",
            documentId: decoded.id,
            userId: decoded.id,
            timestamp: new Date(),
    });
    } else if (decoded?.id) {
        // Remove refresh token (no logging for non-admin)
        await RefreshToken.deleteMany({ user: decoded.id, token: refreshToken });
    }


    // Clear cookies
    cookieStore.set("accessToken", "", {
      path: "/",
      maxAge: 0,
    });
    cookieStore.set("refreshToken", "", {
      path: "/api/auth/refresh", // must match how it was set
      maxAge: 0,
    });

    return NextResponse.json({ message: "Logged out successfully." }, { status: 200 });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}

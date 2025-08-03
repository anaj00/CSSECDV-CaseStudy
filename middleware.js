import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_ROUTES = ["/login", "/register", "/"];

// Define RBAC route access
const ROLE_PROTECTED_ROUTES = {
  '/admin': ['admin'],                  // only admin
  '/moderation': ['admin', 'moderator'] // admin + mod
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    const userRole = payload.role;

    // Match pathname to protected routes
    for (const [route, allowedRoles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }
    }

    return NextResponse.next();
  } catch (err) {
    console.error("JWT Error:", err);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/moderation/:path*',
    '/dashboard/:path*',
    '/api/:path*'
  ],
};

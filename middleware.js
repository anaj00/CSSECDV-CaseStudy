import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_ROUTES = ["/login", "/register", "/"]; // adjust as needed

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch (err) {
    console.error("JWT Error:", err);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Optionally: only apply to these routes
export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*"], // apply to APIs or pages
};

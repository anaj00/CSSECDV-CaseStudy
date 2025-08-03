import { NextResponse } from 'next/server';
import { authorize } from './src/lib/auth-middleware';

export async function middleware(request) {
  try {
    const authResult = await authorize(request);
    const { user, authorized, public: isPublic, reason } = authResult;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Allow public routes
    if (isPublic) return NextResponse.next();

    // If not authorized, respond appropriately
    if (!authorized) {
      if (pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ error: 'Access denied', details: reason }),
          {
            status: reason === 'Authentication required' ? 401 : 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access
    const role = user?.role || 'user';
    const isAdmin = role === 'admin';
    const isModerator = role === 'moderator';

    const restrictedRoutes = {
      '/admin': isAdmin,
      '/moderation': isAdmin || isModerator,
      '/dashboard': isAdmin,
    };

    for (const [route, allowed] of Object.entries(restrictedRoutes)) {
      if (pathname.startsWith(route) && !allowed) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', message: `Access to ${route} requires elevated role` }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Attach headers
    const response = NextResponse.next();
    response.headers.set('x-user-id', user._id.toString());
    response.headers.set('x-user-role', user.role);
    response.headers.set('x-user-username', user.username);

    return response;

  } catch (error) {
    console.error('Middleware error:', error);

    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/moderation/:path*',
    '/dashboard/:path*',
    '/api/:path*',
  ],
};

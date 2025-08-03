import { NextResponse } from 'next/server';
import { authorize } from './src/lib/auth-middleware';

export async function middleware(request) {
  try {
    const authResult = await authorize(request);
    
    if (authResult.public) {
      return NextResponse.next();
    }
    
    if (!authResult.authorized) {
      const url = new URL(request.url);
      
      if (url.pathname.startsWith('/api/')) {
        return new Response(
          JSON.stringify({ 
            error: 'Access denied',
            details: authResult.reason 
          }), 
          { 
            status: authResult.reason === 'Authentication required' ? 401 : 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', url.pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    const response = NextResponse.next();
    if (authResult.user) {
      response.headers.set('x-user-id', authResult.user._id.toString());
      response.headers.set('x-user-role', authResult.user.role);
      response.headers.set('x-user-username', authResult.user.username);
    }
    
    return response;
    
  } catch (error) {
    console.error('Middleware error:', error);
    
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ error: 'Internal server error' }), 
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
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

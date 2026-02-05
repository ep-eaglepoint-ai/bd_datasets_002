import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isDashboardPage = pathname.startsWith("/dashboard");
  const isApiTransaction = pathname.startsWith("/api/transactions");

  // Get session token from cookies
  const sessionToken = request.cookies.get("next-auth.session-token")?.value ||
                       request.cookies.get("__Secure-next-auth.session-token")?.value;

  // If user is not authenticated and trying to access protected routes
  if (!sessionToken && (isDashboardPage || isApiTransaction)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is authenticated and trying to access auth pages
  if (sessionToken && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/transactions/:path*"],
};

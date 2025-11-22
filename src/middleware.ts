import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const session = request.cookies.get("session");
    const isLoginPage = request.nextUrl.pathname === "/login";

    // If no session and trying to access protected route, redirect to login
    if (!session && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If session exists and trying to access login, redirect to dashboard
    if (session && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

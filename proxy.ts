import { localSessionCookieName } from "@/lib/auth/constants";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/protected") &&
    !request.cookies.has(localSessionCookieName)
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

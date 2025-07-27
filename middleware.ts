import { type NextRequest, NextResponse } from "next/server"
import { rateLimiter } from "./lib/rate-limiter"
import { logger } from "./lib/logger"

export function middleware(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const identifier = request.ip || "anonymous"

    if (!rateLimiter.isAllowed(identifier)) {
      logger.warn("Rate limit exceeded", { ip: identifier, path: request.nextUrl.pathname })
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }
  }

  // Security headers
  const response = NextResponse.next()

  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // HTTPS redirect in production
  if (process.env.NODE_ENV === "production" && request.headers.get("x-forwarded-proto") !== "https") {
    return NextResponse.redirect(`https://${request.headers.get("host")}${request.nextUrl.pathname}`)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

import { NextResponse } from "next/server"

export async function GET() {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        openai: !!process.env.OPENAI_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        serpapi: !!process.env.SERPAPI_KEY,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 },
    )
  }
}

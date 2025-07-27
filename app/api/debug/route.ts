import { NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

export async function GET() {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasOpenAIEnvKey: !!process.env.OPENAI_API_KEY,
      openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || "none",
    },
    versions: {
      node: process.version,
      // Add other relevant version info
    },
  }

  return NextResponse.json(debug)
}

export async function POST(request: Request) {
  try {
    const { testKey } = await request.json()

    if (!testKey) {
      return NextResponse.json({ error: "No test key provided" }, { status: 400 })
    }

    console.log("Testing key:", testKey.substring(0, 10))

    const result = await generateText({
      model: openai("gpt-4o", { apiKey: testKey }),
      prompt: "Hello, respond with exactly: 'Test successful'",
      maxTokens: 10,
    })

    return NextResponse.json({
      success: true,
      response: result.text,
      usage: result.usage,
    })
  } catch (error: any) {
    console.error("Debug test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          cause: error.cause,
          stack: error.stack?.split("\n").slice(0, 5), // First 5 lines only
        },
      },
      { status: 500 },
    )
  }
}

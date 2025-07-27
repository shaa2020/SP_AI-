import { type NextRequest, NextResponse } from "next/server"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json()

    console.log("Testing API keys:", {
      hasOpenAI: !!apiKeys?.openai,
      hasEnvOpenAI: !!process.env.OPENAI_API_KEY,
      openAILength: apiKeys?.openai?.length || 0,
    })

    const results = {
      openai: { status: "not_tested", message: "" },
      elevenlabs: { status: "not_tested", message: "" },
      serpapi: { status: "not_tested", message: "" },
    }

    // Test OpenAI with more detailed error handling
    const openaiKey = apiKeys?.openai || process.env.OPENAI_API_KEY

    if (openaiKey) {
      try {
        console.log("Testing OpenAI key:", openaiKey.substring(0, 15) + "...")

        // Create OpenAI instance with explicit API key
        const openaiInstance = openai("gpt-4o", {
          apiKey: openaiKey,
        })

        const { text } = await generateText({
          model: openaiInstance,
          prompt: "Say 'API test successful' in exactly those words.",
          maxTokens: 10,
        })

        console.log("OpenAI test response:", text)

        if (text.toLowerCase().includes("api test successful")) {
          results.openai = { status: "success", message: "OpenAI connection verified" }
        } else {
          results.openai = { status: "warning", message: `OpenAI responded: ${text}` }
        }
      } catch (error: any) {
        console.error("OpenAI test error:", error)

        let errorMessage = "Connection failed"
        if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
          errorMessage = "Invalid API key - check your key format"
        } else if (error.message?.includes("429")) {
          errorMessage = "Rate limit exceeded"
        } else if (error.message?.includes("quota")) {
          errorMessage = "Quota exceeded - check billing"
        } else if (error.message?.includes("model")) {
          errorMessage = "Model access issue - try gpt-3.5-turbo"
        } else if (error.message?.includes("missing")) {
          errorMessage = "API key not properly configured"
        }

        results.openai = {
          status: "error",
          message: `${errorMessage}: ${error.message?.substring(0, 100) || "Unknown error"}`,
        }
      }
    } else {
      results.openai = { status: "missing", message: "No API key provided in settings or environment" }
    }

    // Test ElevenLabs
    const elevenlabsKey = apiKeys?.elevenlabs || process.env.ELEVENLABS_API_KEY
    if (elevenlabsKey) {
      try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "xi-api-key": elevenlabsKey,
          },
        })

        if (response.ok) {
          results.elevenlabs = { status: "success", message: "ElevenLabs connection verified" }
        } else if (response.status === 401) {
          results.elevenlabs = { status: "error", message: "Invalid API key" }
        } else {
          results.elevenlabs = { status: "error", message: "Connection failed" }
        }
      } catch (error) {
        results.elevenlabs = { status: "error", message: "Network error" }
      }
    } else {
      results.elevenlabs = { status: "missing", message: "No API key provided" }
    }

    // Test SerpAPI (mock for now)
    const serpapiKey = apiKeys?.serpapi || process.env.SERPAPI_KEY
    if (serpapiKey) {
      results.serpapi = { status: "success", message: "SerpAPI key configured" }
    } else {
      results.serpapi = { status: "missing", message: "No API key provided" }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("API key test failed:", error)
    logger.error("API key test failed", error)
    return NextResponse.json(
      {
        error: "Failed to test API keys",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

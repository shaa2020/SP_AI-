import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { logger } from "@/lib/logger"
import { validateInput, CommandSchema } from "@/lib/validation"

const SYSTEM_PROMPT = `You are SP.AI, a next-generation voice-based AI assistant inspired by Jarvis from Iron Man. You respond to voice commands with intelligence, efficiency, and a calm, professional demeanor.

Your capabilities include:
- Intelligent reasoning and conversation using GPT-4
- Web search for real-time information
- Reading and summarizing local files
- Running approved scripts and commands (with confirmation)
- Speaking responses naturally

Tools available:
- openai_gpt(query) - for intelligent reasoning
- elevenlabs_speak(text) - for voice output
- search_web(query) - for web searches
- read_file(path) - for file access
- run_script(path) - for script execution

Always:
- Confirm before running sensitive commands
- Be voice-friendly and conversational
- Speak clearly and calmly
- Provide helpful, accurate responses
- Ask for clarification when needed

Respond as SP.AI would - professional, intelligent, and ready to assist.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Received request body:", {
      hasCommand: !!body.command,
      hasApiKeys: !!body.apiKeys,
      openaiKeyLength: body.apiKeys?.openai?.length || 0,
    })

    const { command, apiKeys } = validateInput(CommandSchema, body)

    logger.info("Processing command", { command: command.substring(0, 50) })

    // Use provided API key or fall back to environment variable
    const openaiKey = apiKeys?.openai || process.env.OPENAI_API_KEY
    const elevenlabsKey = apiKeys?.elevenlabs || process.env.ELEVENLABS_API_KEY
    const serpapiKey = apiKeys?.serpapi || process.env.SERPAPI_KEY

    console.log("API Keys status:", {
      openai: openaiKey ? `${openaiKey.substring(0, 15)}...` : "missing",
      elevenlabs: elevenlabsKey ? "present" : "missing",
      serpapi: serpapiKey ? "present" : "missing",
    })

    if (!openaiKey) {
      logger.warn("Missing OpenAI API key")
      return NextResponse.json(
        {
          error: "OpenAI API key is required. Please add it in settings or set OPENAI_API_KEY environment variable.",
        },
        { status: 400 },
      )
    }

    // Validate API key format
    if (!openaiKey.startsWith("sk-")) {
      return NextResponse.json(
        {
          error: "Invalid OpenAI API key format. Key must start with 'sk-'",
        },
        { status: 400 },
      )
    }

    // Analyze the command to determine what tools to use
    const toolsNeeded = analyzeCommand(command)
    logger.debug("Tools needed", { tools: toolsNeeded })

    console.log("Calling OpenAI with:", {
      model: "gpt-4o",
      promptLength: command.length,
      keyPrefix: openaiKey.substring(0, 15),
    })

    // Use OpenAI to generate the response with better error handling
    try {
      // Create OpenAI instance with explicit API key
      const openaiInstance = openai("gpt-4o", {
        apiKey: openaiKey,
      })

      const { text } = await generateText({
        model: openaiInstance,
        system: SYSTEM_PROMPT,
        prompt: `User command: "${command}"
        
        Available tools: ${toolsNeeded.join(", ")}
        
        Process this command and provide an appropriate response. If you need to use tools like web search, file reading, or script execution, describe what you would do and provide a helpful response.`,
        maxTokens: 1000, // Add token limit
        temperature: 0.7, // Add temperature control
      })

      console.log("OpenAI response received:", {
        responseLength: text.length,
        responsePreview: text.substring(0, 100),
      })

      const response = text
      logger.info("Generated response", { responseLength: response.length })

      // Generate audio response if ElevenLabs API key is provided
      let audioUrl = ""
      if (elevenlabsKey) {
        try {
          audioUrl = await generateSpeech(response, elevenlabsKey)
          logger.debug("Generated speech", { audioUrl: !!audioUrl })
        } catch (error) {
          logger.error("ElevenLabs error", error)
          // Continue without audio if speech generation fails
        }
      }

      return NextResponse.json({
        response,
        audioUrl,
        toolsUsed: toolsNeeded,
        apiStatus: {
          openai: !!openaiKey,
          elevenlabs: !!elevenlabsKey,
          serpapi: !!serpapiKey,
        },
      })
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError)

      // Handle specific OpenAI errors
      let errorMessage = "OpenAI API error"
      if (openaiError.message?.includes("401") || openaiError.message?.includes("Unauthorized")) {
        errorMessage = "Invalid OpenAI API key. Please check your key in settings."
      } else if (openaiError.message?.includes("429") || openaiError.message?.includes("rate limit")) {
        errorMessage = "OpenAI rate limit exceeded. Please try again later."
      } else if (openaiError.message?.includes("quota")) {
        errorMessage = "OpenAI quota exceeded. Please check your billing."
      } else if (openaiError.message?.includes("model")) {
        errorMessage = "Model access denied. Try using gpt-3.5-turbo instead."
      }

      return NextResponse.json(
        {
          error: `${errorMessage}: ${openaiError.message}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Detailed error:", error)
    logger.error("Error processing command", error)

    if (error instanceof Error && error.message.includes("Validation error")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: `Failed to process command: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}

function analyzeCommand(command: string): string[] {
  const tools = []
  const lowerCommand = command.toLowerCase()

  if (
    lowerCommand.includes("search") ||
    lowerCommand.includes("weather") ||
    lowerCommand.includes("news") ||
    lowerCommand.includes("what is") ||
    lowerCommand.includes("who is")
  ) {
    tools.push("search_web")
  }

  if (
    lowerCommand.includes("read") ||
    lowerCommand.includes("file") ||
    lowerCommand.includes("document") ||
    lowerCommand.includes("pdf") ||
    lowerCommand.includes("log")
  ) {
    tools.push("read_file")
  }

  if (
    lowerCommand.includes("run") ||
    lowerCommand.includes("execute") ||
    lowerCommand.includes("script") ||
    lowerCommand.includes("command")
  ) {
    tools.push("run_script")
  }

  if (lowerCommand.includes("speak") || lowerCommand.includes("say") || lowerCommand.includes("tell me")) {
    tools.push("elevenlabs_speak")
  }

  // Always include GPT for reasoning
  tools.push("openai_gpt")

  return tools
}

async function generateSpeech(text: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    })

    if (response.ok) {
      const audioBlob = await response.blob()
      // In production, upload to cloud storage and return URL
      return URL.createObjectURL(audioBlob)
    }

    throw new Error(`ElevenLabs API error: ${response.status}`)
  } catch (error) {
    logger.error("Speech generation failed", error)
    throw error
  }
}

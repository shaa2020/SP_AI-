"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Volume2, Settings, Brain, Eye, Cpu } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
  audioUrl?: string
}

interface ApiKeys {
  openai: string
  elevenlabs: string
  serpapi: string
}

export default function SPAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: "",
    elevenlabs: "",
    serpapi: "",
  })
  const [showSettings, setShowSettings] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [audioLevel, setAudioLevel] = useState(0)
  const [isActive, setIsActive] = useState(false)

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>([])
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem("sp-ai-api-keys")
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys)
        setApiKeys((prev) => ({ ...prev, ...parsedKeys }))
        console.log("Loaded API keys from localStorage:", {
          hasOpenAI: !!parsedKeys.openai,
          hasElevenLabs: !!parsedKeys.elevenlabs,
          hasSerpAPI: !!parsedKeys.serpapi,
        })
      } catch (error) {
        console.error("Failed to load saved API keys:", error)
      }
    }

    // Show settings if no OpenAI key is configured
    if (!savedKeys || !JSON.parse(savedKeys || "{}").openai) {
      setShowSettings(true)
      toast({
        title: "⚙️ Configuration Required",
        description: "Please add your OpenAI API key in settings to activate SP.AI",
      })
    }
  }, [])

  // Save API keys to localStorage when they change
  useEffect(() => {
    if (apiKeys.openai || apiKeys.elevenlabs || apiKeys.serpapi) {
      localStorage.setItem("sp-ai-api-keys", JSON.stringify(apiKeys))
      console.log("Saved API keys to localStorage")
    }
  }, [apiKeys])

  // Auto-disconnect after 10 minutes of inactivity
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    inactivityTimerRef.current = setTimeout(
      () => {
        setIsActive(false)
        setIsListening(false)
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop()
          } catch (error) {
            console.log("Error stopping recognition:", error)
          }
        }
        toast({
          title: "🌙 SP.AI Hibernating",
          description: "Neural interface entering sleep mode due to inactivity",
        })
      },
      10 * 60 * 1000,
    ) // 10 minutes
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"
      recognitionRef.current.maxAlternatives = 1

      let reconnectAttempts = 0
      const maxReconnectAttempts = 3
      let reconnectTimeout: NodeJS.Timeout | null = null
      let isRecognitionActive = false
      let lastSpeechTime = 0
      let isWakeWordDetected = false
      let isManualStop = false

      const startRecognition = () => {
        if (recognitionRef.current && !isRecognitionActive) {
          try {
            isManualStop = false
            recognitionRef.current.start()
            console.log("Starting speech recognition...")
          } catch (error) {
            console.log("Failed to start recognition:", error)
            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts++
              setTimeout(startRecognition, 2000)
            }
          }
        }
      }

      const stopRecognition = () => {
        if (recognitionRef.current && isRecognitionActive) {
          try {
            isManualStop = true
            recognitionRef.current.stop()
            console.log("Stopping speech recognition...")
          } catch (error) {
            console.log("Error stopping recognition:", error)
          }
        }
      }

      recognitionRef.current.onstart = () => {
        console.log("Speech recognition started")
        isRecognitionActive = true
        reconnectAttempts = 0
        setIsListening(true)
      }

      recognitionRef.current.onresult = (event: any) => {
        let transcript = ""
        let isFinal = false
        let confidence = 0

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          transcript += result[0].transcript
          confidence = result[0].confidence
          if (result.isFinal) {
            isFinal = true
          }
        }

        setCurrentTranscript(transcript)
        lastSpeechTime = Date.now()
        setAudioLevel(Math.random() * 100)

        // Check for wake word "SP"
        const lowerTranscript = transcript.toLowerCase()
        if (
          lowerTranscript.includes(" sp ") ||
          lowerTranscript.startsWith("sp ") ||
          lowerTranscript.endsWith(" sp") ||
          lowerTranscript === "sp"
        ) {
          if (!isActive) {
            setIsActive(true)
            isWakeWordDetected = true
            toast({
              title: "🧠 SP.AI Activated",
              description: "Neural interface online - I'm listening",
            })
            resetInactivityTimer()
          }
        }

        // Process commands only if active
        if (isActive || isWakeWordDetected) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          if (transcript.trim() && transcript.trim().length > 1) {
            silenceTimerRef.current = setTimeout(() => {
              if (Date.now() - lastSpeechTime >= 2000 && transcript.trim().length > 2) {
                // Remove wake word from command
                let cleanCommand = transcript.trim()
                if (isWakeWordDetected) {
                  cleanCommand = cleanCommand.replace(/\bsp\b/gi, "").trim()
                  isWakeWordDetected = false
                }

                if (cleanCommand) {
                  handleVoiceCommand(cleanCommand)
                  resetInactivityTimer()
                }
                setCurrentTranscript("")
              }
            }, 2000)
          }

          if (isFinal && transcript.trim().length > 2 && confidence > 0.7) {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current)
              silenceTimerRef.current = null
            }

            let cleanCommand = transcript.trim()
            if (isWakeWordDetected) {
              cleanCommand = cleanCommand.replace(/\bsp\b/gi, "").trim()
              isWakeWordDetected = false
            }

            if (cleanCommand) {
              handleVoiceCommand(cleanCommand)
              resetInactivityTimer()
            }
            setCurrentTranscript("")
          }
        }
      }

      recognitionRef.current.onend = () => {
        console.log("Speech recognition ended")
        isRecognitionActive = false
        setAudioLevel(0)

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout)
          reconnectTimeout = null
        }

        // Only restart if not manually stopped and within retry limits
        if (!isManualStop && reconnectAttempts < maxReconnectAttempts) {
          reconnectTimeout = setTimeout(() => {
            if (!isRecognitionActive) {
              startRecognition()
            }
          }, 1000)
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setIsListening(false)
          toast({
            title: "🔴 Speech Recognition Offline",
            description: "Click to restart neural interface",
            action: (
              <button
                onClick={() => {
                  reconnectAttempts = 0
                  startRecognition()
                }}
                className="px-3 py-1 bg-cyan-600 text-white rounded text-sm"
              >
                Restart
              </button>
            ),
          })
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.log("Speech recognition error:", event.error)
        isRecognitionActive = false
        setAudioLevel(0)

        switch (event.error) {
          case "not-allowed":
            toast({
              title: "🎤 Microphone Access Required",
              description: "Grant microphone access to activate neural interface",
            })
            setIsListening(false)
            return

          case "no-speech":
            console.log("No speech detected, continuing...")
            break

          case "aborted":
            console.log("Speech recognition aborted")
            if (!isManualStop) {
              reconnectAttempts++
            }
            break

          case "network":
            console.log("Network error in speech recognition")
            reconnectAttempts++
            toast({
              title: "🌐 Network Error",
              description: "Check your internet connection",
            })
            break

          case "service-not-allowed":
            toast({
              title: "🚫 Speech Service Blocked",
              description: "Speech recognition service is not available",
            })
            setIsListening(false)
            return

          default:
            console.log("Unknown speech recognition error:", event.error)
            reconnectAttempts++
        }

        // Stop current recognition if it's still active
        if (recognitionRef.current && isRecognitionActive) {
          try {
            recognitionRef.current.stop()
          } catch (stopError) {
            console.log("Error stopping recognition:", stopError)
          }
        }
      }

      // Start recognition with better error handling
      const initializeRecognition = () => {
        try {
          startRecognition()
          toast({
            title: "🌟 SP.AI Initialized",
            description: "Say 'SP' to activate neural interface",
          })
        } catch (error) {
          console.error("Failed to initialize recognition:", error)
          toast({
            title: "❌ Initialization Failed",
            description: "Speech recognition could not be started",
          })
        }
      }

      // Initialize with a small delay to ensure DOM is ready
      setTimeout(initializeRecognition, 500)

      return () => {
        isManualStop = true
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
        }
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current)
        }
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout)
        }
        if (recognitionRef.current && isRecognitionActive) {
          try {
            recognitionRef.current.stop()
          } catch (error) {
            console.log("Error stopping recognition on cleanup:", error)
          }
        }
      }
    } else {
      // Fallback for browsers without speech recognition
      toast({
        title: "🚫 Speech Recognition Not Supported",
        description: "Please use Chrome or Edge for voice features",
      })
    }
  }, [isActive])

  const handleVoiceCommand = async (transcript: string) => {
    if (!transcript.trim() || isProcessing) return

    // Check if OpenAI key is available
    if (!apiKeys.openai) {
      toast({
        title: "⚙️ Configuration Required",
        description: "Please add your OpenAI API key in settings",
      })
      setShowSettings(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: transcript,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsProcessing(true)

    try {
      console.log("Sending command to API:", {
        transcript,
        hasOpenAIKey: !!apiKeys.openai,
        keyLength: apiKeys.openai?.length || 0,
        keyPrefix: apiKeys.openai?.substring(0, 15) || "none",
      })

      const response = await fetch("/api/process-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: transcript,
          apiKeys: {
            openai: apiKeys.openai,
            elevenlabs: apiKeys.elevenlabs,
            serpapi: apiKeys.serpapi,
          },
        }),
      })

      console.log("API response status:", response.status)
      const data = await response.json()
      console.log("API response data:", data)

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date(),
        audioUrl: data.audioUrl,
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.audioUrl) {
        playAudioResponse(data.audioUrl)
      }
    } catch (error) {
      console.error("Error processing command:", error)

      // Add error message to chat
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "assistant",
        content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])

      toast({
        title: "🚫 Command Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const playAudioResponse = (audioUrl: string) => {
    setIsSpeaking(true)
    const audio = new Audio(audioUrl)
    audio.onended = () => setIsSpeaking(false)
    audio.onerror = () => setIsSpeaking(false)
    audio.play()
  }

  const handleTextCommand = () => {
    if (currentTranscript.trim()) {
      setIsActive(true)
      handleVoiceCommand(currentTranscript)
      setCurrentTranscript("")
      resetInactivityTimer()
    }
  }

  const testApiKeys = async () => {
    setIsProcessing(true)
    try {
      console.log("Testing API keys:", {
        hasOpenAI: !!apiKeys.openai,
        hasElevenLabs: !!apiKeys.elevenlabs,
        hasSerpAPI: !!apiKeys.serpapi,
      })

      const response = await fetch("/api/test-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKeys: {
            openai: apiKeys.openai,
            elevenlabs: apiKeys.elevenlabs,
            serpapi: apiKeys.serpapi,
          },
        }),
      })

      const data = await response.json()
      console.log("Test results:", data)

      // Show results for each API
      Object.entries(data.results).forEach(([api, result]: [string, any]) => {
        const statusEmoji =
          {
            success: "✅",
            warning: "⚠️",
            error: "❌",
            missing: "⭕",
            not_tested: "⏸️",
          }[result.status] || "❓"

        toast({
          title: `${statusEmoji} ${api.toUpperCase()} Test`,
          description: result.message,
        })
      })
    } catch (error) {
      console.error("Test failed:", error)
      toast({
        title: "❌ Test Failed",
        description: "Could not test API keys",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div
          className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(120,119,198,0.1)_60deg,transparent_120deg)] animate-spin"
          style={{ animationDuration: "20s" }}
        />
      </div>

      {/* Neural Network Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <div
              key={i}
              className="border border-cyan-500/10 relative"
              style={{
                animationDelay: `${i * 0.1}s`,
              }}
            >
              {Math.random() > 0.95 && <div className="absolute inset-0 bg-cyan-400/20 animate-pulse" />}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 container mx-auto p-6 max-w-7xl">
        {/* Futuristic Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            {/* AI Core Visualization */}
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-1 ${isActive ? "animate-pulse" : "opacity-50"}`}
              >
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center relative overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-spin"
                    style={{ animationDuration: "3s" }}
                  />
                  <div className={`text-2xl font-bold z-10 ${isActive ? "text-cyan-400" : "text-cyan-400/50"}`}>SP</div>
                  {/* Neural Activity Rings */}
                  {isActive && (
                    <>
                      <div className="absolute inset-2 border border-cyan-400/30 rounded-full animate-ping" />
                      <div
                        className="absolute inset-4 border border-purple-400/30 rounded-full animate-ping"
                        style={{ animationDelay: "0.5s" }}
                      />
                    </>
                  )}
                </div>
              </div>
              {/* Audio Level Indicator */}
              {isListening && isActive && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(4, (audioLevel / 100) * 20 + Math.random() * 10)}px`,
                          opacity: audioLevel > i * 20 ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                SP.AI NEURAL INTERFACE
              </h1>
              <p className="text-cyan-300/70 text-sm font-mono">
                {isActive ? "NEURAL LINK ACTIVE" : "STANDBY MODE"} • SAY 'SP' TO ACTIVATE •{" "}
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            className="border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-400/10 text-cyan-400"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Holographic Settings Panel */}
        {showSettings && (
          <Card className="mb-8 bg-black/80 border border-cyan-500/30 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 rounded-lg" />
            <CardContent className="relative z-10 p-6 space-y-4">
              <h3 className="text-xl font-bold text-cyan-400 mb-4">NEURAL CONFIGURATION</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-cyan-300">
                    OpenAI Neural Core {apiKeys.openai && <span className="text-green-400">✓</span>}
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-proj-..."
                    value={apiKeys.openai}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, openai: e.target.value }))}
                    className="bg-black/50 border-cyan-500/30 text-cyan-100 focus:border-cyan-400"
                  />
                  <p className="text-xs text-cyan-400/70 mt-1">Required for AI processing</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-cyan-300">
                    Voice Synthesis Matrix {apiKeys.elevenlabs && <span className="text-green-400">✓</span>}
                  </label>
                  <Input
                    type="password"
                    placeholder="ElevenLabs API Key"
                    value={apiKeys.elevenlabs}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, elevenlabs: e.target.value }))}
                    className="bg-black/50 border-cyan-500/30 text-cyan-100 focus:border-cyan-400"
                  />
                  <p className="text-xs text-cyan-400/70 mt-1">Optional for voice responses</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-cyan-300">
                    Search Protocol {apiKeys.serpapi && <span className="text-green-400">✓</span>}
                  </label>
                  <Input
                    type="password"
                    placeholder="SerpAPI Key"
                    value={apiKeys.serpapi}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, serpapi: e.target.value }))}
                    className="bg-black/50 border-cyan-500/30 text-cyan-100 focus:border-cyan-400"
                  />
                  <p className="text-xs text-cyan-400/70 mt-1">Optional for web search</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="flex space-x-3">
                  <Button
                    onClick={testApiKeys}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
                  >
                    {isProcessing ? "Testing..." : "🧪 Test Keys"}
                  </Button>

                  <Button
                    onClick={() => {
                      setApiKeys({ openai: "", elevenlabs: "", serpapi: "" })
                      localStorage.removeItem("sp-ai-api-keys")
                      toast({
                        title: "🔄 Neural Configuration Reset",
                        description: "All API keys have been cleared",
                      })
                    }}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Clear All
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    toast({
                      title: "💾 Neural Configuration Saved",
                      description: "API keys stored in secure local storage",
                    })
                    setShowSettings(false)
                  }}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                >
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Status Panel */}
          <div className="xl:col-span-1">
            <Card className="bg-black/60 border border-cyan-500/30 backdrop-blur-xl mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg" />
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Brain className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-lg font-bold text-cyan-400">NEURAL STATUS</h3>
                </div>

                {/* Status Display */}
                <div className="space-y-4">
                  {/* Manual Input */}
                  <div className="space-y-3">
                    <Input
                      value={currentTranscript}
                      onChange={(e) => setCurrentTranscript(e.target.value)}
                      placeholder="Manual neural input..."
                      className="bg-black/50 border-cyan-500/30 text-cyan-100 focus:border-cyan-400 font-mono"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleTextCommand()
                        }
                      }}
                    />

                    {/* Manual Restart Button */}
                    {!isListening && (
                      <Button
                        onClick={() => {
                          if (recognitionRef.current) {
                            try {
                              recognitionRef.current.start()
                            } catch (error) {
                              console.log("Manual restart failed:", error)
                            }
                          }
                        }}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                      >
                        🎤 Restart Neural Interface
                      </Button>
                    )}
                  </div>

                  {/* Status Matrix */}
                  <div className="space-y-2">
                    {isActive && isListening && (
                      <Badge className="w-full justify-center bg-gradient-to-r from-green-600 to-emerald-600 animate-pulse">
                        <Eye className="h-3 w-3 mr-1" />
                        NEURAL LINK ACTIVE
                      </Badge>
                    )}
                    {!isActive && isListening && (
                      <Badge className="w-full justify-center bg-gradient-to-r from-yellow-600 to-orange-600">
                        <Brain className="h-3 w-3 mr-1" />
                        STANDBY - SAY 'SP'
                      </Badge>
                    )}
                    {!isListening && (
                      <Badge className="w-full justify-center bg-gradient-to-r from-red-600 to-red-700">
                        <Brain className="h-3 w-3 mr-1" />
                        NEURAL INTERFACE OFFLINE
                      </Badge>
                    )}
                    {isProcessing && (
                      <Badge className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
                        <Cpu className="h-3 w-3 mr-1" />
                        PROCESSING QUANTUM DATA
                      </Badge>
                    )}
                    {isSpeaking && (
                      <Badge className="w-full justify-center bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse">
                        <Volume2 className="h-3 w-3 mr-1" />
                        VOICE SYNTHESIS ACTIVE
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Neural Commands */}
            <Card className="bg-black/60 border border-purple-500/30 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg" />
              <CardContent className="relative z-10 p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4">QUICK PROTOCOLS</h3>
                <div className="space-y-2">
                  {[
                    { icon: "🌤️", text: "Weather Analysis", command: "What's the weather today?" },
                    { icon: "📊", text: "System Diagnostics", command: "Run system diagnostics" },
                    { icon: "📝", text: "Data Retrieval", command: "Read my latest notes" },
                  ].map((item, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      className="w-full justify-start text-left border border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-500/10"
                      onClick={() => setCurrentTranscript(item.command)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span className="text-purple-300">{item.text}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Holographic Chat Interface */}
          <div className="xl:col-span-4">
            <Card className="bg-black/40 border border-cyan-500/30 backdrop-blur-xl h-[700px] flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-lg" />
              <div className="relative z-10 p-6 border-b border-cyan-500/20">
                <h3 className="text-xl font-bold text-cyan-400">NEURAL CONVERSATION MATRIX</h3>
                <p className="text-cyan-300/70 text-sm font-mono">
                  {isActive ? "Quantum entangled communication active" : "Say 'SP' to initiate neural link"}
                </p>
              </div>
              <CardContent className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center text-cyan-300/70 mt-16">
                    <div className="relative mx-auto mb-8">
                      <div
                        className={`w-32 h-32 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-1 ${isActive ? "animate-pulse" : "opacity-50"}`}
                      >
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center relative overflow-hidden">
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-spin"
                            style={{ animationDuration: "3s" }}
                          />
                          <div className={`text-4xl font-bold z-10 ${isActive ? "text-cyan-400" : "text-cyan-400/50"}`}>
                            SP
                          </div>
                          {isActive && (
                            <>
                              <div className="absolute inset-4 border border-cyan-400/30 rounded-full animate-ping" />
                              <div
                                className="absolute inset-8 border border-purple-400/30 rounded-full animate-ping"
                                style={{ animationDelay: "0.5s" }}
                              />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                      {isActive ? "NEURAL INTERFACE ACTIVE" : "NEURAL INTERFACE STANDBY"}
                    </h2>
                    <p className="text-lg mb-6">
                      {isActive ? "Quantum consciousness ready for commands" : "Say 'SP' to activate neural link"}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm max-w-2xl mx-auto">
                      <div className="p-4 border border-cyan-500/20 rounded-lg bg-cyan-500/5">
                        <div className="text-cyan-400 font-bold mb-2">🗣️ WAKE COMMAND</div>
                        <p>Say "SP" to activate neural interface</p>
                      </div>
                      <div className="p-4 border border-purple-500/20 rounded-lg bg-purple-500/5">
                        <div className="text-purple-400 font-bold mb-2">⏰ AUTO-SLEEP</div>
                        <p>Hibernates after 10 minutes of inactivity</p>
                      </div>
                      <div className="p-4 border border-blue-500/20 rounded-lg bg-blue-500/5">
                        <div className="text-blue-400 font-bold mb-2">🧠 NEURAL PROCESSING</div>
                        <p>Advanced AI reasoning with quantum consciousness</p>
                      </div>
                      <div className="p-4 border border-green-500/20 rounded-lg bg-green-500/5">
                        <div className="text-green-400 font-bold mb-2">🎤 VOICE SYNTHESIS</div>
                        <p>Real-time speech processing and generation</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom duration-500`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-2xl relative ${
                          message.type === "user"
                            ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-500/50"
                            : "bg-gradient-to-r from-purple-900/50 to-blue-900/50 text-cyan-100 border border-purple-500/30 backdrop-blur-sm"
                        }`}
                      >
                        {message.type === "assistant" && (
                          <div className="absolute -left-2 top-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center text-xs font-bold">
                              SP
                            </div>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                        <div className="flex items-center justify-between mt-3 text-xs opacity-70">
                          <span className="font-mono">{message.timestamp.toLocaleTimeString()}</span>
                          {message.audioUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => playAudioResponse(message.audioUrl!)}
                              className="h-6 px-2 hover:bg-white/10"
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

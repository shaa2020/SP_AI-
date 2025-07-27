interface LogLevel {
  ERROR: 0
  WARN: 1
  INFO: 2
  DEBUG: 3
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
}

class Logger {
  private level: number

  constructor() {
    this.level = process.env.NODE_ENV === "production" ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG
  }

  private log(level: keyof LogLevel, message: string, data?: any) {
    if (LOG_LEVELS[level] <= this.level) {
      const timestamp = new Date().toISOString()
      const logEntry = {
        timestamp,
        level,
        message,
        ...(data && { data }),
      }

      if (process.env.NODE_ENV === "production") {
        // In production, use structured logging
        console.log(JSON.stringify(logEntry))
      } else {
        // In development, use readable format
        console.log(`[${timestamp}] ${level}: ${message}`, data || "")
      }
    }
  }

  error(message: string, data?: any) {
    this.log("ERROR", message, data)
  }

  warn(message: string, data?: any) {
    this.log("WARN", message, data)
  }

  info(message: string, data?: any) {
    this.log("INFO", message, data)
  }

  debug(message: string, data?: any) {
    this.log("DEBUG", message, data)
  }
}

export const logger = new Logger()

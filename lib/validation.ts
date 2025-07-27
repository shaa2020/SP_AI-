import { z } from "zod"

export const CommandSchema = z.object({
  command: z.string().min(1, "Command cannot be empty").max(1000, "Command too long"),
  apiKeys: z.object({
    openai: z
      .string()
      .optional()
      .refine((val) => !val || val.startsWith("sk-"), "OpenAI API key must start with 'sk-'"),
    elevenlabs: z.string().optional(),
    serpapi: z.string().optional(),
  }),
})

export const FilePathSchema = z.object({
  filePath: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9._/-]+$/),
})

export const ScriptExecutionSchema = z.object({
  scriptPath: z.string().min(1).max(500),
  confirmed: z.boolean(),
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map((e) => e.message).join(", ")}`)
    }
    throw error
  }
}

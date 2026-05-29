import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system-prompt";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://agente-whatsapp.local",
    "X-Title": "Agente WhatsApp",
  },
});

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateReply(
  history: HistoryMessage[]
): Promise<string> {
  const model =
    process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    max_tokens: 512,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("El LLM devolvió una respuesta vacía");
  return text;
}

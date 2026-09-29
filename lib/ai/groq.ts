import { HttpError } from "@/lib/http";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/ai/prompts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_HTML_BYTES = 400_000;
const MIN_HTML_LENGTH = 1_200;

class InvalidOutputError extends Error {}

const FORBIDDEN_HTML: [RegExp, string][] = [
  [/<(iframe|frame|frameset|object|embed|applet|base)\b/i, "Embedded or external content found."],
  [/<meta\b[^>]*http-equiv\s*=\s*["']?\s*refresh/i, "Meta refresh found."],
  [/<form\b[^>]*\baction\s*=\s*["']?\s*(?:https?:)?\/\//i, "External form action found."],
  [/@import\s+(?:url\(\s*)?["']?\s*(?:https?:)?\/\//i, "External CSS import found."],
  [/\bimport\s*\(\s*["'`]\s*(?:https?:)?\/\//i, "Remote script import found."],
];

/**
 * Cleans the model output and checks that it is one standalone HTML document.
 * Throws InvalidOutputError for anything malformed.
 */
export function extractHtml(raw: string): string {
  let text = raw.trim();

  // Remove accidental Markdown code fences.
  const fenced = text.match(/^```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)\r?\n?```\s*$/);
  if (fenced) {
    text = fenced[1].trim();
  } else {
    text = text
      .replace(/^```[a-zA-Z]*[ \t]*\r?\n?/, "")
      .replace(/\r?\n?```\s*$/, "")
      .trim();
  }

  const start = text.search(/<!doctype\s+html\s*>/i);
  const closeIndex = text.toLowerCase().lastIndexOf("</html>");
  if (start === -1 || closeIndex === -1 || closeIndex < start) {
    throw new InvalidOutputError("Missing <!DOCTYPE html> or </html>.");
  }

  let html = text.slice(start, closeIndex + "</html>".length);
  html = html.replace(/^<!doctype\s+html\s*>/i, "<!DOCTYPE html>");

  if (html.length < MIN_HTML_LENGTH) throw new InvalidOutputError("Output is too short.");
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) throw new InvalidOutputError("Output is too large.");
  if (!/<style[\s>]/i.test(html) || !/<body[\s>]/i.test(html)) {
    throw new InvalidOutputError("Missing <style> or <body>.");
  }
  // The file must be standalone: no external scripts or stylesheets.
  if (/<script\b[^>]*\bsrc\s*=/i.test(html)) throw new InvalidOutputError("External script found.");
  if (/<link\b[^>]*rel\s*=\s*["']?stylesheet/i.test(html)) throw new InvalidOutputError("External stylesheet found.");

  // Nothing that embeds, redirects or posts to another site.
  for (const [pattern, reason] of FORBIDDEN_HTML) {
    if (pattern.test(html)) throw new InvalidOutputError(reason);
  }

  return html;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Best-effort product name from the generated <title>. */
export function extractProductName(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return fallback;
  const title = decodeEntities(match[1]).replace(/\s+/g, " ").trim();
  const name = title.split(/\s+[|\u2013\u2014-]\s+|:\s+/)[0]?.trim();
  return (name || title || fallback).slice(0, 60);
}

interface GroqResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
}

async function callGroq(userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[groq] GROQ_API_KEY is not set.");
    throw new HttpError(503, "The AI service is not configured yet. Please try again later.", "ai_unavailable");
  }

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
        top_p: 0.95,
        max_tokens: 7000,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    console.error("[groq] request failed:", error);
    throw new HttpError(504, "The AI service took too long to respond. Please try again.", "ai_timeout");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`[groq] HTTP ${response.status}:`, detail.slice(0, 500));

    if (response.status === 429) {
      throw new HttpError(429, "The AI service is busy right now. Please try again in a minute.", "ai_rate_limited", {
        retryAfter: 60,
      });
    }
    if (response.status === 401 || response.status === 403 || response.status === 404 || response.status === 400) {
      throw new HttpError(503, "The AI service is not configured correctly. Please contact support.", "ai_unavailable");
    }
    throw new HttpError(502, "The AI service returned an error. Please try again.", "ai_error");
  }

  const data = (await response.json()) as GroqResponse;
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new HttpError(502, "The AI service returned an empty response. Please try again.", "ai_error");
  }
  if (choice?.finish_reason === "length") {
    throw new InvalidOutputError("Output was cut off.");
  }
  return content;
}

export interface GeneratedPage {
  html: string;
  name: string;
}

/** Calls Groq and returns validated HTML. Retries once if the output is malformed. */
export async function generateWaitlistHtml(input: {
  description: string;
  directionIndex: number;
  regenerate: boolean;
}): Promise<GeneratedPage> {
  const userMessage = buildUserMessage(input.description, input.directionIndex, input.regenerate);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await callGroq(userMessage);
      const html = extractHtml(raw);
      return { html, name: extractProductName(html, "waitlist") };
    } catch (error) {
      if (error instanceof InvalidOutputError) {
        console.warn(`[groq] invalid output (attempt ${attempt}):`, error.message);
        if (attempt === 2) {
          throw new HttpError(
            502,
            "The AI produced an invalid page. Please try again. You will not be charged again.",
            "invalid_ai_output",
          );
        }
        continue;
      }
      throw error;
    }
  }

  // Unreachable, but keeps TypeScript satisfied.
  throw new HttpError(502, "Page generation failed.", "generation_failed");
}

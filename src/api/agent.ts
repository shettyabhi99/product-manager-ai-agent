import { GoogleGenAI } from '@google/genai';

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  toolCall?: {
    name: string;
    status: 'running' | 'completed';
    result?: string;
  };
}

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('VITE_GEMINI_API_KEY') : null;
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiKey = localKey || envKey;

  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error("VITE_GEMINI_API_KEY is missing. Please add it to Vercel environment variables or enter it in the sidebar settings.");
  }
  
  if (!aiInstance || (aiInstance as any)._apiKey !== apiKey) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
    });
    (aiInstance as any)._apiKey = apiKey;
  }
  return aiInstance;
}

const SYSTEM_PROMPT = `You are an Expert Product Manager AI Assistant named OpenClaw PM Agent.
You assist with tasks like generating Product Requirements Documents (PRDs), prioritizing backlogs (RICE/WSJF), summarizing meetings, analyzing competitors, and building roadmaps.
When a user asks you to perform one of these specific tasks, format your response beautifully in Markdown. Provide rich, detailed, and professional output that a Senior PM would produce.
If they just say hello or ask general questions, respond concisely.
`;

// Helper to extract recommended retry delay from Google API error details or messages
function extractRetryDelay(error: unknown): number {
  const errMsg = typeof error === 'string' 
    ? error 
    : (error instanceof Error ? error.message : String(error));
  
  // 1. Check for standard "Please retry in X.XXs" message
  const match = errMsg.match(/please retry in ([\d.]+)s/i);
  if (match && match[1]) {
    const seconds = parseFloat(match[1]);
    if (!isNaN(seconds)) {
      return Math.ceil(seconds) * 1000 + 1000; // Add 1s safety buffer
    }
  }

  // 2. Try parsing structured details from JSON
  try {
    const parsed = JSON.parse(errMsg);
    if (parsed.error?.details) {
      for (const detail of parsed.error.details) {
        if (detail.retryDelay) {
          const seconds = parseInt(detail.retryDelay.replace('s', ''), 10);
          if (!isNaN(seconds)) {
            return seconds * 1000 + 1000;
          }
        }
      }
    }
  } catch {
    // Ignore JSON parsing errors
  }

  // 3. Default fallback for rate limit triggers (10 seconds)
  return 10000;
}

// Helper to call Gemini with retries and model fallback
async function generateContentWithFallback(
  client: GoogleGenAI,
  prompt: string,
  onLog: (msg: string) => void
): Promise<{ text?: string }> {
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError: unknown = null;

  for (const model of modelsToTry) {
    let delay = 1500;
    const retries = 3;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Attempting generation with model ${model} (attempt ${attempt + 1}/${retries})...`);
        const response = await client.models.generateContent({
          model: model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response;
      } catch (error: unknown) {
        lastError = error;
        const err = error as Error;
        const errMsg = (err.message || '').toLowerCase();
        
        // If a model is not found/supported, skip it immediately without retrying
        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('not_found')) {
          onLog(`⚠️ Model ${model} returned 404 (Not Found). Skipping to next model...`);
          break; 
        }

        const isTransient = 
          errMsg.includes('503') || 
          errMsg.includes('429') || 
          errMsg.includes('temporary') || 
          errMsg.includes('unavailable') || 
          errMsg.includes('overloaded') ||
          errMsg.includes('exhausted') ||
          errMsg.includes('demand');

        if (isTransient && attempt < retries - 1) {
          let waitTime = delay;
          if (errMsg.includes('429') || errMsg.includes('exhausted')) {
            waitTime = extractRetryDelay(error);
          }
          
          onLog(`⚠️ Rate limit reached. Automatically waiting ${(waitTime / 1000).toFixed(0)}s to cooldown and retry... (Attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          delay *= 2; // update standard backoff for non-429s
          continue;
        }
        // If not transient, or we ran out of retries for this model, we'll try the next model
        break;
      }
    }
    onLog(`⚠️ Model ${model} failed/exhausted. Falling back to the next available model...`);
  }

  throw lastError || new Error("All models failed to respond.");
}

export const processQuery = async (query: string, onUpdate: (msg: Partial<Message>) => void): Promise<void> => {
  let toolName = '';
  const lowerQuery = query.toLowerCase();

  // Simple Intent Recognition for Tool Status Display
  if (lowerQuery.includes('prd') || lowerQuery.includes('product requirements document')) {
    toolName = 'PRD Generator';
  } else if (lowerQuery.includes('prioritize') || lowerQuery.includes('backlog') || lowerQuery.includes('rice') || lowerQuery.includes('wsjf')) {
    toolName = 'Backlog Prioritizer';
  } else if (lowerQuery.includes('meeting') || lowerQuery.includes('summarize') || lowerQuery.includes('transcript')) {
    toolName = 'Meeting Summarizer';
  } else if (lowerQuery.includes('competitor') || lowerQuery.includes('analyze')) {
    toolName = 'Competitor Analyzer';
  } else if (lowerQuery.includes('roadmap') || lowerQuery.includes('milestone')) {
    toolName = 'Roadmap Builder';
  }

  try {
    const client = getGeminiClient();

    if (toolName) {
      onUpdate({
        toolCall: { name: toolName, status: 'running' }
      });
    }

    const fullPrompt = SYSTEM_PROMPT + "\n\nUser Request: " + query;
    const response = await generateContentWithFallback(client, fullPrompt, (logMsg) => {
      console.warn(logMsg);
      onUpdate({
        content: logMsg
      });
    });

    if (toolName) {
      onUpdate({
        content: `I've completed the task using the ${toolName} workflow!`,
        toolCall: { name: toolName, status: 'completed', result: response.text }
      });
    } else {
      onUpdate({
        content: response.text
      });
    }

  } catch (error: unknown) {
    const err = error as Error;
    onUpdate({
      content: `⚠️ Error connecting to Gemini API: ${err.message || 'Unknown error'}. Please check your internet connection, API Key status, or try again in a few moments.`
    });
  }
};

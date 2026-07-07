/**
 * LLM API Client — Real streaming with exponential backoff
 * 
 * No rate limit spam, no simulating. Just real API calls.
 */
export interface LlmConfig {
  model: string;
  baseUrl?: string;
  apiKey?: string;
  maxTokens?: number;
  /** AbortSignal to cancel an in-flight stream (end-to-end cancellation). */
  signal?: AbortSignal;
}

export interface LlmChunk {
  type: 'thinking' | 'text' | 'error' | 'done';
  content: string;
}

// Config-driven provider: DROID_LLM_* env vars take precedence, with safe
// fallback to the original z.ai defaults so the POC still runs out-of-the-box.
const DEFAULT_CONFIG: LlmConfig = {
  model: process.env.DROID_LLM_MODEL || process.env.LLM_MODEL || 'deepseek-v4-flash-free',
  baseUrl:
    process.env.DROID_LLM_ENDPOINT ||
    process.env.LLM_API_URL ||
    'https://api.z.ai/v1/chat/completions',
  apiKey: process.env.DROID_LLM_API_KEY || process.env.LLM_API_KEY || '',
  maxTokens: parseInt(process.env.DROID_LLM_MAX_TOKENS || process.env.LLM_MAX_TOKENS || '4096'),
};

/**
 * Stream tokens from an OpenAI-compatible LLM API.
 * Uses exponential backoff on 429/5xx errors.
 * Returns an async generator of LlmChunk.
 */
export async function* streamLlm(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
  config: Partial<LlmConfig> = {}
): AsyncGenerator<LlmChunk> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const maxRetries = 3;
  let attempt = 0;

  // Fail fast if no API key configured — don't retry
  if (!cfg.apiKey && !process.env.LLM_API_KEY) {
    yield { type: 'error', content: 'No API key configured. Set LLM_API_KEY environment variable.' };
    return;
  }

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(cfg.baseUrl!, {
        method: 'POST',
        signal: cfg.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(cfg.apiKey ? { 'Authorization': `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          max_tokens: cfg.maxTokens,
          stream: true,
        }),
      });

      // Handle rate limits with backoff
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '30', 10);
        const waitMs = Math.min((retryAfter || 30) * 1000 * Math.pow(2, attempt), 120_000);
        attempt++;
        if (attempt > maxRetries) {
          yield { type: 'error', content: `Rate limited after ${maxRetries} retries. Try again later.` };
          return;
        }
        yield { type: 'thinking', content: `[Rate limit hit, retrying in ${(waitMs/1000).toFixed(0)}s...]` };
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Stream the response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (cfg.signal?.aborted) {
          yield { type: 'done', content: '' };
          return;
        }
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { type: 'done', content: '' };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.reasoning_content) {
              yield { type: 'thinking', content: delta.reasoning_content };
            }
            if (delta?.content) {
              yield { type: 'text', content: delta.content };
            }
          } catch {
            // Skip parse errors on partial lines
          }
        }
      }
      
      yield { type: 'done', content: '' };
      return;

    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        yield { type: 'error', content: `Failed after ${maxRetries} retries: ${(err as Error).message}` };
        return;
      }
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 30_000);
      yield { type: 'thinking', content: `[Error: ${(err as Error).message}, retrying in ${(waitMs/1000).toFixed(0)}s...]` };
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
}

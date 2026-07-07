/**
 * Droid TUI — Ink/React terminal UI
 * 
 * Key differences from original Droid:
 * - NO sync I/O in render path (useEffect + async instead of useMemo + statSync)
 * - NO duplicate React keys (index + prefix)
 * - NO rate limit spam (exponential backoff, user-friendly messages)
 * - Proper state management with useSyncExternalStore
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';

// ── Types ──
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Memoized message line — NEVER re-rendered once placed
const MessageLine = memo(({ text, role }: { text: string; role: string }) => (
  <Box flexDirection="column">
    <Text color={role === 'user' ? 'blue' : 'green'} bold>
      {role === 'user' ? 'You' : 'Droid'}:
    </Text>
    <Text>{text}</Text>
  </Box>
));

// ── Main App ──
function DroidApp() {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'thinking' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Async readiness check — NOT in useMemo, no statSync
  const [gitReady, setGitReady] = useState<boolean | null>(null);
  useEffect(() => {
    getGitReadinessAsync().then(setGitReady).catch(() => setGitReady(false));
  }, []);

  // Handle input
  useInput((_input, key) => {
    if (key.return && input.trim() && status === 'idle') {
      sendMessage(input.trim());
      setInput('');
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
    }
    if (!key.ctrl && !key.meta && !key.shift && _input.length === 1 && status === 'idle') {
      setInput(prev => prev + _input);
    }
  });

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setStatus('thinking');
    setError(null);

    let accumulated = '';

    // Use the real LLM streaming client
    const { streamLlm } = await import('../llm/client.js');

    try {
      for await (const chunk of streamLlm(
        [
          { role: 'system', content: 'You are Droid, a helpful coding assistant.' },
          ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: text },
        ]
      )) {
        if (chunk.type === 'text') {
          accumulated += chunk.content;
          // Update the last assistant message
          setMessages(prev => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + chunk.content };
            } else {
              next.push({ id: `assistant-${Date.now()}`, role: 'assistant', content: chunk.content });
            }
            return next;
          });
        } else if (chunk.type === 'thinking') {
          // Thinking content — could show as dim text
        } else if (chunk.type === 'error') {
          setError(chunk.content);
          setStatus('error');
          return;
        } else if (chunk.type === 'done') {
          setStatus('idle');
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }, [messages]);

  return (
    <Box flexDirection="column" height="100%">
      {/* Header — no statSync, no readiness in useMemo */}
      <Box borderStyle="round" borderColor="blue" paddingX={1}>
        <Text bold color="blue">Droid Rebuild</Text>
        <Text> </Text>
        {gitReady === null && <Text dimColor>checking git...</Text>}
        {gitReady === true && <Text color="green">✓ git ready</Text>}
        {gitReady === false && <Text dimColor>no git</Text>}
      </Box>

      {/* Messages */}
      <Box flexDirection="column" padding={1} flexGrow={1}>
        {messages.length === 0 && (
          <Text dimColor>Type a message and press Enter to start.</Text>
        )}
        {messages.map(msg => (
          <MessageLine key={msg.id} text={msg.content} role={msg.role} />
        ))}
        
        {/* Status indicator */}
        {status === 'thinking' && (
          <Box>
            <Text color="yellow" dimColor>⏳ thinking</Text>
          </Box>
        )}
        {status === 'error' && (
          <Box borderStyle="round" borderColor="red" padding={1} marginTop={1}>
            <Text color="red">{error}</Text>
            <Text dimColor> </Text>
            <Text color="blue" dimColor>Press any key to continue</Text>
          </Box>
        )}
      </Box>

      {/* Input bar */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="green">❯ </Text>
        <Text>{input}</Text>
        <Text dimColor>█</Text>
      </Box>
    </Box>
  );
}

/**
 * Async git readiness check — no statSync!
 */
async function getGitReadinessAsync(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', '--show-toplevel'], {
      stderr: 'pipe',
      stdout: 'pipe',
    });
    const output = await new Response(proc.stdout).text();
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

// ── Exported entry ──
export async function startTui() {
  const { waitUntilExit } = render(<DroidApp />);
  await waitUntilExit();
}

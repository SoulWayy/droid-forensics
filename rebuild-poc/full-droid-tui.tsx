import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { TodoTracker } from './src/components/TodoTracker.js';
import { EnvSync } from './src/daemon/env-sync.js';
import { IntentRouter } from './src/daemon/intent-router.js';
import { Phase2Executor } from './src/daemon/phase2.js';

// --- 1. STATE MANAGEMENT ---
class AppState {
  public mode: 'tui' | 'headless' = 'tui';
  public tokens: number = 0;
  public totalCost: number = 0;
  public isGitReady: boolean = false;
  
  public permissions = {
    bypassMode: false,
    trustHomeDir: false,
  };
  
  public addTokens(count: number) {
    this.tokens += count;
    this.totalCost = this.tokens * 0.0001;
  }
}
const globalState = new AppState();

// --- 2. RESILIENT IPC MANAGER ---
class IpcManager {
  public onOutput?: (chunk: string) => void;
  public onStateChange?: (state: 'thinking' | 'tool_execution' | 'idle' | 'error') => void;
  public onToolProgress?: (toolName: string, status: string) => void;
  public onPermissionPrompt?: (msg: string) => void;
  
  public async simulateBackendResponse(prompt: string) {
    if (!globalState.permissions.trustHomeDir && prompt.includes('rm -rf')) {
      this.onPermissionPrompt?.("WARNING: Destructive motion anomaly detected. Trust directory? (y/N)");
      return;
    }

    this.onStateChange?.('tool_execution');
    
    // PHASE 0: Intent Router
    this.onToolProgress?.('IntentRouter (Phase 0)', 'Evaluating intent...');
    const intent = IntentRouter.evaluate(prompt);
    this.streamText(`\n[DAEMON] Phase 0 Gate: Intent classified as ${intent} MODE.\n\n`);
    
    const envSync = new EnvSync(process.cwd());
    const phase2 = new Phase2Executor(process.cwd(), (msg) => {
       const lines = msg.split('\n').filter(l => l.trim() !== '');
       lines.forEach(l => this.streamText(`[Phase 2] ${l}\n`));
    });

    (envSync as any).log = (msg: string) => {
       const lines = msg.split('\n').filter(l => l.trim() !== '');
       (envSync as any).logs.push(...lines);
       lines.forEach(l => this.streamText(`[Phase 1] ${l}\n`));
    };

    if (intent === 'IMPLEMENTATION') {
      this.onToolProgress?.('EnvSync (Phase 1)', 'Starting Environment Sync...');
      const result = await envSync.runPhase1();
      
      if (!result.success) {
        this.streamText(`\n[DAEMON] Phase 1 Environment Sync FAILED.\nError: ${result.error}\nCannot proceed to Implementation.\n\n`);
        this.onStateChange?.('thinking');
        return;
      }
      
      this.onToolProgress?.('Phase2Executor (Phase 2B)', 'Running Implementation Workflow...');
      await phase2.runImplementation(prompt, envSync);
    } else {
      this.onToolProgress?.('Phase2Executor (Phase 2A)', 'Running Diagnostic Workflow...');
      await phase2.runDiagnostic(prompt);
    }
    
    this.onStateChange?.('thinking');
    this.streamText(`\n[DAEMON] Awaiting next neural command...\n\n`);
  }

  private streamText(response: string) {
    this.onStateChange?.('thinking');
    let i = 0;
    const interval = setInterval(() => {
      if (i < response.length) {
        this.onOutput?.(response[i]);
        i++;
      } else {
        clearInterval(interval);
        this.onStateChange?.('idle');
      }
    }, 25);
  }
}
const ipc = new IpcManager();

// --- 3. DROID EXACT UI COMPONENTS ---

const Messages = ({ history, activeChunk }: { history: React.ReactNode[], activeChunk: string }) => (
  <Box flexDirection="column" width="100%">
    {history}
    {activeChunk && (
      <Box flexDirection="row">
        <Text>{activeChunk}</Text>
      </Box>
    )}
  </Box>
);

const SpinnerWithVerb = ({ isThinking }: { isThinking: boolean }) => {
  if (!isThinking) return null;
  return (
    <Box marginY={1}>
      <Text color="cyan">⠋</Text>
      <Text dimColor> Processing...</Text>
    </Box>
  );
};

const PromptInputModeIndicator = () => (
  <Box paddingRight={1}>
    <Text color="cyan">{'❯'}</Text>
  </Box>
);

const PromptInputFooter = () => (
  <Box flexDirection="row" justifyContent="space-between" width="100%">
    <Box>
      <Text dimColor>⌘ + C </Text><Text dimColor>Exit</Text>
    </Box>
  </Box>
);

const PromptInput = ({ onSubmit, disabled }: { onSubmit: (val: string) => void, disabled: boolean }) => {
  const [value, setValue] = useState('');
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box 
        flexDirection="row" 
        alignItems="flex-start" 
        justifyContent="flex-start" 
        borderColor="#555555" 
        borderStyle="round" 
        borderLeft={false} 
        borderRight={false} 
        borderBottom={true}
        width="100%"
      >
        <PromptInputModeIndicator />
        <Box flexGrow={1} flexShrink={1}>
          {disabled ? (
            <Text dimColor>Wait...</Text>
          ) : (
            <TextInput 
              value={value} 
              onChange={setValue} 
              onSubmit={(v) => { if (v.trim()) { onSubmit(v); setValue(''); } }} 
              placeholder="Ask Claude..." 
            />
          )}
        </Box>
      </Box>
      <PromptInputFooter />
    </Box>
  );
};

const FullscreenLayout = ({ scrollable, bottom }: { scrollable: React.ReactNode, bottom: React.ReactNode }) => (
  <Box flexDirection="column" height="100%" width="100%">
    <Box flexGrow={1} flexDirection="column">
      {scrollable}
    </Box>
    <Box flexDirection="column" flexShrink={0}>
      {bottom}
    </Box>
  </Box>
);

// --- 4. MAIN APP ---
const FullDroidApp = () => {
  const { exit } = useApp();
  const [history, setHistory] = useState<React.ReactNode[]>([]);
  const [activeChunk, setActiveChunk] = useState('');
  const [agentState, setAgentState] = useState<'idle' | 'thinking' | 'tool_execution' | 'error'>('idle');

  useEffect(() => {
    ipc.onOutput = (chunk) => {
      globalState.addTokens(1);
      setActiveChunk(prev => {
        const combined = prev + chunk;
        if (combined.includes('\n')) {
          const parts = combined.split('\n');
          const toFinalize = parts.slice(0, -1).join('\n');
          const remaining = parts[parts.length - 1];
          if (toFinalize) setHistory(h => [...h, <Text key={Date.now()}>{toFinalize}</Text>]);
          return remaining;
        }
        return combined;
      });
    };
    ipc.onStateChange = (state) => {
      setAgentState(state);
      if (state === 'idle') {
        setActiveChunk(prev => { 
          if (prev) setHistory(h => [...h, <Text key={Date.now()}>{prev}</Text>]); 
          return ''; 
        });
      }
    };
  }, []);

  useInput((input, key) => { if (input === 'c' && key.ctrl) exit(); });

  const handlePromptSubmit = (prompt: string) => {
    if (prompt.trim().toLowerCase() === 'exit') return exit();
    setHistory(h => [
      ...h, 
      <Box key={Date.now()} flexDirection="column" marginY={1}>
        <Text bold>You</Text>
        <Text>{prompt}</Text>
      </Box>
    ]);
    ipc.simulateBackendResponse(prompt);
  };

  return (
    <FullscreenLayout 
      scrollable={
        <>
          <TodoTracker />
          <Messages history={history} activeChunk={activeChunk} />
          <SpinnerWithVerb isThinking={agentState !== 'idle'} />
        </>
      }
      bottom={
        <Box flexDirection="column" width="100%">
          <PromptInput onSubmit={handlePromptSubmit} disabled={agentState !== 'idle'} />
        </Box>
      }
    />
  );
};

export function startFullDroidRebuild() {
  console.clear();
  render(<FullDroidApp />);
}

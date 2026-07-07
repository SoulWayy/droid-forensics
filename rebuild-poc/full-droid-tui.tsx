import React, { useState, useEffect, memo } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';

// ============================================================================
// FASE 6: 1-OP-1 DROID TUI REBUILD (STATE, MCP, TOOLS & PERMISSIONS)
// ============================================================================

// --- 1. STATE MANAGEMENT (Zustand/Store mock) ---
// Gebaseerd op de missende 'AppStateStore' & 'CostTracker'
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
    this.totalCost = this.tokens * 0.0001; // Mock pricing
  }
}
const globalState = new AppState();

// --- 2. RESILIENT IPC MANAGER ---
// Nu met Fallback handlers en Tool Use Loaders
class IpcManager {
  public onOutput?: (chunk: string) => void;
  public onStateChange?: (state: 'thinking' | 'tool_execution' | 'idle' | 'error') => void;
  public onToolProgress?: (toolName: string, status: string) => void;
  public onPermissionPrompt?: (msg: string) => void;
  
  public simulateBackendResponse(prompt: string) {
    // 1. Check permissions (Security Scanner hook)
    if (!globalState.permissions.trustHomeDir && prompt.includes('rm -rf')) {
      this.onPermissionPrompt?.("⚠️ WARNING: Dangerous command detected. Do you trust this directory? (y/N)");
      return;
    }

    this.onStateChange?.('thinking');
    
    setTimeout(() => {
      // 2. Simulate MCP Tool execution (MCP Scanner hook)
      if (prompt.includes('search') || prompt.includes('file')) {
        this.onStateChange?.('tool_execution');
        this.onToolProgress?.('GrepSearch (MCP)', 'Scanning filesystem...');
        
        setTimeout(() => {
          this.onToolProgress?.('GrepSearch (MCP)', 'Found 3 results.');
          this.streamText(`\nI found the files you asked for via the tool.\n`);
        }, 1500);
      } else {
        this.streamText(`Analyzing prompt: "${prompt}"...\n\n`);
      }
    }, 500);
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
    }, 20);
  }
}
const ipc = new IpcManager();

// --- 3. UI COMPONENTS ---

const Header = memo(({ cwd }: { cwd: string }) => {
  const [gitStatus, setGitStatus] = useState<'scanning' | 'ready' | 'none'>('scanning');
  
  useEffect(() => {
    const timer = setTimeout(() => { setGitStatus('ready'); globalState.isGitReady = true; }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box flexDirection="row" borderStyle="single" borderColor="blue" paddingX={1} gap={2}>
      <Text color="cyanBright" bold>🤖 DROID CORE v0.164.1 (Fase 6)</Text>
      <Text color="gray">|</Text>
      <Text color="white">{cwd}</Text>
      <Text color="gray">|</Text>
      <Text color={gitStatus === 'ready' ? "green" : "yellow"}>Git: {gitStatus === 'ready' ? '✓' : '...'}</Text>
    </Box>
  );
});

// Tool Use Component (MCP Scanner hook)
const ToolUseMessage = memo(({ tool, status }: { tool: string, status: string }) => (
  <Box paddingLeft={2} marginY={1} borderStyle="round" borderColor="magenta">
    <Text color="magenta">⚙️ [MCP Tool] {tool}: </Text>
    <Text color="gray">{status}</Text>
  </Box>
));

// Dialog Component (UI Component Scanner hook)
const TrustDialog = memo(({ message, onResolve }: { message: string, onResolve: (trusted: boolean) => void }) => {
  useInput((input) => {
    if (input.toLowerCase() === 'y') onResolve(true);
    else if (input.toLowerCase() === 'n') onResolve(false);
  });
  return (
    <Box marginY={1} padding={1} borderStyle="single" borderColor="red">
      <Text color="redBright" bold>{message}</Text>
    </Box>
  );
});

const ChatHistory = ({ history, activeChunk, activeTool }: { history: React.ReactNode[], activeChunk: string, activeTool: {name: string, status: string} | null }) => (
  <Box flexDirection="column" paddingY={1} paddingX={2} minHeight={10}>
    {history}
    {activeTool && <ToolUseMessage tool={activeTool.name} status={activeTool.status} />}
    {activeChunk && <Text color="yellow">{activeChunk}<Text color="white" dimColor> █</Text></Text>}
  </Box>
);

const StatusLine = memo(({ state, tokens, costs }: { state: string, tokens: number, costs: number }) => (
  <Box flexDirection="row" borderStyle="singleTop" borderColor="gray" gap={3}>
    <Text color="magentaBright" bold>Model: custom:GLM-5.2-0</Text>
    <Text color="yellow">Tokens: {tokens}</Text>
    <Text color={state === 'error' ? 'red' : state === 'tool_execution' ? 'magenta' : state === 'thinking' ? 'cyan' : 'green'}>
      State: {state.toUpperCase()}
    </Text>
    <Text color="green">Costs: ${costs.toFixed(4)}</Text>
  </Box>
));

const PromptInput = ({ onSubmit, disabled }: { onSubmit: (val: string) => void, disabled: boolean }) => {
  const [value, setValue] = useState('');
  return (
    <Box flexDirection="row" paddingX={1}>
      <Text color="greenBright" bold>❯ </Text>
      {disabled ? <Text dimColor>Even geduld...</Text> : (
        <TextInput value={value} onChange={setValue} onSubmit={(v) => { if (v.trim()) { onSubmit(v); setValue(''); } }} placeholder="Typ commando of 'search file' om MCP te testen..." />
      )}
    </Box>
  );
};

// --- 4. MAIN APP ---
const FullDroidApp = () => {
  const { exit } = useApp();
  const [history, setHistory] = useState<React.ReactNode[]>([<Text key="w">Welkom bij Droid Rebuild Fase 6.</Text>]);
  const [activeChunk, setActiveChunk] = useState('');
  const [activeTool, setActiveTool] = useState<{name: string, status: string} | null>(null);
  const [agentState, setAgentState] = useState<'idle' | 'thinking' | 'tool_execution' | 'error'>('idle');
  
  // Dialog State
  const [permissionPrompt, setPermissionPrompt] = useState<string | null>(null);

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
      if (state !== 'tool_execution') setActiveTool(null);
      if (state === 'idle') setActiveChunk(prev => { if (prev) setHistory(h => [...h, <Text key={Date.now()}>{prev}</Text>]); return ''; });
    };

    ipc.onToolProgress = (name, status) => setActiveTool({ name, status });
    ipc.onPermissionPrompt = (msg) => setPermissionPrompt(msg);
  }, []);

  useInput((input, key) => { if (input === 'q' && key.ctrl) exit(); });

  const handlePromptSubmit = (prompt: string) => {
    if (prompt.trim().toLowerCase() === 'exit') return exit();
    setHistory(h => [...h, <Text key={Date.now()+1}></Text>, <Text key={Date.now()+2} dimColor>You: {prompt}</Text>, <Text key={Date.now()+3}></Text>]);
    ipc.simulateBackendResponse(prompt);
  };

  return (
    <Box flexDirection="column" padding={1} width={80}>
      <Header cwd="/home/jan/Droid-onderzoek-triage" />
      <ChatHistory history={history} activeChunk={activeChunk} activeTool={activeTool} />
      
      {permissionPrompt && (
        <TrustDialog 
          message={permissionPrompt} 
          onResolve={(trusted) => {
            if (trusted) globalState.permissions.trustHomeDir = true;
            setPermissionPrompt(null);
          }} 
        />
      )}

      <Box flexDirection="column" marginTop={1}>
        <StatusLine state={agentState} tokens={globalState.tokens} costs={globalState.totalCost} />
        <PromptInput onSubmit={handlePromptSubmit} disabled={agentState !== 'idle' || permissionPrompt !== null} />
      </Box>
    </Box>
  );
};

export function startFullDroidRebuild() {
  console.clear();
  render(<FullDroidApp />);
}

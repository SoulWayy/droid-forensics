import React, { useState, useEffect, memo } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { TodoTracker } from './src/components/TodoTracker.js';
import { EnvSync } from './src/daemon/env-sync.js';

// ============================================================================
// FASE 6: 1-OP-1 DROID TUI REBUILD - CINEMATIC EDITION
// ============================================================================

// --- 1. STATE MANAGEMENT (Zustand/Store mock) ---
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
    this.onToolProgress?.('EnvSync (Phase 1)', 'Starting Environment Sync...');
    
    // We run the actual Phase 1 EnvSync logic here instead of a mock
    const envSync = new EnvSync(process.cwd());
    
    // Patch the logger so we stream to the TUI
    (envSync as any).log = (msg: string) => {
       const lines = msg.split('\n').filter(l => l.trim() !== '');
       (envSync as any).logs.push(...lines);
       lines.forEach(l => this.streamText(`[EnvSync] ${l}\n`));
    };

    const result = await envSync.runPhase1();
    
    this.onStateChange?.('thinking');
    if (result.success) {
      this.streamText(`\n[DAEMON] Phase 1 Environment Sync completed. System aligned.\nTranslating neural intent: "${prompt}"...\n\n`);
    } else {
      this.streamText(`\n[DAEMON] Phase 1 Environment Sync FAILED.\nError: ${result.error}\n\n`);
    }
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

// --- 3. MOTION & CINEMATIC HOOKS ---

// Simple frame looper for TUI animations
const useAnimationFrame = (fps = 15) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 1000 / fps);
    return () => clearInterval(timer);
  }, [fps]);
  return frame;
};

// Creates a pulsing color effect
const usePulse = (colorHex: string, active: boolean) => {
  const frame = useAnimationFrame(10);
  if (!active) return '#444444';
  const intensity = Math.abs(Math.sin(frame * 0.2));
  return intensity > 0.5 ? colorHex : '#666666';
};

// Scanner beam effect
const useScannerBeam = (width: number) => {
  const frame = useAnimationFrame(20);
  const pos = Math.abs((frame % (width * 2)) - width);
  let beam = Array(width).fill(' ');
  if (pos < width) beam[Math.floor(pos)] = '█';
  return beam.join('');
};

// --- 4. CINEMATIC UI COMPONENTS ---

const CinematicHeader = memo(({ cwd }: { cwd: string }) => {
  const [gitStatus, setGitStatus] = useState<'scanning' | 'ready' | 'none'>('scanning');
  const scannerBeam = useScannerBeam(20);
  
  useEffect(() => {
    const timer = setTimeout(() => { setGitStatus('ready'); globalState.isGitReady = true; }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#00ffff" paddingX={2} marginBottom={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="#00ffff" bold>✦ DROID CORE v0.164.1 [CINEMATIC_MODE] ✦</Text>
        <Text color="#ff00ff">[{scannerBeam}]</Text>
      </Box>
      <Box flexDirection="row">
        <Text color="#555555">DIR: </Text>
        <Text color="#ffffff">{cwd} </Text>
        <Text color="#555555"> | NET: </Text>
        <Text color={gitStatus === 'ready' ? "#00ff00" : "#ffff00"}>
          {gitStatus === 'ready' ? 'SYNCED' : 'ALIGNING...'}
        </Text>
      </Box>
    </Box>
  );
});

const NeuralToolUse = memo(({ tool, status }: { tool: string, status: string }) => {
  const frame = useAnimationFrame(10);
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'][frame % 10];
  return (
    <Box paddingLeft={2} marginY={1} borderStyle="round" borderColor="#ff00ff">
      <Text color="#ff00ff">{spinner} [MCP NODE: {tool}] </Text>
      <Text color="#aaaaaa">{status}</Text>
    </Box>
  );
});

const TrustDialog = memo(({ message, onResolve }: { message: string, onResolve: (trusted: boolean) => void }) => {
  const pulseColor = usePulse('#ff0000', true);
  useInput((input) => {
    if (input.toLowerCase() === 'y') onResolve(true);
    else if (input.toLowerCase() === 'n') onResolve(false);
  });
  return (
    <Box marginY={1} padding={1} borderStyle="single" borderColor={pulseColor}>
      <Text color={pulseColor} bold>⚠ {message}</Text>
    </Box>
  );
});

const CinematicHistory = ({ history, activeChunk, activeTool }: { history: React.ReactNode[], activeChunk: string, activeTool: {name: string, status: string} | null }) => (
  <Box flexDirection="column" paddingY={1} paddingX={2} minHeight={12} borderStyle="single" borderColor="#444444">
    {history}
    {activeTool && <NeuralToolUse tool={activeTool.name} status={activeTool.status} />}
    {activeChunk && <Text color="#00ffff">{activeChunk}<Text color="#00ffff" bold> █</Text></Text>}
  </Box>
);

const CinematicStatus = memo(({ state, tokens, costs }: { state: string, tokens: number, costs: number }) => {
  const stateColor = state === 'error' ? '#ff0000' : state === 'tool_execution' ? '#ff00ff' : state === 'thinking' ? '#00ffff' : '#00ff00';
  const pulseColor = usePulse(stateColor, state !== 'idle');
  
  return (
    <Box flexDirection="row" borderStyle="single" borderColor="#555555" justifyContent="space-between" paddingX={1}>
      <Box flexDirection="row">
        <Text color="#ff00ff" bold>⚙ custom:GLM-5.2-0 </Text>
        <Text color="#555555">│ </Text>
        <Text color="#ffff00">TOK: {tokens} </Text>
        <Text color="#555555">│ </Text>
        <Text color="#00ff00">CST: ${costs.toFixed(4)}</Text>
      </Box>
      <Box flexDirection="row">
        <Text color={pulseColor} bold> ● {state.toUpperCase()} </Text>
      </Box>
    </Box>
  );
});

const NeuralPrompt = ({ onSubmit, disabled }: { onSubmit: (val: string) => void, disabled: boolean }) => {
  const [value, setValue] = useState('');
  return (
    <Box flexDirection="row" paddingX={1} marginTop={1}>
      <Text color="#00ffff" bold>{'❯ '} </Text>
      {disabled ? <Text color="#555555">Awaiting neural alignment...</Text> : (
        <TextInput value={value} onChange={setValue} onSubmit={(v) => { if (v.trim()) { onSubmit(v); setValue(''); } }} placeholder="Enter neural command..." />
      )}
    </Box>
  );
};

// --- 5. MAIN APP ---
const FullDroidApp = () => {
  const { exit } = useApp();
  const [history, setHistory] = useState<React.ReactNode[]>([<Text key="w" color="#888888">System initialized. Droid Rebuild Fase 6 [Cinematic Edition] online.</Text>]);
  const [activeChunk, setActiveChunk] = useState('');
  const [activeTool, setActiveTool] = useState<{name: string, status: string} | null>(null);
  const [agentState, setAgentState] = useState<'idle' | 'thinking' | 'tool_execution' | 'error'>('idle');
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
          if (toFinalize) setHistory(h => [...h, <Text key={Date.now()} color="#eeeeee">{toFinalize}</Text>]);
          return remaining;
        }
        return combined;
      });
    };

    ipc.onStateChange = (state) => {
      setAgentState(state);
      if (state !== 'tool_execution') setActiveTool(null);
      if (state === 'idle') setActiveChunk(prev => { if (prev) setHistory(h => [...h, <Text key={Date.now()} color="#eeeeee">{prev}</Text>]); return ''; });
    };

    ipc.onToolProgress = (name, status) => setActiveTool({ name, status });
    ipc.onPermissionPrompt = (msg) => setPermissionPrompt(msg);
  }, []);

  useInput((input, key) => { if (input === 'q' && key.ctrl) exit(); });

  const handlePromptSubmit = (prompt: string) => {
    if (prompt.trim().toLowerCase() === 'exit') return exit();
    setHistory(h => [...h, <Text key={Date.now()+1}></Text>, <Text key={Date.now()+2} color="#888888">You: <Text color="#ffffff">{prompt}</Text></Text>, <Text key={Date.now()+3}></Text>]);
    ipc.simulateBackendResponse(prompt);
  };

  return (
    <Box flexDirection="column" padding={1} width={90}>
      <CinematicHeader cwd="/home/jan/Droid-onderzoek-triage" />
      <TodoTracker />
      <CinematicHistory history={history} activeChunk={activeChunk} activeTool={activeTool} />
      
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
        <CinematicStatus state={agentState} tokens={globalState.tokens} costs={globalState.totalCost} />
        <NeuralPrompt onSubmit={handlePromptSubmit} disabled={agentState !== 'idle' || permissionPrompt !== null} />
      </Box>
    </Box>
  );
};

export function startFullDroidRebuild() {
  console.clear();
  render(<FullDroidApp />);
}

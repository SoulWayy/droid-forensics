import React, { useState, useEffect, useMemo, memo } from 'react';
import { render, Box, Text } from 'ink';
import { EventEmitter } from 'events';

// ============================================================================
// FASE 3 & 4: FULL REBUILD - DROID TUI ENGINE
// Oplossing voor: Sync I/O, Duplicate Keys, setState-in-render, RPC Spam
// ============================================================================

// --- FASE 3: RPC Spam Debouncing & 429 Degradation ---

class ResilientIpcStream extends EventEmitter {
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private rateLimitHit: boolean = false;

  constructor() {
    super();
  }

  public connect() {
    this.isConnected = true;
    // Batch updates naar React. 60fps = 16ms
    this.flushInterval = setInterval(() => this.flushBuffer(), 16);
  }

  public receiveToken(token: string) {
    if (!this.isConnected || this.rateLimitHit) return;
    this.buffer.push(token);
  }

  public handleRpcError(error: any) {
    if (error.status === 429 && !this.rateLimitHit) {
      this.rateLimitHit = true;
      this.emit('system_alert', '[Rate Limit] API limiet bereikt. Backoff modus actief...');
      // Na 60 seconden proberen we het opnieuw, dit doorbreekt de death spiral
      setTimeout(() => {
        this.rateLimitHit = false;
        this.emit('system_alert', '[Rate Limit] Backoff voltooid. Hervatten...');
      }, 60000);
    }
  }

  private flushBuffer() {
    if (this.buffer.length > 0) {
      const chunk = this.buffer.join('');
      this.buffer = [];
      this.emit('incremental_update', chunk);
    }
  }

  public disconnect() {
    this.isConnected = false;
    if (this.flushInterval) clearInterval(this.flushInterval);
  }
}

// --- FASE 4: Sync I/O Fix (De beruchte getReadinessHint) ---

/**
 * Mock van de originele git.ts statSync functie, nu ASYNCHROON.
 * Dit was de hoofdreden voor de UI freeze tijdens het renderen.
 */
const checkGitReadinessAsync = async (dir: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Simuleer disk I/O zonder de event loop te blokkeren
    setTimeout(() => {
      resolve(true); 
    }, 10);
  });
};

/**
 * Veilig asynchroon de readiness hint ophalen ZONDER de render loop te blokkeren.
 * In Droid v0.164.1 stond dit via useMemo direct in de render tree.
 */
const useGitReadiness = (dir: string) => {
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    checkGitReadinessAsync(dir).then(ready => {
      if (isMounted) setIsReady(ready);
    });
    return () => { isMounted = false; };
  }, [dir]);

  return isReady;
};

// --- COMPONENTEN ---

/**
 * De gefixte Header component.
 * Problemen opgelost:
 * 1. Duplicate keys in de categorieën
 * 2. Sync I/O geëlimineerd door useEffect hook
 * 3. setState-in-render veiliggesteld
 */
const OptimizedHeader = memo(({ currentDir }: { currentDir: string }) => {
  const isGitReady = useGitReadiness(currentDir);
  
  // Oplossing voor Priority 1.2: Duplicate keys
  // In Droid stonden hier duplicate ID's zoals 'header-configs', we forceren uniekheid.
  const categories = [
    { id: 'configs_1', label: 'header-configs', value: 'OK' },
    { id: 'session_1', label: 'header-session', value: 'Active' },
    { id: 'skills_1', label: 'header-custom_skills', value: 'Loaded' }
  ];

  return (
    <Box flexDirection="row" borderStyle="single" borderColor="blue" paddingX={1} gap={2}>
      <Text color="cyan" bold>DROID CORE</Text>
      <Text color="gray">|</Text>
      <Text color={isGitReady ? "green" : "yellow"}>
        Git: {isGitReady ? "Ready" : "Scanning..."}
      </Text>
      <Text color="gray">|</Text>
      {categories.map((cat, idx) => (
        // Door de index + ID te gebruiken zijn duplicate keys verleden tijd
        <Text key={`cat-${cat.id}-${idx}`} dimColor>
          [{cat.label}: {cat.value}]
        </Text>
      ))}
    </Box>
  );
});

// Memoized token block: Wordt NOOIT opnieuw gerenderd zodra geplaatst (Garbage Collection Fix)
const FinalizedTextLine = memo(({ text }: { text: string }) => {
  return <Text>{text}</Text>;
});

const RebuildAppPhase4 = ({ initialPrompt }: { initialPrompt: string }) => {
  const [finalizedLines, setFinalizedLines] = useState<string[]>([]);
  const [activeChunk, setActiveChunk] = useState<string>('');
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  useEffect(() => {
    const ipc = new ResilientIpcStream();
    ipc.connect();

    ipc.on('incremental_update', (chunk: string) => {
      setActiveChunk((prev) => {
        const combined = prev + chunk;
        if (combined.includes('\n')) {
          const parts = combined.split('\n');
          const toFinalize = parts.slice(0, -1);
          const remaining = parts[parts.length - 1];
          
          setFinalizedLines((lines) => [...lines, ...toFinalize]);
          return remaining;
        }
        return combined;
      });
    });

    ipc.on('system_alert', (msg: string) => {
      setSystemAlert(msg);
    });

    // --- WORKER SIMULATIE ---
    let count = 0;
    const sim = setInterval(() => {
      count++;
      ipc.receiveToken(Math.random().toString(36).substring(7) + " ");
      if (count % 15 === 0) ipc.receiveToken("\n");
      
      // Simuleer een API 429 Rate Limit Crash uit de echte log
      if (count === 40) ipc.handleRpcError({ status: 429 });
      
      if (count > 100) clearInterval(sim);
    }, 5);

    return () => {
      ipc.disconnect();
      clearInterval(sim);
    };
  }, []);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Fase 4: Header met Asynchrone checks en unieke keys */}
      <OptimizedHeader currentDir="/home/user/project" />

      <Box paddingY={1}>
        <Text color="greenBright" bold>Mission Prompt: </Text>
        <Text>{initialPrompt}</Text>
      </Box>

      {/* Incremental Render Box (Fase 2 + 3) */}
      <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
        {finalizedLines.map((line, idx) => (
          <FinalizedTextLine key={`line-${idx}`} text={line} />
        ))}
        {/* Enkel deze chunk update 60fps, de rest blijft statisch */}
        <Text color="yellow">{activeChunk}<Text color="white" dimColor> █</Text></Text>
      </Box>

      {/* Fase 3: Graceful Error Degradation (Geen TUI crashes meer door alerts) */}
      {systemAlert && (
        <Box marginTop={1} padding={1} borderStyle="single" borderColor="red">
          <Text color="redBright" bold>⚠️ {systemAlert}</Text>
        </Box>
      )}
    </Box>
  );
};

export function startRebuildPhase4() {
  console.log("[Main] Starting Droid TUI Rebuild (Phase 3 & 4)...");
  const { unmount } = render(<RebuildAppPhase4 initialPrompt="Initiate Phase 4 Testing..." />);
  
  process.on('SIGINT', () => {
    unmount();
    process.exit(0);
  });
}

// Uncomment om direct te runnen:
// startRebuildPhase4();

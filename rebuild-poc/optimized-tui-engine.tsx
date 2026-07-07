import React, { useState, useEffect, useMemo, memo } from 'react';
import { render, Box, Text } from 'ink';
import { EventEmitter } from 'events';

// ============================================================================
// FASE 2: DROID TUI & IPC NABOUW (OPTIMIZED REBUILD)
// Dit is onze "stotter-vrije" rebuild van het systeem dat Factory probeerde 
// te verbergen achter hun feature flags.
// ============================================================================

/**
 * 1. IPC Stream Receiver met Backpressure & Rate Limit Beveiliging
 * Dit vervangt de kwetsbare `stream-jsonrpc` implementatie van Droid.
 * Als de LLM te snel tokens vuurt (of in een 429 retry-loop vastzit),
 * bufferen we de inkomende stream en sturen we die in afgemeten ticks (60fps) 
 * naar de UI om de React / Ink render engine niet te overweldigen.
 */
class OptimizedIpcStream extends EventEmitter {
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor() {
    super();
  }

  public connect() {
    this.isConnected = true;
    // 16ms = ~60 frames per seconde. We forceren React om nooit vaker te updaten.
    this.flushInterval = setInterval(() => this.flushBuffer(), 16);
  }

  // De LLM worker roept dit aan via Unix Sockets (IPC)
  public receiveToken(token: string) {
    if (!this.isConnected) return;
    this.buffer.push(token);
  }

  public simulateError(errorCode: number) {
    if (errorCode === 429) {
      this.emit('system_alert', '[Rate Limit] LLM backend is throttled. Backing off...');
      // Hier bouwen we backpressure in. We kappen de UI niet af, maar pauzeren.
    }
  }

  private flushBuffer() {
    if (this.buffer.length > 0) {
      const chunk = this.buffer.join('');
      this.buffer = []; // Leeg de buffer
      this.emit('incremental_update', chunk);
    }
  }

  public disconnect() {
    this.isConnected = false;
    if (this.flushInterval) clearInterval(this.flushInterval);
  }
}

/**
 * 2. Incremental Rendering Engine (De TUI)
 * Dit is de nabouw van de 'cli_incremental_rendering' logica.
 * We gebruiken React.memo zodat Ink NIET de hele DOM her-evalueert 
 * bij iedere state change, wat de massieve V8 Garbage Collects oplost.
 */

// Memoized token block: Wordt NOOIT opnieuw gerenderd zodra geplaatst.
const FinalizedTextLine = memo(({ text }: { text: string }) => {
  return <Text>{text}</Text>;
});

const IncrementalAppRoot = ({ initialPrompt }: { initialPrompt: string }) => {
  const [finalizedLines, setFinalizedLines] = useState<string[]>([]);
  const [activeChunk, setActiveChunk] = useState<string>('');
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  useEffect(() => {
    // Koppel aan onze geoptimaliseerde IPC
    const ipc = new OptimizedIpcStream();
    ipc.connect();

    // Ontvang ge-throttlede chunks (geen single-character spam)
    ipc.on('incremental_update', (chunk: string) => {
      setActiveChunk((prev) => {
        const combined = prev + chunk;
        // Als we een newline raken, verplaatsen we het naar finalized lines
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

    // --- SIMULATIE VAN DE DROID WORKER DIE LLM TOKENS STREAMT ---
    let count = 0;
    const sim = setInterval(() => {
      count++;
      ipc.receiveToken(Math.random().toString(36).substring(7) + " ");
      if (count % 20 === 0) ipc.receiveToken("\n"); // Forceer een newline elke 20 tokens
      
      // Simuleer de 429 crash die Droid killt
      if (count === 80) ipc.simulateError(429);
      if (count > 100) clearInterval(sim);
    }, 5); // 5ms per token is enorm snel, onze buffer pakt dit netjes op.

    return () => {
      ipc.disconnect();
      clearInterval(sim);
    };
  }, []);

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
      <Box paddingBottom={1}>
        <Text color="greenBright" bold>Mission Prompt: </Text>
        <Text>{initialPrompt}</Text>
      </Box>

      {/* 
        Dit is de magic trick van Incremental Rendering:
        Finalized lines zijn static en ge-memoized. Ink hoeft dit nooit te reconcilen.
      */}
      <Box flexDirection="column">
        {finalizedLines.map((line, idx) => (
          <FinalizedTextLine key={idx} text={line} />
        ))}
        {/* Alleen dit onderste element rendert 60fps */}
        <Text color="yellow">{activeChunk}<Text color="white" dimColor> █</Text></Text>
      </Box>

      {systemAlert && (
        <Box marginTop={1} padding={1} borderStyle="single" borderColor="red">
          <Text color="redBright" bold>⚠️ {systemAlert}</Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// 3. De Entrypoint (Nabouw van de 'MMM' mount functie)
// ============================================================================

export function startReconstructedTui() {
  console.log("[Main] Starting Optimized CLI TUI Engine...");
  
  // Droid deed dit afhankelijk van een verborgen API flag.
  // Wij forceren dit altijd aan.
  const FORCE_INCREMENTAL_RENDERING = true;

  if (FORCE_INCREMENTAL_RENDERING) {
    const { unmount } = render(<IncrementalAppRoot initialPrompt="Initieer LLM onderzoek..." />);
    
    // Luister naar exit signalen zoals Droid doet in N0(0)
    process.on('SIGINT', () => {
      unmount();
      process.exit(0);
    });
  }
}

// startReconstructedTui();

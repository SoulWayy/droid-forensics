import { EventEmitter } from 'events';
import { useAppStore } from '../state/store.js';

type RpcMessage = 
  | { type: 'thinking_text_delta', content: string }
  | { type: 'tool_progress_update', tool: string, status: string }
  | { type: 'system_alert', message: string, code?: number };

export class FullDroidIpcStream extends EventEmitter {
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private rateLimitHit: boolean = false;

  public connect() {
    this.isConnected = true;
    this.flushInterval = setInterval(() => this.flushBuffer(), 16);
  }

  public simulateIncomingRpc(msg: RpcMessage) {
    if (!this.isConnected) return;
    
    if (this.rateLimitHit && msg.type !== 'system_alert') return; 

    if (msg.type === 'system_alert' && msg.code === 429 && !this.rateLimitHit) {
      this.rateLimitHit = true;
      this.emit('rpc_event', { type: 'system_alert', message: '⚠️ [Rate Limit] 429 Limit bereikt. Droid schakelt over op backoff...' });
      
      setTimeout(() => {
        this.rateLimitHit = false;
        this.emit('rpc_event', { type: 'system_alert', message: '✅ [Rate Limit] Backoff voltooid. Netwerk hervat.' });
      }, 5000);
      return;
    }

    if (msg.type === 'thinking_text_delta') {
      this.buffer.push(msg.content);
      useAppStore.getState().addTokens(msg.content.length);
    } else {
      this.emit('rpc_event', msg);
    }
  }

  public sendUserPrompt(prompt: string) {
    const state = useAppStore.getState();
    if (!state.permissions.trustHomeDir && prompt.includes('rm ')) {
      this.emit('permission_prompt', '⚠️ WARNING: Dangerous command detected. Do you trust this directory? (y/N)');
      return;
    }
    
    state.setAgentState('thinking');
    
    // Simulate backend thinking then responding
    setTimeout(() => {
      if (prompt.includes('search')) {
        state.setAgentState('tool_execution');
        this.simulateIncomingRpc({ type: 'tool_progress_update', tool: 'GrepSearch (MCP)', status: 'Scanning filesystem...' });
        
        setTimeout(() => {
          this.simulateIncomingRpc({ type: 'tool_progress_update', tool: 'GrepSearch (MCP)', status: 'Found 3 results.' });
          this.streamText(`\nI found the files you asked for via the tool.\n`);
        }, 1500);
      } else {
        this.streamText(`Analyzing prompt: "${prompt}"...\n\n`);
      }
    }, 500);
  }

  private streamText(response: string) {
    let i = 0;
    const interval = setInterval(() => {
      if (i < response.length) {
        this.simulateIncomingRpc({ type: 'thinking_text_delta', content: response[i] });
        i++;
      } else {
        clearInterval(interval);
        useAppStore.getState().setAgentState('idle');
      }
    }, 20);
  }

  private flushBuffer() {
    if (this.buffer.length > 0) {
      const chunk = this.buffer.join('');
      this.buffer = [];
      this.emit('rpc_event', { type: 'thinking_text_delta', content: chunk });
    }
  }

  public disconnect() {
    this.isConnected = false;
    if (this.flushInterval) clearInterval(this.flushInterval);
  }
}

export const ipc = new FullDroidIpcStream();

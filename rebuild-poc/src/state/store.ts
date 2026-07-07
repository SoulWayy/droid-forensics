import { create } from 'zustand';

export interface AppState {
  mode: 'tui' | 'headless';
  tokens: number;
  totalCost: number;
  isGitReady: boolean;
  agentState: 'idle' | 'thinking' | 'tool_execution' | 'error';
  permissions: {
    bypassMode: boolean;
    trustHomeDir: boolean;
  };
  addTokens: (count: number) => void;
  setGitReady: (ready: boolean) => void;
  setAgentState: (state: 'idle' | 'thinking' | 'tool_execution' | 'error') => void;
  setTrustHomeDir: (trust: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'tui',
  tokens: 0,
  totalCost: 0,
  isGitReady: false,
  agentState: 'idle',
  permissions: {
    bypassMode: false,
    trustHomeDir: false,
  },
  addTokens: (count) =>
    set((state) => ({
      tokens: state.tokens + count,
      totalCost: (state.tokens + count) * 0.0001,
    })),
  setGitReady: (ready) => set({ isGitReady: ready }),
  setAgentState: (agentState) => set({ agentState }),
  setTrustHomeDir: (trust) => set((state) => ({ permissions: { ...state.permissions, trustHomeDir: trust } })),
}));

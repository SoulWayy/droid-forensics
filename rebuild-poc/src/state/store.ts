import React, { useContext, useSyncExternalStore } from 'react';

// --- Droid Store Core (`createStore`) ---
type Listener = () => void;
type OnChange<T> = (args: { newState: T; oldState: T }) => void;

export type Store<T> = {
  getState: () => T;
  setState: (updater: (prev: T) => T) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,

    setState: (updater: (prev: T) => T) => {
      const prev = state;
      const next = updater(prev);
      if (Object.is(next, prev)) return;
      state = next;
      onChange?.({ newState: next, oldState: prev });
      for (const listener of listeners) listener();
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// --- Rebuild PoC Domain Models ---
export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export interface AppStateData {
  mode: 'tui' | 'headless';
  tokens: number;
  totalCost: number;
  isGitReady: boolean;
  agentState: 'idle' | 'thinking' | 'tool_execution' | 'error';
  permissions: {
    bypassMode: boolean;
    trustHomeDir: boolean;
  };
  todos: TodoItem[];
}

export const initialAppState: AppStateData = {
  mode: 'tui',
  tokens: 0,
  totalCost: 0,
  isGitReady: false,
  agentState: 'idle',
  permissions: {
    bypassMode: false,
    trustHomeDir: false,
  },
  todos: [],
};

// Re-export original AppState type containing the functions for backward compatibility
export interface AppState extends AppStateData {
  addTokens: (count: number) => void;
  setGitReady: (ready: boolean) => void;
  setAgentState: (state: 'idle' | 'thinking' | 'tool_execution' | 'error') => void;
  setTrustHomeDir: (trust: boolean) => void;
  setTodos: (todos: TodoItem[]) => void;
}

// --- Droid React Bindings ---
export type AppStateStore = Store<AppStateData>;
export const AppStoreContext = React.createContext<AppStateStore | null>(null);

type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;

/**
 * Subscribe to a slice of AppState. Only re-renders when the selected value
 * changes (compared via Object.is).
 */
export function useAppState<T>(selector: (state: AppStateData) => T): T;
export function useAppState<T>(selector: IfAny<T, T, never>): any;
export function useAppState<T>(selector: (state: AppStateData) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new ReferenceError('useAppState/useSetAppState cannot be called outside of an <AppStateProvider />');
  }
  
  const selectorRef = React.useRef<(state: AppStateData) => T>(selector);
  const storeRef = React.useRef<AppStateStore>(store);
  
  selectorRef.current = selector;
  storeRef.current = store;
  
  const get = React.useCallback((): T => {
    return selectorRef.current(storeRef.current.getState());
  }, []);
  
  return useSyncExternalStore(store.subscribe, get, get);
}

export function useSetAppState(): AppStateStore['setState'] {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new ReferenceError('useAppState/useSetAppState cannot be called outside of an <AppStateProvider />');
  }
  return store.setState;
}

export function useAppStateStore(): AppStateStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new ReferenceError('useAppState/useSetAppState cannot be called outside of an <AppStateProvider />');
  }
  return store;
}

const NOOP_SUBSCRIBE: AppStateStore['subscribe'] = () => () => {};

export function useAppStateMaybeOutsideOfProvider<T>(
  selector: (state: AppStateData) => T,
): T | undefined;
export function useAppStateMaybeOutsideOfProvider<T>(
  selector: IfAny<T, T, never>,
): any;
export function useAppStateMaybeOutsideOfProvider<T>(
  selector: (state: AppStateData) => T,
): T | undefined {
  const store = useContext(AppStoreContext);
  const selectorRef = React.useRef<(state: AppStateData) => T>(selector);
  const storeRef = React.useRef<AppStateStore | null>(store);
  
  selectorRef.current = selector;
  storeRef.current = store;
  
  const get = React.useCallback((): T | undefined => {
    return storeRef.current ? selectorRef.current(storeRef.current.getState()) : undefined;
  }, []);
  
  return useSyncExternalStore(store ? store.subscribe : NOOP_SUBSCRIBE, get);
}

export const appStore = createStore<AppStateData>(initialAppState);

/**
 * Provides action functions bound to the global appStore
 * to replace the methods that were inside the Zustand state object.
 */
const actions = {
  addTokens: (count: number) => appStore.setState((s) => ({ ...s, tokens: s.tokens + count, totalCost: (s.tokens + count) * 0.0001 })),
  setGitReady: (ready: boolean) => appStore.setState((s) => ({ ...s, isGitReady: ready })),
  setAgentState: (agentState: AppStateData['agentState']) => appStore.setState((s) => ({ ...s, agentState })),
  setTrustHomeDir: (trust: boolean) => appStore.setState((s) => ({ ...s, permissions: { ...s.permissions, trustHomeDir: trust } })),
  setTodos: (todos: TodoItem[]) => appStore.setState((s) => ({ ...s, todos }))
};

/**
 * Drop-in replacement for the Zustand mock. 
 * Combines the mathematically identical Droid hook behavior with 
 * a merged state+actions object for backward compatibility.
 */
export const useAppStore = <T>(selector: (state: AppState) => T): T => {
  const store = appStore;
  
  // Custom selector wrapper to inject actions and mimic Zustand's state + actions pattern
  const wrappedSelector = React.useCallback((stateData: AppStateData): T => {
      const fullState = { ...stateData, ...actions } as AppState;
      return selector(fullState);
  }, [selector]);

  const selectorRef = React.useRef<(state: AppStateData) => T>(wrappedSelector);
  const storeRef = React.useRef<AppStateStore>(store);
  
  selectorRef.current = wrappedSelector;
  storeRef.current = store;
  
  const get = React.useCallback((): T => {
    return selectorRef.current(storeRef.current.getState());
  }, []);
  
  return useSyncExternalStore(store.subscribe, get, get);
};

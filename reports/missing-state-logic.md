# Missing Droid State Logic, Providers, and Hooks

Based on the scan of `src/state/`, `src/context/`, `src/hooks/`, and the root `src/` directory, here is a breakdown of the internal logic missing from our rebuild.

## 1. Global Application State (`src/state/`)
*   **`AppStateStore` / `store.ts`**: Droid uses a custom, lightweight generic store (`Store<T>`) to hold application state outside of React context, preventing excessive re-renders and enabling direct reads (e.g., from the CLI/headless modes).
*   **`AppState`**: A deeply immutable structure holding core data: `toolPermissionContext`, `settings`, `mainLoopModel`, `tasks` (viewer vs. agent context), `swarmContext`, `replContext`, and `remoteConnectionStatus`.
*   **State Listeners (`onChangeAppState.ts`)**: Hooks into `AppState` mutations to synchronize data, such as persisting the active model to external profiles or intercepting permission mode changes to keep external CCR/SDK environments in sync.
*   **`pluginCommandsStore.ts`**: Isolated state specifically for tracking dynamic plugin commands.

## 2. Telemetry and Cost Tracking
*   **`StatsStore` (`src/context/stats.tsx`)**: A singleton tracker managing telemetry metrics, hook execution durations, and performance counters. It provides an `observe(name, value)` interface globally accessible via `getStatsStore()` and React context (`StatsProvider`).
*   **`CostTracker` (`src/cost-tracker.ts` & `src/costHook.ts`)**: Tracks exact session spending with functions like `getTotalCost()`, `saveCurrentSessionCosts()`, and `resetCostState()`.
*   **`useCostSummary`**: React hook that monitors token usage. It conditionally triggers a `CostThresholdDialog` in the REPL whenever token spend crosses certain boundaries (e.g., $5).

## 3. Context Providers (`src/context/`)
*   **`NotificationsContext` (`notifications.tsx`)**: Manages a queue of UI notifications using `setTimeout` logic intertwined with `AppState` for robust toast/notification delivery.
*   **`PromptOverlayContext` (`promptOverlayContext.tsx`)**: Implements an optimized split-context pattern (`DataContext` and `SetContext`) to ensure components writing to the overlay don't trigger unnecessary re-renders.
*   **`VoiceContext` (`voice.tsx`)**: Employs its own standalone `createStore` specifically to manage active voice streams and states independently from the main AppState.
*   **Other Contexts**: `modalContext` (dialog states), `overlayContext`, `fpsMetrics`, `mailbox` (inter-component message queue), and `QueuedMessageContext`.

## 4. Permissions Logic
*   **`ToolPermissionContext`**: Embedded within `AppState`, defining access levels (`mode: 'auto' | 'fullAccess'`).
*   **`useCanUseTool.tsx`**: Hook that bridges the UI and `ToolPermissionContext`, prompting the user and queueing tool usage dialogs when permissions are required.
*   **`useSwarmPermissionPoller.ts`**: Subagent permission polling hook to coordinate cross-agent sandbox limits.

## 5. Other Essential Hooks (`src/hooks/`)
*   **`useManagePlugins.ts`**: Synchronizes external plugin states, loading errors, and LSP tool discoveries into `AppState`.
*   **`useRemoteSession.ts` & `useSSHSession.ts`**: Syncs remote environment connection statuses and workspace bounds.
*   **`useInboxPoller.ts`**: Background message queue synchronization hook.
*   **`useVirtualScroll.ts`**: Custom virtualization logic necessary to handle rendering thousands of chat messages without massive memory/CPU overhead (fiber cost optimization).

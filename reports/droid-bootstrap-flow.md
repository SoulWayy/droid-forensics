# Factory AI Droid - CLI Bootstrap & UI Mount Flow

This analysis details the critical startup execution path found in `droid-bundle.js` and `droid-full-source.js`. The flow bridges the gap between CLI argument parsing and the final React (Ink) DOM mount in the terminal. The process operates in two primary phases: Pre-flight Bootstrap (`lMM()`) and the Main UI App Initialization (`MMM()`).

## Phase 1: The Pre-Flight Bootstrap (`lMM`)

When the Commander CLI parser triggers the `tui` target, execution jumps to the `lMM(H, $)` bootstrap function. This phase runs headless and initializes critical platform integrations:

1. **Telemetry & Settings Initialization**
   - **Performance Hooks**: `cli_startup_bootstrap_latency` is tracked.
   - **Runtime Overlay**: Droid evaluates its settings via `uwH(A)`. If an override path is found, it is securely loaded into `process.env[FACTORY_RUNTIME_SETTINGS_PATH]`. 
   - **System Prompts**: Loads any globally appended system prompts (`FACTORY_APPEND_SYSTEM_PROMPT`).

2. **Background Cleanups & Cache Warmup**
   - **Search Warmup**: Kicks off an asynchronous job `warmSearchCache()` to get vector/index pipelines ready.
   - **Zombie Process Cleanup**: Eliminates orphaned processes via `cleanupAgentBrowserDaemons()` and `cleanupStalePreservedBinaries()`.

3. **Authentication & Identity Engine**
   - **Certificates**: Loads API certificates (`cli_startup_certificates_latency`).
   - **API Token Verification**: Binds `getRuntimeAuthConfig` to fetch auth tokens from settings and verifies validity.
   - **Host Identification**: Reconstructs the CLI identity string with `initializeCliHostIdentity()`.

4. **Eager Feature Flag Loading (Network Bottleneck)**
   - **Statsig / API Sync**: Begins fetching feature flags aggressively in the background using `pi()`. This ensures network latency is absorbed during other CPU-bound startup steps. It registers the performance metric `cli_startup_feature_flags_warm_latency`.

5. **Auto-Updater Check**
   - Performs a synchronous `TG$()` to determine if a newer version of the CLI exists before moving to the visual phase.

---

## Phase 2: Main TUI Mount (`MMM`)

Once `lMM` passes the baton, control is handed to `MMM(H, $, L, A, I)` to wire up local daemons, build the terminal UI layout, and engage the React loop.

1. **Mode Setup & Tool Manager**
   - Imprints `terminal-ui` and `tui` state flags across the global client configuration.
   - Triggers `ensureTaskToolManagerInitialized()` to verify local MCP/tool binaries.

2. **Local AI Daemon Setup (In-Process IPC)**
   - Uses `getTuiDaemonAdapter()` to spawn or verify the background language model engine.
   - Calls `ensureConnectedAndGetController()` to establish IPC before the UI attempts to parse token streams.

3. **Terminal Environment & Theme Detection**
   - **Kitty Keyboard Protocol**: Attaches to enhanced input capabilities via `vOL()`.
   - **Color Themes**: Executes `nZ0()` to detect terminal capabilities and sets the default theme context for Ink layout rendering.

4. **The Feature Flag Lock & Incremental Render Trap**
   - **Wait for Flags**: Forces an `await pi()` block. The UI halts until the async flags from Step 4 of the Bootstrap resolve.
   - **The Memory-Leak Trigger**: The code parses the flags using `lv0()`, checking `Uu(OD.CliIncrementalRendering)`. If standard network lag occurs, this often defaults to `false`, fundamentally modifying how Ink re-renders the DOM, which has been identified as a significant source of lag.

5. **React (Ink) App Mount**
   - Bootstraps the application via `AppRoot` rendering.
   - Crucially, injects the previously evaluated `incrementalRendering` property and tracks the specific initial prompt via `initialPrompt: H` and `resumeSessionId: $`.

6. **Post-Mount Operations & Security**
   - **Permission Enforcement**: `ensureAllSecurePermissions()` sets restrictive CHMODs on internal caches and session files.
   - **Telemetry Monitoring**: Enables heavy `startResourceMonitoring()` for real-time daemon RSS profiling.
   - **Connection Tear-Down**: Registers `registerExitOnTerminalDisconnect` to catch headless SSH/TTY disconnections gracefully and flush process queues.

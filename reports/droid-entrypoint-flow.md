# Factory AI Droid - Absolute Startup Flow

Based on the analysis of `droid-bundle.js` and `droid-full-source.js`, the exact execution order of Droid's TUI from the CLI entry point to the first React/Ink frame is as follows:

## 1. CLI Entry Point & Argument Parsing
When the Node.js execution begins, the bundle uses the `commander` library to parse `process.argv`. When the parser hits the default command or explicitly the `tui` command, it kicks off the `lMM(H, $)` bootstrap function. 

## 2. The TUI Bootstrap Pre-Flight (`lMM` function)
The `lMM` function performs critical pre-flight checks and setup before mounting the UI:
1. **Telemetry & Settings Init**: Initializes runtime settings (via `uwH(A)`) and checks the `.factory/cache`. It prints `[tui-startup] Runtime settings overlay enabled`.
2. **Auth Token Fetching**: Synchronously sets up auth token retrieval (`getRuntimeAuthConfig`).
3. **Feature Flags Pre-fetch**: Calls `pi()` to immediately trigger a background API call to Statsig/Factory to warm up the feature flags.
4. **Auto-Updater Check**: Validates if Droid needs an update (`TG$()`).

## 3. The Main TUI Mount (`MMM` function)
If the pre-flight completes, execution switches to the main application loop `MMM(H, $, L, A, I)`:
1. **Mode Initialization**: Sets the internal state (`$B.getInstance().setDroidMode("terminal-ui")` and `setClientMode("tui")`).
2. **Daemon Adapter Pre-Connect**: Pre-connects the in-process daemon worker adapter (`getTuiDaemonAdapter().ensureConnectedAndGetController()`) which handles local LLM streaming.
3. **Terminal Detection**: Attempts to enable the Kitty protocol and detects terminal appearance (`M.loadTheme("auto")`).
4. **Feature Flag Evaluation**: Awaits the `pi()` feature flag call. It then passes `Uu(OD.CliIncrementalRendering)` into `lv0()` to determine if incremental rendering should be enabled (the root cause of the previous 429 lag).

## 4. The React (Ink) Render Mount
Finally, the bundle boots the interactive terminal UI:
```javascript
let G = render(
    <AppRoot initialPrompt={H} resumeSessionId={$} originalCwd={A} daemonStartupFailed={false} />,
    {
        exitOnCtrlC: false,
        incrementalRendering: w.enabled,
        patchConsole: false,
        onRender: (J) => D.recordInkRender(J)
    }
);
```
Following this mount, Droid establishes post-render security hooks (CHMOD logic) and registers the TTY-disconnect event listener to shut down gracefully when the terminal window closes.

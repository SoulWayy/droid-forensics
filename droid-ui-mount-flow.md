# Droid UI Mount Flow Analysis

Based on the bundled source code (`droid-bundle.js` / `droid-full-source.js`) and the extracted core systems (specifically `extracted-source/core-systems/3_tui_incremental_mount.js` from byte offset 17552300), we can trace the exact initialization and React/Ink mount.

## 1. The Pre-flight Bootstrap (`lMM` function)
The CLI startup begins in the `lMM(H, $)` bootstrap function. 
Here, the environment is prepared before handing off to the UI loop:
- **Settings Overlay**: Loads runtime settings (`uwH`).
- **Authentication**: Fetches auth tokens via `getRuntimeAuthConfig`.
- **Feature Flags**: Eagerly fetches feature flags via `pi()` to prevent blocking the UI later.

## 2. The Main TUI Mount (`MMM` function)
If pre-flight is successful, it transitions to `MMM(H, $, L, A, I)`.
The arguments represent the initial state:
- `H`: `initialPrompt`
- `$`: `resumeSessionId`
- `A`: `originalCwd`

In this function, the system does:
- **Terminal Detection**: Enables Kitty protocol and loads themes.
- **Feature Flag Evaluation**: Evaluates whether to use incremental rendering (the known performance bottleneck):
  ```javascript
  let w = lv0({
      disabled: y1().extras.disableIncrementalRendering,
      deploymentEnv: y1().deploymentEnv,
      featureFlagEnabled: Uu(OD.CliIncrementalRendering)
  });
  ```

## 3. The Exact React/Ink Mount Point
The UI is mounted using `vW$`, which is the minified equivalent of Ink's `render` function, using `jsxDEV` for element creation:

```javascript
let G = vW$(
    HyL.jsxDEV(k20, {
        children: HyL.jsxDEV(eBH, {
            id: "AppRoot",
            children: HyL.jsxDEV($Z0, {
                initialPrompt: H,
                resumeSessionId: $,
                originalCwd: A,
                daemonStartupFailed: !1
            }, void 0, !1, void 0, this)
        }, void 0, !1, void 0, this)
    }, void 0, !1, void 0, this),
    {
        exitOnCtrlC: !1,
        incrementalRendering: w.enabled, // Determined by feature flag
        patchConsole: !1,
        onRender: (J) => D.recordInkRender(J)
    }
);
```

### Initial State Propagation
The initial state is propagated directly into the `<$Z0>` component (the internal app root) via props:
- `initialPrompt={H}`
- `resumeSessionId={$}`
- `originalCwd={A}`

This frame holds the lifecycle, and subsequent token updates from the daemon worker are rendered within this tree. If `w.enabled` (incremental rendering) is false, the entire DOM tree is discarded and rebuilt on every render cycle, explaining the heavy V8 GC load.

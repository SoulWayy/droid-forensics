# Factory AI Droid - Exact Startup Flow (Reverse Engineered)

Uit de geëxtraheerde code (specifiek uit onze file `3_tui_incremental_mount.js`) heb ik de exacte executie-volgorde van Droid's TUI gereconstrueerd. Vanaf het moment dat je `droid` of `factory` typt tot aan het eerste Ink/React frame.

Hier is de *source-truth* call stack.

## De TUI Bootstrap (`lMM` functie)
Wanneer de CLI-parser (Commander) het `tui` of default commando raakt, wordt de bootstrap-functie `lMM(H, $)` gestart. Dit is de "Pre-flight":

1. **Telemetry & Settings Init**:
   ```javascript
   pH("[tui-startup] Runtime settings overlay enabled")
   // Laadt settings via uwH(A) en checkt .factory/cache
   ```
2. **Auth Token Fetching**:
   ```javascript
   let {getRuntimeAuthConfig: T} = await Promise.resolve().then(() => (g0(), MK));
   // Haalt via e8(T()) de auth tokens op voor de API.
   ```
3. **Feature Flags Pre-fetch (Eager load)**:
   ```javascript
   M = up("cli_startup_feature_flags_warm_latency", () => pi())
   // Functie `pi()` maakt direct een background API call naar Statsig / Factory om vlaggen op te halen.
   ```
4. **Auto-Updater Check**:
   ```javascript
   let w = await TG$().catch(...)
   pH("[tui-startup] Auto-update completed", { outcome: w })
   ```

## De Main TUI Mount (`MMM` functie)
Als de pre-flight slaagt, schakelt Droid over naar de daadwerkelijke applicatie-loop `MMM(H, $, L, A, I)`:

1. **Mode Initialization**:
   ```javascript
   pH("[Main] Starting Factory CLI TUI application")
   $B.getInstance().setDroidMode("terminal-ui")
   $B.getInstance().setClientMode("tui")
   ```
2. **In-Process Daemon Adapter pre-connect**:
   Droid probeert hier lokaal de achtergrond-worker (die de LLM streamt) te koppelen aan de UI-thread:
   ```javascript
   let {getTuiDaemonAdapter: J} = await Promise.resolve().then(() => rCA);
   await J().ensureConnectedAndGetController()
   ```
3. **Thema & Terminal Detectie (Kitty Protocol)**:
   ```javascript
   // Probeert de Kitty protocol in te schakelen
   await vOL() 
   let J = await nZ0(); // terminal appearance detection
   M.loadTheme("auto")
   ```
4. **De Feature Flag Killswitch (De Oorzaak van de Lag!)**:
   Hier is het snoeiharde bewijs. Voordat Ink wordt geladen, beslist Droid of hij Full-DOM of Incremental render gebruikt:
   ```javascript
   await pi(); // Wacht tot feature flags binnen zijn
   let w = lv0({
       disabled: y1().extras.disableIncrementalRendering,
       deploymentEnv: y1().deploymentEnv,
       featureFlagEnabled: Uu(OD.CliIncrementalRendering) // DIT IS DE FLAG DIE WIJ GEHACKT HEBBEN
   });
   ```
5. **De React (Ink) Render Mount**:
   Hier is het moment suprême: het laden van `AppRoot` in de terminal.
   ```javascript
   let G = render(
       <AppRoot initialPrompt={H} resumeSessionId={$} originalCwd={A} daemonStartupFailed={false} />,
       {
           exitOnCtrlC: false,
           incrementalRendering: w.enabled, // De vlag bepaalt of hij V8 Garbage Collects forceert of patcht!
           patchConsole: false,
           onRender: (J) => D.recordInkRender(J)
       }
   );
   ```
6. **Post-render Security & Teardown Setup**:
   Daarna start het resource monitoring en hookt hij in op de TTY-disconnects:
   ```javascript
   let {ensureAllSecurePermissions: J} = await Promise.resolve().then(() => $Et);
   await J() // Set CHMODs op interne files
   
   let {registerExitOnTerminalDisconnect: g} = await Promise.resolve().then(() => lZ0);
   let N = g({enabled: Boolean(process.stdin.isTTY && process.stdout.isTTY), onDisconnect: V});
   ```

### Conclusie voor jouw eigen projecten
Dit is exact hoe ze het doen. Er zit geen magie in. De hapering ontstaat puur en alleen doordat `incrementalRendering: w.enabled` in stap 5 standaard op `false` stond vanwege hun gefaalde remote vlag (`Uu(OD.CliIncrementalRendering)` gaf false terug over het netwerk door de rate limit!). Ink gaat dan bij iedere LLM token de hele component boom weggooien en opnieuw instantiëren.

Door onze CHMOD 444 hack, forceert de `Uu()` functie lokaal `true`, en blijft `AppRoot` in het geheugen in plaats van dat de V8 Garbage Collector ontploft. We hebben hun volledige applicatie-levenscyclus nu transparant in kaart.

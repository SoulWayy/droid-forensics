// ==========================================
// EXTRACTED COMPONENT: 3_tui_incremental_mount
// CONTEXT: Main App Root mounting, Ink initialization, and incremental render checks
// RAW BYTE OFFSET: 17552300
// ==========================================

=null,B=!1,E=(C)=>{
if(B)return;
B=!0,H.onDisconnect(C)}
,M=()=>E("sighup"),r=()=>E("stdin_end"),P=()=>E("stdin_close"),T=(C)=>{
if(C?.code==="EIO"&&D(0)&&D(1))return;
E("stdin_error")}
,l=()=>E("stdout_error"),w=()=>E("stderr_error");
if(process.on("SIGHUP",M),$.on("end",r),$.on("close",P),$.on("error",T),L.on("error",l),A.on("error",w),f=setInterval(()=>{
if(!D(0)||!D(1))E("tty_poll")}
,I),typeof f.unref==="function")f.unref();
return()=>{
if(process.off("SIGHUP",M),$.off("end",r),$.off("close",P),$.off("error",T),L.off("error",l),A.off("error",w),f)clearInterval(f),f=null}
}
var oZ0=e(()=>{
X3()}
);
var wZ0={
}
;
MD(wZ0,{
main:()=>MMM}
);
async function MMM(H,$,L,A,I){
pH("[Main] Starting Factory CLI TUI application"),lyH("Droid"),$B.getInstance().setDroidMode("terminal-ui"),$B.getInstance().setClientMode("tui");
let D=kf$();
if(n20())D.startRun({
mode:"interactive"}
),D.startResourceSampling(),fZ0();
if(Promise.resolve().then(() => (gKH(),bGL)).then(({
ensureTaskToolManagerInitialized:J}
)=>J()).catch((J)=>{
t$(J,"[Main] tool manager re-ensure failed")}
),I)await I;
else try{
await vOL()}
catch(J){
t$(J,"[Main] Failed to enable Kitty protocol")}
if(!$)KmH().catch(()=>{
return}
);
Y9(lt()).catch(()=>{
return}
),(async()=>{
try{
let{
getTuiDaemonAdapter:J}
=await Promise.resolve().then(() => (wE(),rCA));
await J().ensureConnectedAndGetController()}
catch(J){
t$(J,"[Main] Failed to pre-connect in-process adapter")}
}
)();
let f=s$(),B=f.getLanguagePreference(),E=DZ0(B);
G9H(E);
let M=Pw(),r=f.getSettings().general?.theme;
if(M.setOverrideTerminalColors(f.getOverrideTerminalColors()),!r||r==="auto"){
try{
let J=await nZ0();
if(J!=="unknown")M.setDetectedAppearance(J)}
catch(J){
TH("[Main] Terminal appearance detection failed",{
cause:J}
)}
M.loadTheme("auto")}
else M.loadTheme(r);
if(process.stdout.isTTY)M.applyTheme();
if(!$&&f.shouldShowLogoAnimation())await AZ0(),f.markLogoAnimationShown();
rA.addToCounter("cli_startup_total_latency",process.uptime()*1000,eF()),setTimeout(()=>{
rA.addToCounter("cli_startup_idle_rss_mb",process.memoryUsage().rss/1024/1024,eF())}
,20000).unref?.(),await pi();
try{
await vh0()}
catch(J){
t$(J,"[Main] Failed to register slash commands")}
let w=lv0({
disabled:y1().extras.disableIncrementalRendering,deploymentEnv:y1().deploymentEnv,featureFlagEnabled:Uu(OD.CliIncrementalRendering)}
),C=performance.now(),G=vW$(HyL.jsxDEV(k20,{
children:HyL.jsxDEV(eBH,{
id:"AppRoot",children:HyL.jsxDEV($Z0,{
initialPrompt:H,resumeSessionId:$,originalCwd:A,daemonStartupFailed:!1}
,void 0,!1,void 0,this)}
,void 0,!1,void 0,this)}
,void 0,!1,void 0,this),{
exitOnCtrlC:!1,incrementalRendering:w.enabled,patchConsole:!1,onRender:(J)=>D.recordInkRender(J)}
);
Hw("cli_tui_render_call_latency",C,{
incrementalRendering:String(w.enabled),incrementalRenderingReason:w.reason}
),(async()=>{
try{
let{
startResourceMonitoring:J}
=await Promise.resolve().then(() => (zf$(),EhI));
J()}
catch(J){
t$(J,"[Main] Failed to start resource monitoring")}
}
)(),(async()=>{
try{
let{
ensureAllSecurePermissions:J}
=await Promise.resolve().then(() => (b0H(),$Et));
await J()}
catch(J){
t$(J,"[Security] Failed to secure file permissions on startup",{
}
)}
}
)(),(async()=>{
try{
let{
logTerminalCapabilities:J}
=await Promise.resolve().then(() => (TZ0(),PZ0));
await J()}
catch(J){
t$(J,"[Main] Failed to log terminal capabilities")}
}
)();
let N=null,W=null,Q=!1,V=(J)=>{
if(Q)return;
Q=!0,pH("[Main] Terminal disconnected, exiting",{
reason:J}
),(async()=>{
try{
let{
gracefulMissionExit:k}
=await Promise.resolve().then(() => (lcL(),hT0));
await k()}
catch(k){
t$(k,"[Main] Failed to gracefully exit mission")}
}
)(),Pw().restoreTheme();
try{
G.unmount()}
catch(k){
t$(k,"[Main] Failed to unmount Ink app")}
if(W=setTimeout(()=>{
N0(0)}
,2000),typeof W.unref==="function")W.unref()}
,{
registerExitOnTerminalDisconnect:g}
=await Promise.resolve().then(() => (oZ0(),lZ0));
if(N=g({
enabled:Boolean(process.stdin.isTTY&&process.stdout.isTTY),onDisconnect:V}
),await G.waitUntilExit(),await q20(),N)N(),N=null;
if(W)clearTimeout(W),W=null;
try{
let{
stopResourceMonitoring:J}
=await Promise.resolve().then(() => (zf$(),EhI));
J()}
catch(J){
t$(J,"[Main] Failed to stop resource monitoring")}
await D.stopRun().catch((J)=>{
t$(J,"[Profiler] Failed to stop profiler cleanly")}
),Pw().restoreTheme();
try{
let{
restoreShellTerminalState:J}
=await Promise.resolve().then(() => (Rt$(),wh0));
await J()}
catch(J){
t$(J,"[Main] Failed to restore shell terminal state")}
LZ0(),await N0(0)}
var HyL;
var UZ0=e(async()=>{
H9();
d7();
Ci();
F$();
o8();
bE();
Gn();
MEI();
g0();
UI();
tZ0();
u2L();
fhI();
jQ$();
uZ0();
df();
ym();
fp();
X3();
J3();
bWL();
lGH();
xFL();
ug();
YUH();
MZ0();
await yI([JA(),IZ0(),Zs()]);
HyL=_H(z$(),1);
WBt(()=>{
let H=s$(),$=H.getAwaitingInputSound();
if($==="off")return;
let L=H.getSoundFocusMode();
c2$($,{
}
,L).catch((A)=>{
TH("[AskUser] Failed to play awaiting input sound",{
cause:A}
)}
)}
);
yBt(()=>{
let H=s$(),$=H.getCompletionSound();
if($==="off")return;
let L=H.getSoundFocusMode();
c2$($,{
}
,L).catch(()=>{
}
)}
)}
);
var FZ0={
}
;
MD(FZ0,{
run:()=>lMM}
);
import{
dirname as rMM,resolve as pZ0}
from"path";
import{
fileURLToPath as iMM}
from"url";
function $yL(H){
process.stderr.write(`${
H}

`)}
function x0$(H){
if(H instanceof SH)return H.metadata?.path?`${
H.message}
: ${
H.metadata.path}
`:H.message;
if(H instanceof Error)return H.message;
if(typeof ErrorEvent<"u"&&H instanceof ErrorEvent)return H.message;
return String(H)}
function GZ0(H){
return H instanceof Error?H.message:String(H)}
async function LyL(H,$){
if(XZ0)process.exit(M1I(H)?0:1);
XZ0=!0;
let L=H instanceof Error?H:Error(String(H));
if(M1I(H)){
pH("[TUI] Broken terminal write detected, exiting",{
reason:$,errorMessage:GZ0(H)}
),await CZ0.requestExit({
reason:"other",exitCode:0}
);
return}
if(saH({
context:$,message:x0$(H),stack:L.stack}
),$yL(`Critical error: ${
x0$(H)}
`),H instanceof Error&&H.stack)$yL(H.stack);
console.error("An unexpected critical error occurred",{
error:H,context:$}
),t$(L,$),await CZ0.requestExit({
reason:"other",exitCode:1,error:L}
)}
async function lMM(H,$){
try{
rA.addToCounter("cli_startup_bootstrap_latency",process.uptime()*1000,eF()),G9H();
let L=performance.now();
FiH();
let A=$.settings??PkH();
if(A)try{
let r=await uwH(A);
process.env[et.FACTORY_RUNTIME_SETTINGS_PATH]=r,FiH(),pH("[tui-startup] Runtime settings overlay enabled",{
path:r}
)}
catch(r){
delete process.env[et.FACTORY_RUNTIME_SETTINGS_PATH],maH(r instanceof SH&&typeof r.metadata?.path==="string"?r.metadata.path:A,GZ0(r)),TH("[tui-startup] Runtime settings overlay ignored",{
path:A,cause:r}
)}
let I=await eiL({
appendSystemPrompt:$.appendSystemPrompt??null,appendSystemPromptFile:$.appendSystemPromptFile??null}
)??process.env[et.FACTORY_APPEND_SYSTEM_PROMPT]??null;
if(I)process.env[et.FACTORY_APPEND_SYSTEM_PROMPT]=I,SB().setAppendSystemPrompt(I);
let D=H&&H.length>0;
if(!D)(async()=>{
try{
let{
warmSearchCache:r}
=await Promise.resolve().then(() => (S0L(),NwA));
await r()}
catch(r){
t$(r,"[search] warmSearchCache startup failed")}
}
)();
let B=vOL().catch(()=>!1);
(async()=>{
try{
let{
cleanupAgentBrowserDaemons:r}
=await Promise.resolve().then(() => (o4$(),IfL));
await r()}
catch(r){
t$(r,"[agent-browser-cleanup] Startup cleanup failed")}
}
)(),Promise.resolve().then(() => (O$H(),UkH)).then(({
cleanupStalePreservedBinaries:r}
)=>r()).catch((r)=>{
t$(r,"[tui-startup] cleanupStalePreservedBinaries failed")}
);
let E=null,M=Promise.resolve();
try{
await up("cli_startup_certificates_latency",()=>nwH()),FrH();
try{
$B.getInstance().setAuthTokenGetter(async()=>{
let{
getRuntimeAuthConfig:T}
=await Promise.resolve().then(() => (g0(),MK));
return e8(T())}
)}
catch{
}
if(!await up("cli_startup_auth_token_latency",()=>Promise.resolve().then(() => (g0(),MK)).then(({
getRuntimeAuthConfig:T}
)=>e8(T())),(T)=>({
status:T?"present":"missing"}
)))TH("[tui-startup] Invalid auth");
else pH("[tui-startup] Valid auth");
o9H(async()=>{
let{
getRuntimeAuthConfig:T}
=await Promise.resolve().then(() => (g0(),MK));
return(await Y9(T()))?.orgId}
);
let{
initializeCliHostIdentity:P}
=await Promise.resolve().then(() => (yC$(),WC$));
await P(),pH("[tui-startup] Host identity initialized");
try{
M=up("cli_startup_feature_flags_warm_latency",()=>pi()).catch((T)=>{
TH("[tui-startup] Failed to eagerly fetch feature flags (async)",{
cause:T}
)}
)}
catch(T){
TH("[tui-startup] Failed to eagerly fetch feature flags (sync)",{
cause:T}
)}
}
catch(r){
throw E=r,r}
finally{
let r=performance.now(),P=!0;
await up("cli_startup_settings_init_latency",async()=>{
await F3.initialize();
let G=E2();
if(G.setInteractiveTuiContext(!0),!G.isCurrentFolderTrusted())await Promise.race([M,hY(3000)]);
e$().initializeAutonomyFromGlobalDefaults();
let{
ensureBuiltInDroids:N}
=await Promise.resolve().then(() => (uiL(),fiL));
await N()}
).catch((G)=>{
P=!1,t$(G,"[tui-startup] Failed to initialize settings")}
);
let T=performance.now()-r;
if(P)pH("[tui-startup] Settings init completed",{
durationMs:Math.round(T)}
);
else TH("[tui-startup] Settings init failed",{
durationMs:Math.round(T)}
);
let l=performance.now(),w=await TG$().catch((G)=>{
return t$(G,"Failed to run auto-update"),"error"}
),C=performance.now()-l;
if(pH("[tui-startup] Auto-update completed",{
durationMs:Math.round(C),outcome:w}
),E)TH("Unexpected error b
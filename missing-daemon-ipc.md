# Missing Daemon IPC and Lifecycle Events

Based on an analysis of the background worker/daemon communication (via `src/bridge/` and `src/cli/`), the following IPC message types and lifecycle events are handled by the backend but might be missing from the `FullDroidIpcStream` mock:

## 1. Control Request Subtypes (IPC Message Types)
The CLI and SDK daemon bridge processes `control_request` events with the following subtypes:
- `initialize`: Session startup and capability negotiation
- `interrupt`: Cancels the currently running conversation turn
- `can_use_tool`: Permission check for tool execution
- `set_permission_mode`: Updates tool permission modes
- `set_model`: Updates the active model
- `set_max_thinking_tokens`: Configures extended thinking limits
- `mcp_status`: Checks MCP server connections
- `get_context_usage`: Requests context window utilization data
- `rewind_files`: Requests file modification rollback
- `cancel_async_message`: Drops a pending async user message from the queue
- `seed_read_state`: Seeds file cache state (`mtime` check for stale reads)
- `hook_callback`: Delivers hook responses
- `mcp_message`: Direct JSON-RPC message passing to an in-process SDK MCP server
- `mcp_set_servers`: Replaces the dynamically managed MCP servers
- `reload_plugins`: Hot-reloads plugins and tools
- `mcp_reconnect` & `mcp_toggle`: Manage specific MCP server connections
- `stop_task`: Terminates a running task
- `apply_flag_settings` & `get_settings`: Runtime settings synchronization
- `elicitation`: Proxies a user input request form/url to the SDK

## 2. Global Protocol Message Types
Alongside `control_request` and `control_response`, the JSON stream supports:
- `control_cancel_request`: Cancels an active `control_request`
- `keep_alive`: WebSocket/stream keep-alive pings
- `update_environment_variables`: Syncs environment variables dynamically
- Standard SDK messages (`user`, `assistant`, `system`)

## 3. Worker/Delivery Lifecycle Events
The worker (CCR/daemon client) manages message delivery via `reportDelivery`:
- **`received`**: Triggered immediately when the SSE stream receives a message.
- **`processing`**: Maps to `started` in the CLI's command lifecycle.
- **`processed`**: Maps to `completed` in the CLI's command lifecycle.

*In the bridge (`replBridgeTransport.ts`), failing to emit `received` and `processed` results in re-queued messages or silent dropping on reconnect.*

## 4. Session State & Event Hooks
The daemon handles these asynchronous callbacks:
- `reportState(state, details)` via `setSessionStateChangedListener`
- `reportMetadata(metadata)` via `setSessionMetadataChangedListener`
- `readInternalEvents` & `readSubagentInternalEvents` (via `setInternalEventReader`)

## 5. Query Lifecycle Events
During a turn execution, the REPL tracking emits detailed lifecycle stages:
- `start` / `guard_start`
- `timeout`
- `abort_requested` / `abort_acknowledged`
- `end`

Mocking these IPC types and accurately acknowledging the delivery states (`processing`, `processed`) ensures the mock stream correctly simulates the backend behavior without stalling or dropping messages.

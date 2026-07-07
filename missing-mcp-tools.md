# Droid CLI Tool & MCP Discovery and TUI Rendering

## Tool and MCP Discovery and Integration

### Built-in Tools
Built-in tools are discovered and managed primarily in `src/tools.ts`. 
- They are imported from the `src/tools/` subdirectories (e.g., `AgentTool`, `BashTool`, `FileEditTool`, etc.).
- A centralized function, `getAllBaseTools()`, aggregates all available native tools. Tools can be dynamically toggled based on environment variables or specific feature flags.
- They are subject to permission filtering using `filterToolsByDenyRules()`.

### MCP Servers and Configuration
MCP server configuration is managed by `src/services/mcp/config.ts` and `src/cli/handlers/mcp.tsx`.
- Configurations can be defined across multiple scopes: `project` (in `.mcp.json`), `user` (global config), and `local`.
- The `getAllMcpConfigs()` function aggregates the available MCP servers. The system also deduplicates servers using `getMcpServerSignature()` to prevent collisions between manually configured servers, plugin servers, and `claude.ai` proxy connectors.

### Client Integration
Connections to MCP servers are handled in `src/services/mcp/client.ts`.
- The system supports various transports including `stdio`, `sse`, `ws`, `sse-ide`, and `ws-ide`.
- `connectToServer()` sets up these connections using the official `@modelcontextprotocol/sdk/client` library.
- Built-in and MCP tools are merged into a single tool pool via `assembleToolPool(permissionContext, mcpTools)` in `src/tools.ts`. Built-in tools always take precedence over MCP tools with identical names.

## TUI Rendering of Tool Execution

The TUI components for tool execution are located in `src/components/messages/`. 

- **Tool Execution Request:** 
  The component `AssistantToolUseMessage.tsx` manages the display of tool invocations. While waiting for the tool to finish, it displays a `<ToolUseLoader />`. It delegates the actual rendering to the specific tool's `renderToolUseMessage` or `renderToolUseProgressMessage` method.
- **Missing Generic Components:**
  There are no raw `<ToolUse>` or generic `<Fallback>` components. Instead, the architecture is specific:
  - Error fallback is handled by `<FallbackToolUseErrorMessage />` (defined in `src/components/FallbackToolUseErrorMessage.tsx`) and is utilized in `UserToolErrorMessage.tsx`.
  - Rejection fallback is handled by `<FallbackToolUseRejectedMessage />` (defined in `src/components/FallbackToolUseRejectedMessage.tsx`) and is utilized in `UserToolRejectMessage.tsx`.
  - The lack of a generic `<ToolUse>` tag/component means that if a custom MCP tool is used and the specific Tool class lacks a `renderToolUseMessage` implementation, the UI must fall back to plain text or nothing, since it relies on the `Tool` class method.

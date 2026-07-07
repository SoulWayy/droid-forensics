# Missing UI Components in Droid Rebuild PoC

Based on the scan of `/home/jan/openclaude/src/components/` and `src/screens/`, here are the visual React/Ink components missing from the Droid Rebuild PoC (which currently only implements Header, ChatHistory, StatusLine, and PromptInput).

## 1. Dialogs & Modals
- `AutoModeOptInDialog.tsx`
- `BridgeDialog.tsx`
- `BypassPermissionsModeDialog.tsx`
- `ChannelDowngradeDialog.tsx`
- `ClaudeMdExternalIncludesDialog.tsx`
- `CostThresholdDialog.tsx`
- `DevChannelsDialog.tsx`
- `ExportDialog.tsx`
- `GlobalSearchDialog.tsx`
- `HistorySearchDialog.tsx`
- `IdeAutoConnectDialog.tsx`
- `IdeOnboardingDialog.tsx`
- `IdleReturnDialog.tsx`
- `InvalidConfigDialog.tsx`
- `InvalidSettingsDialog.tsx`
- `MCPServerApprovalDialog.tsx`
- `MCPServerDesktopImportDialog.tsx`
- `MCPServerMultiselectDialog.tsx`
- `RemoteEnvironmentDialog.tsx`
- `TeleportRepoMismatchDialog.tsx`
- `TrustDialog` (directory)
- `WorkflowMultiselectDialog.tsx`
- `WorktreeExitDialog.tsx`
- `ManagedSettingsSecurityDialog` (directory)

## 2. Visualizations & Content Display
- `ContextVisualization.tsx`
- `ContextSuggestions.tsx`
- `DiagnosticsDisplay.tsx`
- `FileEditToolDiff.tsx`
- `FilePathLink.tsx`
- `HighlightedCode.tsx`
- `Markdown.tsx`
- `MarkdownTable.tsx`
- `Message.tsx` (and variants: `MessageRow.tsx`, `MessageResponse.tsx`, `Messages.tsx`)
- `VirtualMessageList.tsx`
- `SessionPreview.tsx`
- `SessionSummary.tsx`
- `CompactSummary.tsx`
- `StructuredDiff.tsx`
- `StructuredDiffList.tsx`
- `TaskListV2.tsx`
- `SandboxViolationExpandedView.tsx`
- `ValidationErrorsList.tsx`

## 3. Progress, Spinners & Indicators
- `AgentProgressLine.tsx`
- `BashModeProgress.tsx`
- `CompactProgressBar.tsx`
- `EffortIndicator.ts`
- `IdeStatusIndicator.tsx`
- `MemoryUsageIndicator.tsx`
- `Spinner.tsx`
- `Stats.tsx`
- `PrBadge.tsx`
- `TokenWarning.tsx`

## 4. Pickers, Selectors & Inputs
- `BaseTextInput.tsx` / `TextInput.tsx` / `VimTextInput.tsx`
- `SearchBox.tsx`
- `EffortPicker.tsx`
- `LanguagePicker.tsx`
- `LogSelector.tsx`
- `LogoPicker.tsx`
- `MessageSelector.tsx`
- `ModelPicker.tsx`
- `OutputStylePicker.tsx`
- `ThemePicker.tsx`
- `CustomSelect` (directory)

## 5. Teleport & Remote Components
- `TeleportError.tsx`
- `TeleportProgress.tsx`
- `TeleportRepoMismatchDialog.tsx`
- `TeleportResumeWrapper.tsx`
- `TeleportStash.tsx`
- `RemoteCallout.tsx`
- `RemoteEnvironmentDialog.tsx`

## 6. Full Screens (`src/screens/`)
- `Doctor.tsx`
- `REPL.tsx`
- `ResumeConversation.tsx`

## 7. Setup & Flow Components
- `ApproveApiKey.tsx`
- `ClaudeInChromeOnboarding.tsx`
- `DesktopHandoff.tsx`
- `ExitFlow.tsx`
- `Feedback.tsx`
- `FullscreenLayout.tsx`
- `Onboarding.tsx`
- `StartupScreen.ts`

## 8. Tool UI Components
- `FallbackToolUseErrorMessage.tsx`
- `FallbackToolUseRejectedMessage.tsx`
- `FileEditToolUpdatedMessage.tsx`
- `FileEditToolUseRejectedMessage.tsx`
- `NotebookEditToolUseRejectedMessage.tsx`
- `ToolUseLoader.tsx`

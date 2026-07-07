# Missing Droid Security Settings Triage

Based on the OpenClaude source code, here are the security blocks, Trust Dialogs, filesystem CHMOD enforcements, and user permission mechanisms we may have missed:

## 1. Filesystem Path Defenses (Path Canonicalization & Bypass Prevention)
Located in `src/utils/permissions/filesystem.ts`:
* **Path Traversal Blocking**: Uses rigorous `normalize()` on paths prior to checking permissions to stop `..` directory traversal bypassing (e.g., `scratchpad/../../../etc/passwd`).
* **Case Sensitivity Defenses**: Enforces lowercase normalization for paths on case-insensitive filesystems to stop mixed-case security bypasses.
* **UNC Path Blocking**: Strict blocking of paths starting with `\\` or `//` to prevent unauthorized access to network resources.
* **Suspicious Windows Patterns**: Blocks Windows path anomalies that could bypass security, such as device names, trailing dots, and trailing spaces.
* **`.git` Hard Block**: Strict blocking of `.git` folder access, including malicious permutations like `.git.` to avoid basic string-matching bypasses.

## 2. CHMOD Enforcements and Secure Temporary Files
Located in `src/utils/permissions/filesystem.ts`:
* **Strict CHMOD Enforcement**: Scratchpad and temporary directories are recursively created using secure permissions: `mode: 0o700` (owner-only access).
* **Multi-user Conflict Prevention**: Unix temporary paths incorporate the user ID (e.g., `claude-{uid}`) to isolate users and prevent cross-user permission conflicts.
* **Random Nonces**: Uses per-process random nonces in temporary file paths as a load-bearing defense against predict-and-overwrite attacks.

## 3. Trust Dialogs & Session Mechanisms
Located in `src/bootstrap/state.ts`:
* **Home Directory Trust Dialog (`sessionTrustAccepted`)**: When running in the user's home directory, a trust dialog is shown, but the acceptance flag is session-only and never persisted to disk.
* **Bypass Permission Modes (`sessionBypassPermissionsMode`)**: A session-only boolean flag to bypass standard permission prompts safely.
* **Dangerous Permission Modes (`sessionDangerousPermissionMode`)**: Distinguishes between `'bypassPermissions'` and `'fullAccess'` for strict capability control.
* **Plugin Trust Model**: A separate trust model (using the `'plugin'` tag) that enforces marketplace verification combined with policy right flags.

## 4. Enterprise MDM and Policy Mechanisms
Located in `src/utils/settings/mdm/settings.ts` and `src/utils/settings/pluginOnlyPolicy.ts`:
* **MDM Policy Enforcement**: Reads enterprise settings from OS-level configurations (macOS `com.anthropic.claudecode` preference domain, Windows `HKLM/HKCU`, Linux `/etc/claude-code/managed-settings.json`).
* **Priority Routing**: "First source wins" logic applied from highest (remote/admin) to lowest (user/HKCU) priority.
* **Fault-Tolerant Rule Validation**: Filters out individual invalid permission rules from MDM prior to schema validation, ensuring a single malformed rule doesn't fail the entire MDM payload.
* **Admin Trusted Sources**: Certain configuration origins are explicitly flagged as `ADMIN_TRUSTED_SOURCES`, allowing them to bypass the standard `strictPluginOnlyCustomization` restriction.

# NAME
CL0-ACCESS-POLICIES - Level-0 Runtime Firewall Configuration Manual

# SYNOPSIS
The `access-policies.js` file defines hardware-level protection and resource limits for the Intel J3455 platform.

# CONFIGURATION SECTIONS

## 1. WEBDAV (OOB STREAMING & PERSISTENCE)
Defines the Out-of-Band (OOB) interface for persistent logging. Essential for post-mortem analysis when the browser crashes due to J3455 resource exhaustion.

**Example Configuration:**
```javascript
webdav: {
    // WebDAV endpoint for log accumulation
    endpoint: 'http://webdav-server.iguanodon-halosaur.ts.net',
    // Credentials for admin:admin
    auth: 'Basic YWRtaW46YWRtaW4=',
    // Circular buffer threshold for FIFO rotation
    max_size: 261120 // 255KB exactly
}
```

## 2. CONSOLE (FLOOD CONTROL & HARDWARE PROTECTION)
Managed WebKit console driver. Unlike standard loggers, it monitors system pressure (FPS/Memory) and restricts access based on **Caller Identity**. It prevents GPU memory spikes caused by rendering long log lists.

**Example Configuration:**
```javascript
console: {
    // Force console.clear() every 200 lines to free GPU shared RAM
    max_count: 200,
    // Flag to enable/disable OOB WebDAV streaming
    flush_mode: true,
    // Flag to mute browser output (logs still go to WebDAV)
    mute: false,
    // Primary filter mode: 'caller' (who calls), not 'content' (what is said)
    filter_mode: 'caller',
    // Dynamic Blacklist/Whitelist based on Caller Modules
    blacklist: {
        on: true,
        caller: ['vendor/*', 'ad-engine/*'] // Block specific spammy modules
    },
    whitelist: {
        on: true,
        caller: ['core/*', 'CBoot.js'] // Always prioritize system logs
    }
}
```

## 3. WEBKIT FUNCTIONAL GROUPS
Methods are grouped to minimize policy complexity.
**Example Mapping:**
```javascript
mapping: {
    ev: ['addEventListener', 'removeEventListener', 'dispatchEvent'],
    cn: ['log', 'warn', 'error', 'info', 'clear'],
    nt: ['fetch', 'localStorage']
}
```

# RULE SYNTAX & EVALUATION

## RULE PROPERTIES
*   **policy**: `free` | `audit` | `block`.
*   **operand**: `&&` (default) | `||`.
*   **group**: Array of groups (e.g., `['cn', 'ev']`).
*   **target**: `['ShadowDOM']` for scope-restricted access.
*   **caller**: Object identifying the source: `{fileName, filePath, ClassName, methodName}`.
    *   **Logic**: Use `!` for NOT (e.g., `filePath: "!core/*"`).

# USAGE EXAMPLES

### Example: Console Flood Protection
If a component spams the console, its access is downgraded to `audit` or `block` to save CPU.
```javascript
{
    policy: 'block',
    group: ['cn'],
    caller: [{ ClassName: "CCompInstance" }],
    comment: "Stop console spam from specific instances"
}
```

### Example: Global I/O Restriction
Block all network/storage calls for everything except the core engine.
```javascript
{
    policy: 'block',
    group: ['nt'],
    caller: [{ filePath: "!core/*" }]
}
```

# EVALUATION ORDER
1.  **Block Rules**: Evaluated first (Top Priority).
2.  **Free Rules**: Evaluated if no block match.
3.  **Audit Rules**: Logs violation but allows execution if `CL0.debug` is on.
4.  **Defaults**: `CL0_POLICIES.defaults.policy` (Recommended: `block`).

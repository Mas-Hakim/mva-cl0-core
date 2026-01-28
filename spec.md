# MVA 2026: Level-0 System Architecture (ADR-CL0)

## 1. System Manual: `@/memory-bank/CL0-man.md`

# NAME
CL0 - Level-0 WebKit Managed Driver for MVA 2026

# SYNOPSIS
CL0 is a privileged system-level driver providing controlled access to WebKit/DOM APIs. It enforces hardware safety for Intel J3455 processors and prevents architectural drift.

# DESCRIPTION
The CL0 module implements a "Microkernel" pattern. It intercepts raw browser methods and redirects them through a validation and optimization layer. Any direct access to patched WebKit methods is treated as a security violation.

# PUBLIC METHODS

## EVENT MANAGEMENT
* **CL0.ev.listen(target, type, handler, options)**
    Authorized replacement for `addEventListener`. Registers the caller into the system entity tracker.
* **CL0.ev.mute(target, type, handler)**
    Authorized replacement for `removeEventListener`.

## COMMUNICATION
* **CL0.ev.emit(target, eventObject)**
    Controlled wrapper for `dispatchEvent`. Validates event structure against MVA core schemas.
* **CL0.ev.create(type, detail)**
    Secure factory for `CustomEvent`. Injects tracking metadata.

## LOGGING & PERSISTENCE
* **CL0.log.stream(channel, payload)**
    Direct OOB stream to WebDAV. Channels: `err_warn`, `log`, `info`.
    Implements a 255KB circular buffer (FIFO).
* **CL0.log.clear()**
    Flushes the browser console (native clear) and resets memory buffers.

## RESOURCE MONITORING
* **CL0.sys.stat(metrics)**
    Privileged write-access for `AppState` to update `sys_fps`, `sys_longtasks`, and `sys_memory`.
    Returns current hardware pressure status.

# READ-ONLY PROPERTIES
* **CL0.sys_fps**: current system FPS (via AppState).
* **CL0.sys_longtasks**: count of detected long tasks.
* **CL0.sys_memory**: current JS heap usage.

# USAGE EXAMPLES
```javascript
// Registering a button click via CL0
CL0.ev.listen(this.btn, 'click', (e) => this.handle(e));

// Streaming logs to WebDAV
CL0.log.stream('err_warn', { fatal: "HW_PRESSURE", details: "FPS < 20" });

// Updating system metrics (Authorized for AppState only)
CL0.sys.stat({ fps: 60, memory: 128, longtasks: 2 });
```

---

## 2. Blueprint: WebDAV Console Streamer (FIFO 255KB)

```javascript
/**
 * CL0: OOB WebDAV Logger logic
 * Concept: Circular Buffer with FIFO rotation
 */
class CL0LogStreamer {
    constructor() {
        this.LIMIT = 255 * 1024; // 255KB limit
        this.buffer = "";
        this._isSyncing = false;
    }

    push(channel, data) {
        const entry = `[${new Date().toISOString()}] [${channel}] ${JSON.stringify(data)}\n`;
        this.buffer += entry;

        // FIFO Rotation: if size > 255KB, remove from head
        if (this.buffer.length > this.LIMIT) {
            this.buffer = this.buffer.slice(this.buffer.length - this.LIMIT);
            // Ensure we don't cut in the middle of a line
            this.buffer = this.buffer.slice(this.buffer.indexOf('\n') + 1);
        }

        this.sync(channel);
    }

    async sync(channel) {
        if (this._isSyncing) return;
        this._isSyncing = true;
        // Uses OOB-Client-API (WebDAV PUT) to persist circular buffer
        // Endpoint: /webdav/logs/${channel}.log
        this._isSyncing = false;
    }
}
```

---

## 3. Blueprint: ADR-CL0 for `cline:kwaipilot/kat-coder-pro`

**Status:** Proposed (Strict Enforcement)
**Hardware Target:** Intel J3455 (Integrated GPU, Shared RAM).
**Decision:**
- Centralize all WebKit interactions into `CL0.js`.
- Hard-lock `CL0._debug` as a non-writable constant.
- Replace "Safe" terminology with Unix-style naming (`listen`, `emit`, `mute`).
- Implement `console.clear()` threshold at 200 lines to prevent GPU memory spikes.
**Consequences:**
- Direct `window` or `console` calls trigger `CL0:FATAL_ERROR` (Dev) or `CL0:WARN` (Prod).
- Forced adherence to `/memory-bank/CL0-man.md`.

---

## 4. Prompt for AI Agent (`cline:kwaipilot/kat-coder-pro`)

**Role:** Senior Systems Architect / CL0 Guardian
**Objective:** Maintain Level-0 (CL0) integrity and prevent architectural drift.

**Instruction:**
You are the CL0 Guardian. Your primary objective is to enforce the Level-0 WebKit access protocol.

1. **PROHIBITED:** Never use native `addEventListener`, `dispatchEvent`, or `console.log`. Any occurrence of these in `v-088` is an architectural violation.
2. **CL0 USAGE:** Use only `CL0.ev.listen`, `CL0.ev.emit`, and `CL0.log.stream` as defined in `/memory-bank/CL0-man.md`.
3. **LOGGING:** If the console exceeds 200 lines, you must invoke `CL0.log.clear()`.
4. **FATAL ERRORS:** When a violation is detected (debug mode), generate:
   `[CL0:FATAL_ERROR:] {fatal:"PROTCTD_WEBKT_METD_CALL", message:"Restricted module try to call native method; Ref: /memory-bank/CL0-man.md"}`
5. **MONITORING:** Ensure `AppState` updates `CL0.sys.stat()` every 2 seconds.

---

## 5. Implementation Task-Chain

1. **[Refactor]** Decouple `CDefinitions.js`: move schemas to `core/lib/schemas.js` and methods to `core/lib/cdef-methods.js`.
2. **[Deploy]** Place `CL0.js` in the root (outside v-088) and load it as the first script in `<head>`.
3. **[Kernel Init]** Implement `CL0` singleton with `Object.defineProperty` for `sys_fps`, `sys_memory`, and `sys_longtasks`.
4. **[Lockdown]** Patch `window.addEventListener`, `window.CustomEvent`, and `console` using the CL0 proxy logic (Fatal/Warn logic).
5. **[Verification]** Run the audit `grep` commands to ensure zero native calls in the application layer.

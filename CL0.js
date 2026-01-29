// CL0 core — пример вставки/замены
class CL0 {
  // hardcoded defaults
  static lock = false;   // default locked state (false = unlocked)
  static debug = true;   // audit view by default

  static ev = {
    listen(target, type, handler, options) {
      return CL0._handleCall('ev.listen', () => target.addEventListener(type, handler, options));
    },
    mute(target, type, handler) {
      return CL0._handleCall('ev.mute', () => target.removeEventListener(type, handler));
    },
    emit(target, event) {
      return CL0._handleCall('ev.emit', () => target.dispatchEvent(event));
    },
    create(type, detail) {
      return CL0._handleCall('ev.create', () => new CustomEvent(type, { detail }));
    }
  };

  static log = new (class {
    constructor() {
      this.LIMIT = 255 * 1024; // 255 KB limit (bytes)
      this.encoder = new TextEncoder();
      this.entries = []; // {text, bytes}
      this.byteCount = 0;
      this._isSyncing = false;

      // configurable WebDAV endpoint (set before use)
      this.endpoint = null; // e.g. 'https://webdav.example.com/path/to/log.txt'
      this.authHeader = null; // optional 'Basic ...' or other header value
    }

    _ensureLimitFor(newBytes) {
      while (this.byteCount + newBytes > this.LIMIT && this.entries.length) {
        const removed = this.entries.shift();
        this.byteCount -= removed.bytes;
      }
      // If single entry exceeds limit, drop everything and keep last partial by truncating text
      if (newBytes > this.LIMIT) {
        // truncate new entry to fit limit (best-effort by characters)
        return false; // indicate caller should trim or skip (we will let caller handle)
      }
      return true;
    }

    push(channel, data) {
      const ts = new Date().toISOString();
      const entry = `[${ts}] [${channel}] ${JSON.stringify(data)}\n`;
      let bytes = this.encoder.encode(entry).length;

      if (bytes > this.LIMIT) {
        // entry too large — truncate JSON stringified payload to fit (simple approach)
        const maxPayloadBytes = Math.max(0, this.LIMIT - this.encoder.encode(`[${ts}] [${channel}] `).length - 1);
        let payloadStr = JSON.stringify(data);
        // trim payloadStr until fit
        while (this.encoder.encode(payloadStr).length > maxPayloadBytes && payloadStr.length > 0) {
          payloadStr = payloadStr.slice(0, -64);
        }
        const truncatedEntry = `[${ts}] [${channel}] ${payloadStr}\n`;
        bytes = this.encoder.encode(truncatedEntry).length;
        this._ensureLimitFor(bytes);
        this.entries.push({ text: truncatedEntry, bytes });
        this.byteCount += bytes;
      } else {
        this._ensureLimitFor(bytes);
        this.entries.push({ text: entry, bytes });
        this.byteCount += bytes;
      }

      // attempt sync in background
      this.sync(channel).catch(() => { /* silent; retry logic inside */ });
    }

    async sync(channel) {
      if (!this.endpoint) return; // nothing to do without endpoint
      if (this._isSyncing) return;
      if (this.entries.length === 0) return;

      this._isSyncing = true;
      const maxAttempts = 3;
      let attempt = 0;
      const combined = this.entries.map(e => e.text).join('');
      const body = combined;
      const headers = {};
      if (this.authHeader) headers['Authorization'] = this.authHeader;
      headers['Content-Type'] = 'text/plain;charset=utf-8';

      while (attempt < maxAttempts) {
        try {
          const res = await fetch(this.endpoint, {
            method: 'PUT',
            headers,
            body
          });
          if (res.ok) {
            // on success clear buffer
            this.entries = [];
            this.byteCount = 0;
            this._isSyncing = false;
            return;
          } else {
            // non-200 — treat as transient
            attempt++;
            await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
          }
        } catch (err) {
          attempt++;
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
      }

      // failed after retries — keep entries for next attempt
      this._isSyncing = false;
      // optionally, could mark last attempt timestamp or count to avoid busy-looping
    }

    clear() {
      try { console.clear(); } catch (e){ /* ignore */ }
      this.entries = [];
      this.byteCount = 0;
    }
  })();

  static _getCallerInfo(depth = 3) {
    // try to parse Error stack to get module:line info
    try {
      const err = new Error();
      const stack = err.stack || '';
      const lines = stack.split('\n').map(l => l.trim()).filter(Boolean);
      // pick a line a few frames up (depth)
      if (lines.length > depth) {
        const info = lines[depth];
        return info; // raw string like "at fn (file.js:line:col)" — caller can parse further
      }
      return lines[lines.length - 1] || '';
    } catch (e) {
      return '';
    }
  }

  static _handleCall(label, nativeFn) {
    const lock = CL0.lock;
    const debug = CL0.debug;
    const callerInfo = CL0._getCallerInfo(4);

    if (lock) {
      if (debug) {
        // strict debug: throw fatal
        throw new Error(`CL0:FATAL_ERROR - restricted call to ${label} — caller: ${callerInfo}`);
      } else {
        // production locked: warn and ignore
        try { console.warn(`CL0:restricted webkit call ignored: ${label}`); } catch (e) {}
        return undefined;
      }
    } else {
      // unlocked
      if (debug) {
        // audit view: warn with refactor needed + allow call
        try {
          console.warn(`CL0:wrong call (audit) — refactor needed ${label} ; caller: ${callerInfo}`);
        } catch (e) {}
        // allow access
        return nativeFn();
      } else {
        // unlocked + normal mode: warn restricted and ignore
        try { console.warn(`CL0:restricted webkit call: ignored ${label}`); } catch (e) {}
        return undefined;
      }
    }
  }

  // sys.stat skeleton (preserve original API)
  static sys = {
    stat(metrics) {
      return CL0._handleCall('sys.stat', () => {
        // here you'd update internal metrics (AppState only in final system)
        CL0._lastMetrics = metrics;
        return { status: 'ok' };
      });
    }
  };
}

// Usage: configure webdav endpoint before using CL0.log.stream
// CL0.log.endpoint = 'https://webdav.example.com/path/log.txt';
// CL0.log.authHeader = 'Basic ...';

// default hardcoded (already set above)
// CL0.lock = false;
// CL0.debug = true;

export default CL0;

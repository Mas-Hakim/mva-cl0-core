# NAME
CL0 - Level-0 WebKit Managed Driver for MVA 2026

# SYNOPSIS
CL0 is a privileged driver providing controlled access to WebKit APIs. Optimized for Intel J3455 hardware.

# PUBLIC METHODS
* **CL0.ev.listen(target, type, handler, options)**: Native `addEventListener` replacement.
* **CL0.ev.mute(target, type, handler)**: Native `removeEventListener` replacement.
* **CL0.ev.emit(target, event)**: Native `dispatchEvent` replacement.
* **CL0.ev.create(type, detail)**: Native `new CustomEvent` replacement.
* **CL0.log.stream(channel, payload)**: Circular WebDAV logger (255KB FIFO). Channels: log, warn, error, info.
* **CL0.log.clear()**: Resets browser console and internal buffers.
* **CL0.sys.stat(metrics)**: Writes FPS, memory, and longtasks data. Reserved for `AppState`.

# CONSTRAINTS
Direct calls to native `window` or `console` methods trigger `CL0:FATAL_ERROR`.
Console is automatically cleared every 200 lines to prevent GPU memory overflow.

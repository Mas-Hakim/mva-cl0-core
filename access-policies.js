/**
 * CL0 Access Policies: Rule-Based Engine
 * Focus: Access Rules, Caller Validation, ShadowDOM protection
 */

export const CL0_POLICIES = {
    // 1. WebDAV & Console (Management Layer)
    webdav: {
        endpoint: 'http://webdav-server.iguanodon-halosaur.ts.net',
        auth: 'Basic YWRtaW46YWRtaW4=',
        max_size: 255 * 1024
    },
    console: {
        max_count: 200,      // Threshold for auto-clear
        flush_mode: true,    // Stream to webdav
        filter_mode: 'caller', // Filter based on caller identity, not content
        flags: { mute: false, audit: true }
    },

    // 2. Access Rules Engine (The Core Goal)
    // Defaults: if no rule matches, policy = 'block'
    defaults: { policy: 'block' },

    rules: [
        // RULE 1: Core Trusted Access (Whitelisting)
        {
            policy: 'free',
            operand: '||',
            caller: [
                { filePath: "core/*" },
                { fileName: "CBoot.js" }
            ],
            comment: "Full access for core engine"
        },

        // RULE 2: Component Event Protection (ShadowDOM Enforcement)
        {
            policy: 'free',
            operand: '&&',
            group: ['ev'],
            method: ['addEventListener', 'removeEventListener'],
            caller: [{ filePath: "v-088/components/*" }],
            target: ['ShadowDOM'], // Special identifier for CL0 logic
            comment: "Components allowed to touch ONLY their own ShadowDOM events"
        },

        // RULE 3: Global Console Audit
        {
            policy: 'audit',
            group: ['cn'],
            caller: [{ fileName: "*" }],
            comment: "All console calls are allowed but logged for audit"
        },

        // RULE 4: Blacklist - Block specific instance calls
        {
            policy: 'block',
            caller: [{ ClassName: "CCompInstance" }],
            comment: "Explicit block for dangerous instances"
        },

        // RULE 5: Network/FS Lockdown
        {
            policy: 'block',
            group: ['nt'],
            caller: [{ filePath: "!core/*" }],
            comment: "Block all network/storage calls for non-core modules"
        }
    ],

    // 3. WebKit Groups Definition
    mapping: {
        ev: ['addEventListener', 'removeEventListener', 'dispatchEvent', 'CustomEvent'],
        dm: ['createElement', 'appendChild', 'querySelector', 'innerHTML'],
        tm: ['setInterval', 'setTimeout', 'requestAnimationFrame'],
        cn: ['log', 'warn', 'error', 'info', 'clear'],
        nt: ['fetch', 'XMLHttpRequest', 'localStorage', 'indexedDB'],
        st: ['sys.stat'],
        nv: ['userAgent', 'geolocation'],
        md: ['getUserMedia', 'enumerateDevices', 'CL0.log.stream']
    }
};

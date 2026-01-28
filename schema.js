/**
 * MVA 2026 Core Schemas (Isolated from logic)
 */
export const SCHEMAS = Object.freeze({
    MESSAGE_SCHEMA: {
        id: 'string',
        port: 'string',
        timestamp: 'number',
        sender: 'string',
        detail: 'object'
    },
    PORT_SCHEMA: {
        private: 'boolean',
        proxy: 'string|null'
    },
    // ... остальные схемы (STATE_SHOT_SCHEMA, etc)
});

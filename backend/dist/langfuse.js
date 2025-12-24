import { Langfuse } from 'langfuse';
import { config } from './config.js';
let langfuse = null;
export function initLangfuse() {
    if (!config.langfuse.enabled) {
        console.log('[Langfuse] Disabled (no API keys set)');
        return;
    }
    try {
        langfuse = new Langfuse({
            secretKey: config.langfuse.secretKey,
            publicKey: config.langfuse.publicKey,
            baseUrl: config.langfuse.baseUrl,
        });
        console.log('[Langfuse] Initialized and ready for tracing');
    }
    catch (error) {
        console.error('[Langfuse] Failed to initialize:', error);
        langfuse = null;
    }
}
export function getLangfuse() {
    return langfuse;
}
/**
 * Create a trace for a user query and response.
 * Automatically handles async flushing.
 */
export async function traceQuery(query, response, language, metadata) {
    if (!langfuse) {
        return;
    }
    try {
        const trace = langfuse.trace({
            name: 'civil_status_query',
            input: { query, language },
            output: { response },
            userId: metadata?.userId,
            sessionId: metadata?.sessionId,
            metadata: {
                language,
                responseLength: response.length,
                ...metadata,
            },
        });
        // Optionally log the trace ID
        console.log(`[Langfuse] Trace created: ${trace.id}`);
    }
    catch (error) {
        console.error('[Langfuse] Failed to trace query:', error);
        // Don't throw - tracing should not break the main flow
    }
}
/**
 * Flush pending traces to Langfuse.
 * Call this before shutdown.
 */
export async function flushLangfuse() {
    if (!langfuse) {
        return;
    }
    try {
        await langfuse.flush();
        console.log('[Langfuse] Traces flushed successfully');
    }
    catch (error) {
        console.error('[Langfuse] Failed to flush traces:', error);
    }
}
//# sourceMappingURL=langfuse.js.map
import { Langfuse } from 'langfuse';
export declare function initLangfuse(): void;
export declare function getLangfuse(): Langfuse | null;
export interface TraceMetadata {
    userId?: string;
    sessionId?: string;
    [key: string]: unknown;
}
/**
 * Create a trace for a user query and response.
 * Automatically handles async flushing.
 */
export declare function traceQuery(query: string, response: string, language: 'ar' | 'en', metadata?: TraceMetadata): Promise<void>;
/**
 * Flush pending traces to Langfuse.
 * Call this before shutdown.
 */
export declare function flushLangfuse(): Promise<void>;
//# sourceMappingURL=langfuse.d.ts.map
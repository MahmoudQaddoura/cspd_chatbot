export interface RetrievedDocument {
    id: string;
    content: string;
    metadata?: Record<string, unknown>;
}
export type IntentType = 'service' | 'general';
/**
 * Classify the user's query intent using a fast, lightweight model call.
 * Returns 'service' for government service queries, 'general' for greetings/small talk.
 */
export declare function classifyIntent(query: string): Promise<IntentType>;
export declare function streamChatWithRetrieval(userQuery: string, systemPrompt: string, language?: 'ar' | 'en'): AsyncGenerator<string, void, unknown>;
export declare function detectLanguage(text: string): 'ar' | 'en';
/**
 * Stream a direct response without knowledge base retrieval.
 * Used for greetings and general conversation.
 */
export declare function streamDirectResponse(userQuery: string, systemPrompt: string, language?: 'ar' | 'en'): AsyncGenerator<string, void, unknown>;
export declare function retrieveDocuments(_query: string, _topK?: number): Promise<RetrievedDocument[]>;
//# sourceMappingURL=vector.d.ts.map
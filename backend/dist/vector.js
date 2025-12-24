import OpenAI from 'openai';
import { config } from './config.js';
const openai = new OpenAI({
    apiKey: config.openaiApiKey,
});
const cachedAssistants = new Map();
/**
 * Classify the user's query intent using a fast, lightweight model call.
 * Returns 'service' for government service queries, 'general' for greetings/small talk.
 */
export async function classifyIntent(query) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Classify the user's query intent. Return ONLY one word:
- "service" if the query is about government services, documents, procedures, requirements, fees, locations, or any official service
- "general" if the query is a greeting, small talk, thanks, or unrelated to government services

Examples:
- "مرحبا" → general
- "hello" → general  
- "شكرا" → general
- "كيف اجدد جواز السفر" → service
- "what documents do I need for ID" → service
- "ما هي رسوم تجديد رخصة القيادة" → service
- "how are you" → general`,
                },
                {
                    role: 'user',
                    content: query,
                },
            ],
            max_tokens: 10,
            temperature: 0,
        });
        const result = response.choices[0]?.message?.content?.trim().toLowerCase();
        return result === 'service' ? 'service' : 'general';
    }
    catch (error) {
        console.error('[Intent] Classification failed, defaulting to service:', error);
        return 'service';
    }
}
async function getOrCreateAssistant(systemPrompt, language) {
    const cacheKey = `rag_${language}`;
    const existingId = cachedAssistants.get(cacheKey);
    if (existingId) {
        try {
            await openai.beta.assistants.retrieve(existingId);
            return existingId;
        }
        catch {
            cachedAssistants.delete(cacheKey);
        }
    }
    const assistantName = language === 'ar'
        ? 'Government Services RAG (Arabic)'
        : 'Government Services RAG (English)';
    const assistant = await openai.beta.assistants.create({
        name: assistantName,
        instructions: systemPrompt,
        model: config.openaiModel,
        tools: [{ type: 'file_search' }],
        tool_resources: {
            file_search: {
                vector_store_ids: [config.vectorStoreId],
            },
        },
    });
    cachedAssistants.set(cacheKey, assistant.id);
    console.log(`[Assistant] Created new RAG ${language} assistant: ${assistant.id}`);
    return assistant.id;
}
export async function* streamChatWithRetrieval(userQuery, systemPrompt, language = 'ar') {
    try {
        const assistantId = await getOrCreateAssistant(systemPrompt, language);
        const thread = await openai.beta.threads.create({
            messages: [
                {
                    role: 'user',
                    content: userQuery,
                },
            ],
        });
        console.log(`[Thread] Created thread: ${thread.id} (${language}) for query: "${userQuery.substring(0, 50)}..."`);
        const stream = openai.beta.threads.runs.stream(thread.id, {
            assistant_id: assistantId,
            max_completion_tokens: 2000,
        });
        for await (const event of stream) {
            if (event.event === 'thread.message.delta') {
                const delta = event.data.delta;
                if (delta.content) {
                    for (const block of delta.content) {
                        if (block.type === 'text' && block.text?.value) {
                            yield block.text.value;
                        }
                    }
                }
            }
            if (event.event === 'thread.run.failed') {
                const error = event.data.last_error;
                console.error('[Run Failed]', error);
                throw new Error(error?.message || 'Run failed');
            }
            if (event.event === 'thread.run.requires_action') {
                console.log('[Run] Requires action - file search in progress');
            }
        }
        try {
            await openai.beta.threads.del(thread.id);
        }
        catch (cleanupErr) {
            console.warn('[Cleanup] Failed to delete thread:', cleanupErr);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('[Stream Error]', error.message);
            if (error.message.includes('invalid_api_key')) {
                throw new Error('Invalid OpenAI API key');
            }
            if (error.message.includes('vector_store')) {
                throw new Error('Vector store not found or inaccessible');
            }
        }
        throw error;
    }
}
export function detectLanguage(text) {
    const arabicRegex = /[\u0600-\u06FF]/g;
    const arabicMatches = text.match(arabicRegex) || [];
    return arabicMatches.length > text.length * 0.1 ? 'ar' : 'en';
}
/**
 * Stream a direct response without knowledge base retrieval.
 * Used for greetings and general conversation.
 */
export async function* streamDirectResponse(userQuery, systemPrompt, language = 'ar') {
    try {
        console.log(`[Direct] Streaming direct response for: "${userQuery.substring(0, 50)}..." (${language})`);
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: userQuery,
                },
            ],
            max_tokens: 300,
            temperature: 0.7,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error('[Direct Error]', error.message);
        }
        throw error;
    }
}
export async function retrieveDocuments(_query, _topK = 5) {
    console.log(`[Vector] Using Vector Store ID: ${config.vectorStoreId} for semantic search`);
    return [];
}
//# sourceMappingURL=vector.js.map
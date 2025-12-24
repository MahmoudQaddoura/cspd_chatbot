import { Request, Response } from 'express';
import { retrieveDocuments, generateAnswer } from './rag.js';
import { traceQuery } from './langfuse.js';

function detectLanguage(text: string): 'ar' | 'en' {
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
}

interface AskRequest {
  query: string;
  language?: 'ar' | 'en';
  sessionId?: string;
}

interface SessionData {
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const sessions = new Map<string, SessionData>();

function getSession(sessionId: string): SessionData {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { history: [] });
  }
  return sessions.get(sessionId)!;
}

function addToHistory(sessionId: string, role: 'user' | 'assistant', content: string): void {
  const session = getSession(sessionId);
  session.history.push({ role, content });
  if (session.history.length > 20) {
    session.history = session.history.slice(-20);
  }
}

function buildContextualQuery(currentQuery: string, history: Array<{ role: 'user' | 'assistant'; content: string }>): string {
  if (history.length < 2) return currentQuery;
  
  const lastAssistantMsg = history.filter(h => h.role === 'assistant').pop();
  const lastUserMsg = history.filter(h => h.role === 'user').slice(-2, -1)[0];
  
  if (lastAssistantMsg && lastUserMsg) {
    const isFollowUp = lastAssistantMsg.content.includes('هل تحمل جواز') || 
                       lastAssistantMsg.content.includes('Do you hold') ||
                       lastAssistantMsg.content.includes('هل ترغب') ||
                       lastAssistantMsg.content.includes('أحتاج أولاً');
    
    if (isFollowUp) {
      const originalQuery = lastUserMsg.content;
      const serviceTerms = originalQuery.match(/(?:جواز سفر|شهادة|بطاقة|passport|certificate|id card)/gi) || [];
      const feeTerms = 'رسوم تكلفة fees';
      return `${originalQuery} ${currentQuery} ${serviceTerms.join(' ')} ${feeTerms}`;
    }
  }
  
  return currentQuery;
}

function getRecentHistory(history: Array<{ role: 'user' | 'assistant'; content: string }>): Array<{ role: 'user' | 'assistant'; content: string }> {
  return history.slice(-6);
}

export async function askHandler(req: Request, res: Response): Promise<void> {
  const { query, language: explicitLanguage, sessionId } = req.body as AskRequest;
  const start = Date.now();

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  const effectiveSessionId = sessionId || `anon_${Date.now()}`;
  const language = explicitLanguage && (explicitLanguage === 'ar' || explicitLanguage === 'en')
    ? explicitLanguage
    : detectLanguage(query);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const session = getSession(effectiveSessionId);
    addToHistory(effectiveSessionId, 'user', query);
    console.log(`[Ask] "${query.substring(0, 50)}..." (${language})`);

    const contextualQuery = buildContextualQuery(query, session.history);
    console.log(`[Ask] Contextual query: "${contextualQuery.substring(0, 80)}..."`);

    const retrieval = await retrieveDocuments(contextualQuery);

    if (!retrieval.hasRelevantContent) {
      const refusal = language === 'ar'
        ? 'عذراً، هذه المعلومة غير متوفرة لدي. يُرجى مراجعة أقرب مكتب لدائرة الأحوال المدنية والجوازات.'
        : "I'm sorry, I don't have this information. Please visit your nearest Civil Status and Passports office.";
      
      res.write(`data: ${JSON.stringify({ token: refusal, done: false })}\n\n`);
      res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
      res.end();
      
      addToHistory(effectiveSessionId, 'assistant', refusal);
      console.log(`[Ask] Refused (low confidence: ${retrieval.confidence.toFixed(2)}) - ${Date.now() - start}ms`);
      traceQuery(query, refusal, language, { sessionId: effectiveSessionId, intent: 'refusal' }).catch(() => {});
      return;
    }

    const recentHistory = getRecentHistory(session.history.slice(0, -1));
    const generator = await generateAnswer(query, retrieval.snippets, language, recentHistory);

    let fullResponse = '';
    for await (const token of generator) {
      fullResponse += token;
      res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
    }
    
    res.write(`data: ${JSON.stringify({ token: '', done: true })}\n\n`);
    res.end();

    addToHistory(effectiveSessionId, 'assistant', fullResponse);
    console.log(`[Ask] Done - ${Date.now() - start}ms`);
    
    traceQuery(query, fullResponse, language, {
      sessionId: effectiveSessionId,
      intent: 'answer',
      confidence: retrieval.confidence
    }).catch(() => {});

  } catch (error) {
    console.error('[Ask] Error:', error);
    const errorMsg = language === 'ar'
      ? 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
      : 'Sorry, an error occurred. Please try again.';
    res.write(`data: ${JSON.stringify({ error: errorMsg, done: true })}\n\n`);
    res.end();
  }
}

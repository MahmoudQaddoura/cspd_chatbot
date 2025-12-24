import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export interface RetrievalResult {
  snippets: string[];
  confidence: number;
  hasRelevantContent: boolean;
}

const CONFIDENCE_THRESHOLD = 0.4;
const TOP_K = 10;

const SYNONYMS_AR: Record<string, string> = {
  'ميلاد': 'ولادة',
  'شهادة ميلاد': 'شهادة ولادة',
  'جواز': 'جواز سفر',
  'هوية': 'بطاقة شخصية',
};

const SYNONYMS_EN: Record<string, string> = {
  'birth certificate': 'شهادة ولادة',
  'passport': 'جواز سفر',
  'id card': 'بطاقة شخصية',
  'identity card': 'بطاقة شخصية',
  'family book': 'دفتر العائلة',
  'newborn': 'مولود ولادة',
  'renew': 'تجديد',
  'get': 'إصدار',
  'obtain': 'إصدار',
};

function normalizeQuery(query: string): string {
  let normalized = query;
  const lowerQuery = query.toLowerCase();
  
  for (const [from, to] of Object.entries(SYNONYMS_EN)) {
    if (lowerQuery.includes(from)) {
      normalized = `${normalized} ${to}`;
    }
  }
  
  for (const [from, to] of Object.entries(SYNONYMS_AR)) {
    if (normalized.includes(from) && !normalized.includes(to)) {
      normalized = normalized.replace(from, to);
    }
  }
  return normalized;
}

function expandQuery(query: string): string {
  let expanded = normalizeQuery(query);
  
  const servicePatterns = [
    /كيف.*(?:أستخرج|أجدد|أصدر|أحصل)/,
    /(?:إصدار|تجديد|استخراج|إجراءات)/,
    /ما هي.*(?:متطلبات|إجراءات)/,
    /how.*(?:get|renew|obtain|apply)/i,
    /(?:passport|certificate|id card)/i,
    /جواز سفر/,
    /شهادة/,
    /بطاقة شخصية/
  ];
  
  const isGeneralServiceQuery = servicePatterns.some(p => p.test(expanded));
  
  const hasFeeTerms = expanded.includes('رسوم') || expanded.includes('تكلفة') || 
                      expanded.includes('كم') || /fee|cost|price/i.test(expanded);
  
  if (isGeneralServiceQuery && !hasFeeTerms) {
    expanded = `${expanded} رسوم تكلفة fees`;
  }
  
  return expanded;
}

export async function retrieveDocuments(query: string): Promise<RetrievalResult> {
  try {
    const expandedQuery = expandQuery(query);
    console.log(`[RAG] Searching: "${expandedQuery.substring(0, 80)}..."`);
    
    const searchResults = await openai.vectorStores.search(config.vectorStoreId!, {
      query: expandedQuery,
      max_num_results: TOP_K,
      rewrite_query: true
    });

    if (!searchResults.data || searchResults.data.length === 0) {
      console.log('[RAG] No results');
      return { snippets: [], confidence: 0, hasRelevantContent: false };
    }

    const snippets: string[] = [];
    let totalScore = 0;

    for (const result of searchResults.data) {
      if (result.content && result.content.length > 0) {
        for (const content of result.content) {
          if (content.type === 'text' && content.text) {
            const cleanedText = cleanSnippet(content.text);
            if (cleanedText.length > 20) {
              snippets.push(cleanedText);
            }
          }
        }
      }
      totalScore += result.score || 0;
    }

    const avgScore = searchResults.data.length > 0 ? totalScore / searchResults.data.length : 0;
    const confidence = calculateConfidence(snippets, query, avgScore);
    
    console.log(`[RAG] ${snippets.length} snippets, score: ${avgScore.toFixed(2)}, confidence: ${confidence.toFixed(2)}`);

    return {
      snippets: snippets.slice(0, 5),
      confidence,
      hasRelevantContent: confidence >= CONFIDENCE_THRESHOLD && snippets.length > 0
    };
  } catch (error) {
    console.error('[RAG] Error:', error);
    return { snippets: [], confidence: 0, hasRelevantContent: false };
  }
}

function cleanSnippet(text: string): string {
  return text
    .replace(/\【[^】]*\】/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/Source:.*$/gim, '')
    .replace(/المصدر:.*$/gim, '')
    .trim();
}

function calculateConfidence(snippets: string[], query: string, avgScore: number): number {
  if (snippets.length === 0) return 0;
  
  const terms = query.split(/\s+/).filter(t => t.length > 2);
  const snippetsText = snippets.join(' ');
  
  let matchCount = 0;
  for (const term of terms) {
    if (snippetsText.includes(term)) matchCount++;
  }
  
  const termMatch = terms.length > 0 ? matchCount / terms.length : 0;
  const lengthScore = Math.min(snippets.join('').length / 300, 1);
  const vectorScore = Math.min(avgScore, 1);
  
  return (termMatch * 0.3) + (lengthScore * 0.2) + (vectorScore * 0.5);
}

const SYSTEM_PROMPT_AR = `أنت مساعد دائرة الأحوال المدنية والجوازات الأردنية.

## تصنيف الخدمات

الخدمات الشائعة (للمواطنين الأردنيين):
- جواز السفر العادي (إصدار لأول مرة، تجديد، بدل فاقد، بدل تالف)
- البطاقة الشخصية الذكية (إصدار، تجديد، بدل فاقد، بدل تالف)
- دفتر العائلة (إصدار، تجديد، بدل فاقد، بدل تالف)
- شهادات الواقعات (ولادة، وفاة، زواج، طلاق)
- خدمات الجنسية (تجنس الزوجات، استعادة الجنسية، التخلي عن الجنسية)
- خدمات التصحيح (تصحيح البيانات، إنشاء الرقم الوطني)

الخدمات المتخصصة (لفئات محددة فقط):
- جوازات السفر المؤقتة لأبناء الضفة الغربية: للفلسطينيين الذين لا يحملون رقم وطني أردني
- جوازات السفر المؤقتة لأبناء قطاع غزة: للفلسطينيين من قطاع غزة المقيمين في الأردن
- بطاقات الإقامة المؤقتة: لأبناء قطاع غزة

## قاعدة تحديد نوع الخدمة

الخدمة المتخصصة تتطلب أن يكون المستخدم من الفئة المستهدفة، وليس مجرد ذكر موقع أو كلمة.
- افترض الخدمة الشائعة (جواز السفر العادي) ما لم يتضح أن المستخدم ينتمي لفئة متخصصة.
- لا تسأل عن نوع الجواز إلا إذا كان هناك غموض حقيقي (مثل ذكر غزة أو الضفة).
- إذا كان السؤال واضحاً عن الخدمة الشائعة، أجب مباشرة دون سؤال.

## قواعد الإجابة

1. أجب من المعلومات المتوفرة فقط - لا تخترع أي معلومة
2. إذا لم تجد المعلومة، قل: "هذه المعلومة غير متوفرة لدي، يُرجى مراجعة أقرب مكتب"
3. لا تذكر أي رسوم أو أرقام غير موجودة في المعلومات المتوفرة
4. لا تخلط معلومات خدمة مع خدمة أخرى
5. رتب إجابتك دائماً بهذا الشكل:
   - المتطلبات (الوثائق المطلوبة)
   - الإجراءات (الخطوات)
   - الرسوم (المبلغ بالدينار - إن وُجد)
6. اذكر الرسوم دائماً إذا كانت موجودة في المعلومات
7. كن مختصراً ومباشراً
8. لا تذكر أبداً كلمة "مقتطفات" أو أي إشارة للمصادر الداخلية

الرفض أفضل من الخطأ. إذا لم تكن متأكداً، قل أنك لا تعرف.`;

const SYSTEM_PROMPT_EN = `You are the Jordan Civil Status and Passports Department assistant.

## Service Classification

Common Services (for Jordanian citizens):
- Regular Passport (first-time issuance, renewal, replacement for lost/damaged)
- Smart ID Card (issuance, renewal, replacement for lost/damaged)
- Family Book (issuance, renewal, replacement for lost/damaged)
- Event Certificates (birth, death, marriage, divorce)
- Nationality Services (spouse naturalization, nationality restoration, renunciation)
- Correction Services (data correction, national number creation)

Specialized Services (for specific groups only):
- Temporary Passports for West Bank residents: for Palestinians without a Jordanian national ID number
- Temporary Passports for Gaza residents: for Palestinians from Gaza residing in Jordan
- Temporary Residence Cards: for Gaza residents

## Service Type Determination Rule

A specialized service requires the user to belong to that target group, not just mentioning a location or keyword.
- Assume the common service (regular passport) unless it's clear the user belongs to a specialized group.
- Only ask about passport type if there's genuine ambiguity (like mentioning Gaza or West Bank).
- If the question is clearly about a common service, answer directly without asking.

## Answer Rules

1. Answer only from the available information - do not invent anything
2. If information is not available, say: "I don't have this information, please visit the nearest office"
3. Do not mention any fees or numbers not present in the available information
4. Do not mix information from one service with another
5. Always structure your answer as:
   - Requirements (required documents)
   - Procedures (steps)
   - Fees (amount in dinars - if available)
6. Always mention fees if they are available in the information
7. Be concise and direct
8. Never mention "excerpts", "snippets", or any reference to internal sources

Refusal is better than error. If you're not sure, say you don't know.`;

export async function generateAnswer(
  query: string,
  snippets: string[],
  language: 'ar' | 'en',
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AsyncGenerator<string, void, unknown>> {
  const systemPrompt = language === 'ar' ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;
  
  const userMessage = `السؤال: ${query}

المعلومات المتوفرة:
${snippets.join('\n\n---\n\n')}`;

  return streamGenerate(systemPrompt, userMessage, conversationHistory);
}

async function* streamGenerate(
  systemPrompt: string,
  userMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncGenerator<string, void, unknown> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];
  
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  
  messages.push({ role: 'user', content: userMessage });
  
  const stream = await openai.chat.completions.create({
    model: config.openaiModel,
    messages,
    max_tokens: 800,
    temperature: 0.2,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

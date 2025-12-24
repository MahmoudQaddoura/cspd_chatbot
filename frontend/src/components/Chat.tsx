import { useState, useRef, useEffect, useCallback } from 'react';
import './Chat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function detectLanguage(text: string): 'ar' | 'en' {
  const arabicRegex = /[\u0600-\u06FF]/g;
  const arabicMatches = text.match(arabicRegex) || [];
  return arabicMatches.length > text.length * 0.1 ? 'ar' : 'en';
}

function getTextDirection(text: string): 'rtl' | 'ltr' {
  if (!text.trim()) return 'rtl';
  const arabicRegex = /[\u0600-\u06FF]/g;
  const arabicMatches = text.match(arabicRegex) || [];
  return arabicMatches.length > text.length * 0.3 ? 'rtl' : 'ltr';
}

function formatMessage(content: string): string {
  let formatted = content;
  
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  const lines = formatted.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/);
    const numberMatch = trimmed.match(/^(\d+)[.)-]\s+(.+)$/);
    
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>');
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
    } else if (numberMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>');
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${numberMatch[2]}</li>`);
    } else {
      if (inList) {
        result.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
        listType = null;
      }
      if (trimmed) {
        result.push(`<p>${trimmed}</p>`);
      } else if (result.length > 0) {
        result.push('<br/>');
      }
    }
  }
  
  if (inList) {
    result.push(listType === 'ol' ? '</ol>' : '</ul>');
  }
  
  return result.join('');
}

const SUGGESTIONS = [
  'كيف أجدد جواز السفر؟',
  'ما هي متطلبات البطاقة الشخصية؟',
  'كيف أستخرج شهادة ميلاد؟',
  'ما هي رسوم الخدمات؟',
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputDirection, setInputDirection] = useState<'rtl' | 'ltr'>('rtl');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setInputDirection(getTextDirection(input));
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    const assistantMessageId = generateId();
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmedInput,
          language: detectLanguage(trimmedInput),
          sessionId: sessionIdRef.current,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(response.status === 500 ? 'خطأ في الخادم' : `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('لا يوجد رد');
      }

      let assistantContent = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6).trim());

              if (data.token) {
                if (assistantContent === '') {
                  setMessages((prev) => [...prev, {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                  }]);
                }
                assistantContent += data.token;
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantMessageId ? { ...m, content: assistantContent } : m)
                );
              }

              if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              if (!(parseError instanceof SyntaxError)) throw parseError;
            }
          }
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      const form = document.querySelector('.chat-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 50);
  };

  return (
    <div className="chat-container" dir="rtl">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <div className="welcome-icon">💬</div>
            <h2>مرحباً! كيف يمكنني مساعدتك؟</h2>
            <p>اختر أحد الأسئلة الشائعة أو اكتب سؤالك</p>
            <div className="suggestions-container">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'user' ? '👤' : '🏛️'}
            </div>
            <div className="message-wrapper">
              {msg.content ? (
                <div 
                  className="message-content"
                  dir={getTextDirection(msg.content)}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              ) : (
                <div className="message-content" dir="rtl">
                  <span className="loading-indicator"></span>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="message assistant">
            <div className="message-avatar">🏛️</div>
            <div className="message-content">
              <span className="loading-indicator"></span>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-form">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب سؤالك هنا... (اضغط Enter للإرسال)"
          disabled={isLoading}
          rows={2}
          className="chat-input"
          dir={inputDirection}
          style={{ textAlign: inputDirection === 'rtl' ? 'right' : 'left' }}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="chat-submit"
        >
          {isLoading ? '...' : 'إرسال'}
        </button>
      </form>
    </div>
  );
}

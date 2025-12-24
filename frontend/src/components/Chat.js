import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './Chat.css';
const API_URL = '';
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
const SUGGESTIONS_AR = [
    'كيف أجدد جواز السفر؟',
    'ما هي متطلبات البطاقة الشخصية؟',
    'كيف أستخرج شهادة ميلاد؟',
    'ما هي رسوم الخدمات؟',
];
const SUGGESTIONS_EN = [
    'How do I renew my passport?',
    'What are the ID card requirements?',
    'How do I get a birth certificate?',
    'What are the service fees?',
];
export default function Chat({ language }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const abortControllerRef = useRef(null);
    const sessionIdRef = useRef(generateSessionId());
    const isRTL = language === 'ar';
    const suggestions = useMemo(() => language === 'ar' ? SUGGESTIONS_AR : SUGGESTIONS_EN, [language]);
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);
    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) {
            return;
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        const userMessage = {
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
            const response = await fetch(`${API_URL}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: trimmedInput,
                    language,
                    sessionId: sessionIdRef.current,
                }),
                signal: abortControllerRef.current.signal,
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(response.status === 500
                    ? (isRTL ? 'خطأ في الخادم. يرجى المحاولة لاحقاً.' : 'Server error. Please try again later.')
                    : errorText || `HTTP ${response.status}`);
            }
            if (!response.body) {
                throw new Error(isRTL ? 'لا يوجد رد من الخادم' : 'No response from server');
            }
            let assistantContent = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            setMessages((prev) => [
                ...prev,
                {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                },
            ]);
            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.slice(6).trim();
                        if (!jsonStr)
                            continue;
                        try {
                            const data = JSON.parse(jsonStr);
                            if (data.token) {
                                assistantContent += data.token;
                                setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId
                                    ? { ...msg, content: assistantContent }
                                    : msg));
                            }
                            if (data.error) {
                                throw new Error(data.error);
                            }
                            if (data.done) {
                                break;
                            }
                        }
                        catch (parseErr) {
                            if (parseErr instanceof SyntaxError) {
                                console.debug('SSE parse skip:', jsonStr);
                            }
                            else {
                                throw parseErr;
                            }
                        }
                    }
                }
            }
            if (!assistantContent) {
                setMessages((prev) => prev.map((msg) => msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: isRTL
                            ? 'المعلومة غير متوفرة حالياً. يرجى المحاولة مرة أخرى.'
                            : 'Information is not currently available. Please try again.',
                    }
                    : msg));
            }
        }
        catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return;
            }
            const errorMsg = err instanceof Error
                ? err.message
                : (isRTL ? 'حدث خطأ غير معروف' : 'An unknown error occurred');
            setError(errorMsg);
            setMessages((prev) => {
                const hasEmptyAssistant = prev.some((m) => m.id === assistantMessageId && !m.content);
                if (hasEmptyAssistant) {
                    return prev.filter((m) => m.id !== assistantMessageId);
                }
                return prev;
            });
        }
        finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };
    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
        setTimeout(() => {
            const form = document.querySelector('.chat-form');
            if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
        }, 50);
    };
    return (_jsxs("div", { className: "chat-container", dir: isRTL ? 'rtl' : 'ltr', children: [_jsxs("div", { className: "messages-container", children: [messages.length === 0 && (_jsxs("div", { className: "welcome-message", children: [_jsx("div", { className: "welcome-icon", children: "\uD83D\uDCAC" }), _jsx("h2", { children: isRTL ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hello! How can I help you?' }), _jsx("p", { children: isRTL
                                    ? 'اختر أحد الأسئلة الشائعة أو اكتب سؤالك'
                                    : 'Choose a common question or type your own' }), _jsx("div", { className: "suggestions-container", children: suggestions.map((suggestion, index) => (_jsx("button", { type: "button", className: "suggestion-chip", onClick: () => handleSuggestionClick(suggestion), children: suggestion }, index))) })] })), messages.map((msg) => (_jsxs("div", { className: `message ${msg.role}`, children: [_jsx("div", { className: "message-avatar", children: msg.role === 'user' ? '👤' : '🏛️' }), _jsx("div", { className: "message-content", children: msg.content || (_jsx("span", { className: "loading-indicator" })) })] }, msg.id))), isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (_jsxs("div", { className: "message assistant", children: [_jsx("div", { className: "message-avatar", children: "\uD83C\uDFDB\uFE0F" }), _jsx("div", { className: "message-content", children: _jsx("span", { className: "loading-indicator" }) })] })), error && (_jsx("div", { className: "error-message", children: error })), _jsx("div", { ref: messagesEndRef })] }), _jsxs("form", { onSubmit: handleSubmit, className: "chat-form", children: [_jsx("textarea", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, placeholder: isRTL
                            ? 'اكتب سؤالك هنا... (اضغط Enter للإرسال)'
                            : 'Type your question here... (Press Enter to send)', disabled: isLoading, rows: 2, className: "chat-input", "aria-label": isRTL ? 'حقل إدخال الرسالة' : 'Message input field' }), _jsx("button", { type: "submit", disabled: isLoading || !input.trim(), className: "chat-submit", "aria-label": isRTL ? 'إرسال الرسالة' : 'Send message', children: isLoading
                            ? '...'
                            : (isRTL ? 'إرسال' : 'Send') })] })] }));
}

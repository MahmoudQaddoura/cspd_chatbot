import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Chat from './components/Chat';
import './App.css';
export default function App() {
    const [language, setLanguage] = useState('ar');
    const toggleLanguage = () => {
        setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'));
    };
    const isRTL = language === 'ar';
    return (_jsxs("div", { className: "app-container", dir: isRTL ? 'rtl' : 'ltr', style: { textAlign: isRTL ? 'right' : 'left' }, children: [_jsxs("header", { className: "app-header", children: [_jsxs("div", { className: "header-brand", children: [_jsx("div", { className: "gov-emblem", children: "\uD83C\uDFDB\uFE0F" }), _jsxs("div", { className: "header-text", children: [_jsx("h1", { children: isRTL ? 'مساعد الخدمات الحكومية' : 'Government Services Assistant' }), _jsx("p", { className: "header-subtitle", children: isRTL
                                            ? 'مساعدك الذكي للإجابة على استفساراتكم'
                                            : 'Your smart assistant for answering inquiries' })] })] }), _jsx("button", { onClick: toggleLanguage, className: "language-toggle", children: isRTL ? 'English' : 'العربية' })] }), _jsx("main", { className: "app-main", children: _jsx(Chat, { language: language }) }), _jsx("footer", { className: "app-footer", children: _jsx("p", { children: isRTL
                        ? '© 2024 بوابة الخدمات الحكومية. جميع الحقوق محفوظة.'
                        : '© 2024 Government Services Portal. All rights reserved.' }) })] }));
}

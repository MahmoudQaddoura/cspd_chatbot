import Chat from './components/Chat';
import './App.css';

export default function App() {
  return (
    <div
      className="app-container"
      dir="rtl"
      style={{ textAlign: 'right' }}
    >
      <header className="app-header">
        <div className="header-brand">
          <div className="gov-emblem">🏛️</div>
          <div className="header-text">
            <h1>مساعد دائرة الأحوال المدنية والجوازات</h1>
            <p className="header-subtitle">
              مساعدك الذكي للإجابة على استفساراتكم
            </p>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Chat />
      </main>
      <footer className="app-footer">
        <p>
          © 2024 دائرة الأحوال المدنية والجوازات. جميع الحقوق محفوظة.
        </p>
      </footer>
    </div>
  );
}

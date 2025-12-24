# Quick Start Guide

Get the RAG Chatbot running in 5 minutes.

## 1. Prerequisites

- Node.js ≥ 18
- OpenAI API Key
- A Vector Store with uploaded documents (created via OpenAI platform)

## 2. Setup

```bash
# Clone/navigate to the project
cd /home/mahmoudq/dev/cspd

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your credentials
# OPENAI_API_KEY=sk_...
# VECTOR_STORE_ID=vs_...
nano .env
```

## 3. Run Locally

**Terminal 1 - Backend (port 3000):**

```bash
npm run dev --workspace=backend
```

Expected output:
```
[Server] RAG Chatbot backend running on http://localhost:3000
[Config] Environment: development
[Config] Vector Store ID: vs_...
```

**Terminal 2 - Frontend (port 5173):**

```bash
npm run dev --workspace=frontend
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

## 4. Test

1. Open `http://localhost:5173` in your browser
2. Ask a question in Arabic or English
3. Watch tokens stream in real-time

**Example Arabic query:**
```
السلام عليكم، ما هو موضوع المستند الرئيسي؟
```

**Example English query:**
```
What is the main topic of the document?
```

## 5. Test API with curl

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "ما هو الموضوع الرئيسي؟", "language": "ar"}' \
  --no-buffer
```

## 6. Deploy to Replit

1. Create a new Replit project from this GitHub repo
2. Set secrets in Replit:
   - `OPENAI_API_KEY`
   - `VECTOR_STORE_ID`
3. Click **Run**
4. Backend will start; frontend accessible via Replit proxy

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 3000 already in use | `kill -9 $(lsof -ti:3000)` or change `PORT` in `.env` |
| `VECTOR_STORE_ID` invalid | Verify format is `vs_...`; check OpenAI Files API |
| No tokens appearing | Check OpenAI quota; verify model `gpt-4-turbo` is available |
| CORS error in browser | Ensure frontend uses correct `VITE_API_URL` |
| `npm ERR!` during install | Try `npm cache clean --force && npm install` |

## Next Steps

- Read [README.md](./README.md) for detailed documentation
- Review backend code in `backend/src/`
- Customize system prompts in `backend/src/ask.ts`
- Modify UI styling in `frontend/src/App.css` and `frontend/src/components/Chat.css`

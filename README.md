# RAG Chatbot System

A high-sensitivity internal chatbot system using OpenAI Vector Stores for document retrieval and GPT-based response generation with live streaming. Built with Node.js + TypeScript (backend) and React + Vite + TypeScript (frontend).

## Features

- **Vector Store Integration**: Retrieves documents from OpenAI Vector Stores using semantic search
- **Streaming Responses**: Live token-by-token streaming of GPT responses via Server-Sent Events (SSE)
- **Arabic-First Language Support**: Default Arabic UI with automatic language detection and RTL support
- **Type-Safe**: Full TypeScript implementation for both backend and frontend
- **Clean Architecture**: Explicit, auditable code with proper error handling
- **Minimal Dependencies**: No orchestration frameworks (LangChain, etc.); uses official OpenAI SDK

## Architecture

```
.
├── backend/                    # Express server + OpenAI integration
│   ├── src/
│   │   ├── server.ts          # Express app and routing
│   │   ├── ask.ts             # /ask endpoint handler (streaming)
│   │   ├── vector.ts          # Vector store client and retrieval
│   │   └── config.ts          # Configuration and validation
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── components/
│   │   │   └── Chat.tsx       # Chat UI with streaming
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── App.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
├── package.json               # Root workspace
├── .env.example              # Configuration template
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js ≥ 18
- npm or yarn
- OpenAI API key with access to Vector Stores
- A pre-populated Vector Store (upload documents via OpenAI platform)

## Setup

### 1. Clone and Install

```bash
cd /home/mahmoudq/dev/cspd
npm install
```

This installs dependencies for both `backend/` and `frontend/` workspaces.

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
VECTOR_STORE_ID=vs_xxxxxxxxxxxxxxxx

# Optional: Langfuse tracing
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASEURL=https://cloud.langfuse.com

# Development
VITE_API_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

**Where to find these values:**

- **OPENAI_API_KEY**: OpenAI API dashboard → API Keys section
- **VECTOR_STORE_ID**: After uploading documents to a Vector Store in the OpenAI Files API section (e.g., `vs_...`)

### 3. Prepare Your Vector Store

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **Files** section
3. Upload your PDF or text documents
4. Create a **Vector Store** and add files to it
5. Copy the Vector Store ID (format: `vs_...`)
6. Add this ID to your `.env` file as `VECTOR_STORE_ID`

## Running the System

### Development Mode

**Terminal 1 (Backend):**

```bash
npm run dev --workspace=backend
```

The backend will start on `http://localhost:3000`.

**Terminal 2 (Frontend):**

```bash
npm run dev --workspace=frontend
```

The frontend will start on `http://localhost:5173`.

### Production Build

```bash
npm run build
npm start
```

## API Reference

### POST `/ask`

Submits a query and returns a streaming response.

**Request:**

```json
{
  "query": "What is the main topic of the document?",
  "language": "ar"
}
```

**Parameters:**

- `query` (string, required): The user's question
- `language` (string, optional): `"ar"` or `"en"` (default: auto-detect, fallback to `"ar"`)

**Response:**

Server-Sent Events (SSE) stream:

```
data: {"token": "The", "done": false}

data: {"token": " document", "done": false}

data: {"token": " discusses...", "done": false}

data: {"token": "", "done": true}

```

**Example with curl:**

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "query": "ما هو الموضوع الرئيسي للمستند؟",
    "language": "ar"
  }'
```

### GET `/health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-14T10:30:00.000Z"
}
```

## Language Support

The system automatically detects the user's language based on input text:

- **Arabic**: Default language; detected if input contains ≥10% Arabic Unicode characters
- **English**: Used for other inputs

The assistant responds in the same language as the user's query. If language is ambiguous, defaults to Arabic.

### Error Responses

- **Arabic**: "المعلومة غير متوفرة حالية" (Information is not currently available)
- **English**: "Information is not currently available"

## Streaming Architecture

1. **Frontend sends query** → POST to `/ask` endpoint
2. **Backend retrieves documents** → Queries Vector Store via OpenAI Files API
3. **Backend streams response** → Uses OpenAI Chat Completions with `stream: true`
4. **Backend forwards tokens** → SSE format to frontend in real-time
5. **Frontend renders tokens** → Updates message display as tokens arrive

## Configuration Details

### Backend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `VECTOR_STORE_ID` | Yes | Vector Store ID from OpenAI |
| `LANGFUSE_SECRET_KEY` | No | Langfuse secret for tracing |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse public key |
| `LANGFUSE_BASEURL` | No | Langfuse server URL |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |

### Frontend Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend API URL (default: http://localhost:3000) |

## Error Handling

All errors are handled conservatively:

- **Network errors**: Display user-friendly fallback message
- **API errors**: Log details; return "Information is not currently available" to user
- **Validation errors**: Reject invalid input (empty queries, malformed JSON)
- **Streaming errors**: Gracefully close connection; display error in chat

## Replit Deployment

To run on Replit:

1. Create a new Replit project from this GitHub repo
2. Set environment variables in Replit Secrets:
   - `OPENAI_API_KEY`
   - `VECTOR_STORE_ID`
3. Create a `.replit` file:

```yaml
run = "npm install && npm run dev --workspace=backend"
modules = ["nodejs-20"]
```

4. The backend will start on the Replit domain
5. Frontend can be served separately or proxied through the backend

## Testing

### Manual Test of `/ask` Endpoint

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "السلام عليكم", "language": "ar"}' \
  --no-buffer
```

### Test in Browser

1. Open `http://localhost:5173`
2. Type a question in Arabic or English
3. Observe live token streaming in the chat UI

## Langfuse Integration (Optional)

If you enable Langfuse tracing:

1. Sign up at [Langfuse Cloud](https://cloud.langfuse.com)
2. Create a project and get API keys
3. Set environment variables:
   ```env
   LANGFUSE_SECRET_KEY=sk_...
   LANGFUSE_PUBLIC_KEY=pk_...
   ```
4. Traces will be automatically collected for vector retrieval and chat completions

To disable, leave `LANGFUSE_SECRET_KEY` and `LANGFUSE_PUBLIC_KEY` empty.

## Performance Notes

- **Streaming latency**: Typically 100–500ms first token latency (depends on OpenAI API)
- **Vector search**: ~200–500ms for document retrieval
- **Frontend rendering**: <50ms per token update

## Security Considerations

- **API Key Storage**: Never commit `.env` files; use Replit Secrets or CI/CD secrets manager
- **CORS**: Currently allows all origins; restrict in production: `cors({ origin: 'https://yourdomain.com' })`
- **Input Validation**: All user inputs are validated before processing
- **SSE Connection**: Connections timeout after 30 seconds of inactivity (standard HTTP timeout)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `VECTOR_STORE_ID` not found | Verify ID matches format `vs_...`; check OpenAI Files API |
| `OPENAI_API_KEY` invalid | Regenerate key in OpenAI API dashboard |
| Port 3000 already in use | Change `PORT` in `.env` or kill process: `lsof -ti:3000 \| xargs kill -9` |
| Frontend can't reach backend | Ensure `VITE_API_URL` matches backend URL; check CORS headers |
| No tokens streamed | Check OpenAI account quota; verify model access (`gpt-4-turbo`) |
| Language detection not working | Ensure input contains clear Arabic (≥10%) or English characters |

## Contributing

Code guidelines:

- Use explicit, readable code over clever abstractions
- Add TypeScript types for all functions
- Write defensive error handling
- Test streaming with both languages
- Maintain conservative behavior (prioritize safety over features)

## License

MIT

## Support

For issues or questions:

1. Check `.env` configuration (most issues are config-related)
2. Review backend logs: `npm run dev --workspace=backend`
3. Check browser console for frontend errors
4. Verify Vector Store is populated with documents

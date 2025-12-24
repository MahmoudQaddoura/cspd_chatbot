# Government Services Assistant Chatbot

## Overview
A bilingual (Arabic/English) AI-powered chatbot for government services civilian support and Q&A. The chatbot uses direct OpenAI Vector Store search to retrieve relevant information from a knowledge base.

## Current State
- **Status**: Fully functional with simplified fast Q&A pipeline
- **Last Updated**: December 18, 2024
- **Architecture**: Minimal RAG with refusal-first prompting

### Features
- Arabic-only UI with auto-detecting text direction for input
- Real-time streaming responses via Server-Sent Events (SSE)
- **Direct Vector Store Search**: Uses OpenAI's vector store search API
- **Refusal-first prompting**: Model refuses when information is not in snippets
- **Simple chat memory**: Session-based conversation history (last 20 messages)
- **Higher confidence threshold**: 0.5 minimum for answering
- Langfuse integration for query tracing and analytics
- Dark theme UI with green accents
- Clickable suggestion chips on welcome screen

### Response Flow
- Low retrieval confidence (<0.4) → automatic refusal with suggestion to visit office
- High confidence (≥0.4) → generate answer strictly from retrieved content
- Ambiguous service type → model asks clarifying question first, then answers with context
- Model self-refuses when uncertain (built into prompt)
- Answers always structured as: Requirements → Procedures → Fees

### Query Enhancement
- Synonym normalization: Maps user terms to knowledge base terms (e.g., "ميلاد" → "ولادة")
- English-to-Arabic mapping: Translates English service terms to Arabic for retrieval
- Query expansion: Automatically adds fee-related terms for general service queries
- Follow-up query enhancement: Preserves original query context and fee terms on clarification responses
- Ensures fees are retrieved even when user asks "how to" questions

### Service Disambiguation
- System prompt includes service taxonomy (common vs specialized services)
- Model uses logic-based determination: specialized services require user to BELONG to that category
- Location mentions alone don't trigger specialized service (e.g., "I'm in Gaza" ≠ "Gaza passport")
- When uncertain, model asks one clarifying question before answering
- Conversation history is preserved for multi-turn clarification flows

## Project Architecture

### Directory Structure
```
/
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── server.ts       # Express server setup
│   │   ├── ask.ts          # Chat endpoint handler with SSE streaming
│   │   ├── rag.ts          # Direct vector store search and retrieval
│   │   ├── config.ts       # Environment configuration
│   │   └── langfuse.ts     # Langfuse tracing integration
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx         # Main app with language toggle
│   │   ├── App.css         # Government branding styles
│   │   ├── components/
│   │   │   ├── Chat.tsx    # Chat component with streaming
│   │   │   └── Chat.css    # Chat styles with RTL support
│   │   ├── index.css       # Global styles
│   │   └── main.tsx        # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── replit.md               # This file
```

### Technology Stack
- **Backend**: Node.js, Express, TypeScript, OpenAI SDK 4.52.0
- **Frontend**: React 18, Vite, TypeScript
- **AI**: OpenAI Vector Store Search API (direct search, not Assistants API)
- **Analytics**: Langfuse for query tracing

### Performance Metrics (December 2024)
- **Vector search retrieval**: ~2s (avg score 68%, confidence 76%)
- **Answer generation**: ~5s (gpt-4.1-mini)
- **Total pipeline**: ~7s

### API Endpoints
- `GET /health` - Health check endpoint
- `POST /ask` - Chat endpoint (SSE streaming)
  - Request: `{ "query": string, "language": "ar" | "en", "sessionId": string }`
  - Response: SSE stream with `{ "token": string, "done": boolean, "warning"?: boolean }`

## Environment Variables
Required secrets (stored in Replit Secrets):
- `OPENAI_API_KEY` - OpenAI API key
- `VECTOR_STORE_ID` - OpenAI Vector Store ID (format: vs_xxx)
- `LANGFUSE_SECRET_KEY` - Langfuse secret key

Environment variables:
- `OPENAI_MODEL` - Model to use (default: gpt-4.1-mini)
- `LANGFUSE_PUBLIC_KEY` - Langfuse public key
- `LANGFUSE_BASEURL` - Langfuse base URL

## Workflows
- **Backend API** - Runs Express server on port 3000
- **Frontend Dev** - Runs Vite dev server on port 5000

## Development Notes
- Frontend proxies `/ask` and `/health` to backend via Vite config
- Uses direct `openai.vectorStores.search()` API for fast retrieval
- Service-focused search queries emphasize specific service for better accuracy
- Generator prompts explicitly forbid mixing information between different services
- Simple session-based chat memory stores last 20 messages per session
- Honest refusals when information not available in knowledge base

## User Preferences
- Bilingual support required (Arabic primary, English secondary)
- Professional government services branding
- Clean, accessible UI with RTL support

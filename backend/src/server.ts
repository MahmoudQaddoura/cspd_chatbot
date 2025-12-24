import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './config.js';
import { askHandler } from './ask.js';
import { initLangfuse, flushLangfuse } from './langfuse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate configuration on startup
validateConfig();

// Initialize Langfuse tracing
initLangfuse();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ask endpoint (streaming via SSE)
app.post('/ask', askHandler);

// Serve static frontend files in production
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// SPA fallback - serve index.html for all other routes
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handler
app.use((err: unknown, _req: Request, res: Response) => {
  if (err instanceof Error) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  } else {
    console.error('Unknown server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`[Server] RAG Chatbot backend running on http://localhost:${PORT}`);
  console.log(`[Config] Environment: ${config.nodeEnv}`);
  console.log(`[Config] Vector Store ID: ${config.vectorStoreId}`);
  console.log(`[Config] OpenAI model: ${config.openaiModel}`);
  if (config.langfuse.enabled) {
    console.log(`[Config] Langfuse tracing enabled`);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  await flushLangfuse();
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Server] SIGINT received, shutting down gracefully...');
  await flushLangfuse();
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

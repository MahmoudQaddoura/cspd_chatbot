import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  vectorStoreId: process.env.VECTOR_STORE_ID,
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  // Allow selecting the OpenAI model via env (e.g., 'gpt-4-turbo' or 'gpt-4.1-mini')
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4-turbo',
  langfuse: {
    enabled: !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY),
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    baseUrl: process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com',
  },
};

// Validate required config
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.openaiApiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (!config.vectorStoreId) {
    errors.push('VECTOR_STORE_ID is required');
  }

  if (errors.length > 0) {
    console.error('Configuration validation failed:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
}

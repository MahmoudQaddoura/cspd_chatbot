# Environment Configuration Guide

Complete guide to setting up your `.env` file for the RAG Chatbot.

## Required Variables

### OpenAI Configuration

**`OPENAI_API_KEY`**
- Your OpenAI API key
- Format: `sk_...` (starts with `sk_`)
- Where to find: [OpenAI API Keys](https://platform.openai.com/api-keys)
- Example: `sk_proj_abcdef123456789`

**`VECTOR_STORE_ID`**
- ID of your Vector Store (where documents are stored)
- Format: `vs_...` (starts with `vs_`)
- Where to find:
  1. Go to [OpenAI Platform Files](https://platform.openai.com/files)
  2. Navigate to "Vector Stores" tab
  3. Copy the ID from your created Vector Store
- Example: `vs_abc123def456`

## Optional Variables

### Langfuse Tracing (for observability)

**`LANGFUSE_SECRET_KEY`**
- Secret key from Langfuse
- Leave empty to disable tracing
- Where to find: [Langfuse Dashboard](https://cloud.langfuse.com)
- Example: `sk_lf_...`

**`LANGFUSE_PUBLIC_KEY`**
- Public key from Langfuse
- Pair with `LANGFUSE_SECRET_KEY`
- Example: `pk_lf_...`

**`LANGFUSE_BASEURL`**
- Langfuse server URL
- Default: `https://cloud.langfuse.com`
- Use custom URL if self-hosting

### Server Configuration

**`PORT`**
- HTTP server port
- Default: `3000`
- Use if port 3000 is unavailable
- Example: `8080`

**`NODE_ENV`**
- Environment mode
- Options: `development`, `production`
- Default: `development`
- Affects logging and error details

### Frontend Configuration

**`VITE_API_URL`**
- Backend API URL for frontend
- Default: `http://localhost:3000`
- Change if backend runs on different host/port
- For Replit: use the Replit domain (auto-configured)
- Example: `https://my-chatbot.replit.dev`

## Setup Steps

### 1. Copy Template

```bash
cp .env.example .env
```

### 2. Get OpenAI API Key

1. Visit [openai.com/api/login](https://platform.openai.com/login)
2. Sign in or create account
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Copy the key (you won't see it again)
6. Paste into `.env`:

```env
OPENAI_API_KEY=sk_proj_your_key_here
```

### 3. Create Vector Store and Get ID

1. In OpenAI Platform, go to **Files**
2. Upload your documents (PDF, TXT, etc.)
3. Create a **Vector Store** from "Vector Stores" tab
4. Add your uploaded files to the Vector Store
5. Copy the Vector Store ID (e.g., `vs_abc123`)
6. Paste into `.env`:

```env
VECTOR_STORE_ID=vs_abc123def456
```

### 4. (Optional) Setup Langfuse

1. Sign up at [langfuse.com](https://cloud.langfuse.com)
2. Create a new project
3. Go to **Settings** → **API Keys**
4. Copy Secret Key and Public Key
5. Paste into `.env`:

```env
LANGFUSE_SECRET_KEY=sk_lf_your_secret
LANGFUSE_PUBLIC_KEY=pk_lf_your_public
```

### 5. Verify `.env`

```bash
# Check that critical variables are set
grep "OPENAI_API_KEY\|VECTOR_STORE_ID" .env

# Should show:
# OPENAI_API_KEY=sk_...
# VECTOR_STORE_ID=vs_...
```

## Example Complete `.env`

```env
# Required
OPENAI_API_KEY=sk_proj_abcdef1234567890
VECTOR_STORE_ID=vs_xyz987654321

# Optional: Langfuse tracing
LANGFUSE_SECRET_KEY=sk_lf_abc123
LANGFUSE_PUBLIC_KEY=pk_lf_def456
LANGFUSE_BASEURL=https://cloud.langfuse.com

# Development settings
VITE_API_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

## Troubleshooting

### "Invalid API Key"

- Ensure key starts with `sk_`
- Check key is not expired (regenerate if needed)
- Verify no leading/trailing whitespace in `.env`

### "Vector Store not found"

- Confirm `VECTOR_STORE_ID` starts with `vs_`
- Check ID matches your created Vector Store in OpenAI platform
- Ensure documents are uploaded to the Vector Store

### "Port already in use"

- Change `PORT` in `.env` to an unused port (e.g., `8080`)
- Or kill the process: `lsof -ti:3000 | xargs kill -9`

### Langfuse integration not working

- Leave `LANGFUSE_SECRET_KEY` and `LANGFUSE_PUBLIC_KEY` empty to disable
- No error will occur; tracing is optional

## Security Notes

- **Never commit `.env` to version control** — it's in `.gitignore` by default
- **Use strong API keys** — regenerate if accidentally exposed
- **For production**: Use environment variable management (Heroku Config Vars, GitHub Secrets, AWS Secrets Manager, etc.)
- **For Replit**: Use Replit Secrets, not `.env` files

## Replit Deployment

In Replit:

1. Click **Secrets** (lock icon)
2. Add secrets:
   - `OPENAI_API_KEY` = your key
   - `VECTOR_STORE_ID` = your store ID
3. Replit will inject these as environment variables
4. No need to create `.env` file

## Testing Configuration

```bash
# Start backend — if configured correctly, you'll see:
npm run dev --workspace=backend

# Expected output:
# [Server] RAG Chatbot backend running on http://localhost:3000
# [Config] Vector Store ID: vs_...
```

If backend starts without errors, your configuration is correct!

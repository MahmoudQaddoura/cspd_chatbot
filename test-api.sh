#!/bin/bash

# Test Script for RAG Chatbot API
# Usage: ./test-api.sh
# Requires: backend running on http://localhost:3000

set -e

API_URL="${API_URL:-http://localhost:3000}"
QUERY="${1:-السلام عليكم، ما هو موضوع المستند الرئيسي؟}"
LANG="${2:-ar}"

echo "=========================================="
echo "RAG Chatbot API Test"
echo "=========================================="
echo ""
echo "API URL: $API_URL"
echo "Query: $QUERY"
echo "Language: $LANG"
echo ""

# Test health endpoint
echo "[1/3] Testing /health endpoint..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    echo "✓ Health check passed"
    echo "    Response: $HEALTH"
else
    echo "✗ Health check failed"
    echo "    Response: $HEALTH"
    exit 1
fi

echo ""
echo "[2/3] Testing /ask endpoint (streaming)..."
echo "Sending query and waiting for response..."
echo ""

# Test ask endpoint with streaming
echo "Response tokens:"
curl -X POST "$API_URL/ask" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"$QUERY\", \"language\": \"$LANG\"}" \
    --no-buffer \
    -s | sed 's/data: /  /g' | sed 's/\\n/\n  /g' | head -20

echo ""
echo ""
echo "[3/3] Testing error handling..."
# Send empty query (should fail gracefully)
EMPTY=$(curl -s -X POST "$API_URL/ask" \
    -H "Content-Type: application/json" \
    -d '{"query": ""}')

if echo "$EMPTY" | grep -q "error"; then
    echo "✓ Error handling works"
    echo "    Response: $EMPTY"
else
    echo "⚠ Error handling might not be working"
    echo "    Response: $EMPTY"
fi

echo ""
echo "=========================================="
echo "✓ All tests completed!"
echo "=========================================="

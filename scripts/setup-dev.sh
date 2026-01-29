#!/bin/bash
# Development Setup Script
# Run this after 'docker compose -f docker-compose.dev.yml up -d'

set -e

echo "🚀 CheckMate Development Setup"
echo "================================"

# Load environment variables
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Default values
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@checkmate.local}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-checkmate_admin_2026}"
POCKETBASE_URL="${POCKETBASE_URL:-http://127.0.0.1:8090}"

echo ""
echo "📋 Configuration:"
echo "   PocketBase URL: $POCKETBASE_URL"
echo "   Admin Email: $PB_ADMIN_EMAIL"
echo ""

# Wait for PocketBase to be ready
echo "⏳ Waiting for PocketBase to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "$POCKETBASE_URL/api/health" > /dev/null 2>&1; then
        echo "✅ PocketBase is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ PocketBase is not responding. Make sure Docker containers are running:"
    echo "   docker compose -f docker-compose.dev.yml up -d"
    exit 1
fi

# Check if schema already exists
echo ""
echo "🔍 Checking database schema..."
COLLECTIONS=$(curl -s "$POCKETBASE_URL/api/collections" 2>/dev/null || echo '{"items":[]}')
COLLECTION_COUNT=$(echo "$COLLECTIONS" | grep -o '"name"' | wc -l)

if [ "$COLLECTION_COUNT" -gt 2 ]; then
    echo "✅ Schema already set up ($COLLECTION_COUNT collections found)"
else
    echo "📦 Importing schema..."
    PB_ADMIN_EMAIL="$PB_ADMIN_EMAIL" PB_ADMIN_PASSWORD="$PB_ADMIN_PASSWORD" npx tsx scripts/import-schema.ts
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Access the app at: http://localhost:3002"
echo "🔧 PocketBase Admin: $POCKETBASE_URL/_/"
echo ""

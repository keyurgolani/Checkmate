#!/bin/sh
set -e

# PocketBase Entrypoint Script
# Automatically creates superuser on first run
# Demo user is seeded by the Next.js app after schema initialization

PB_DATA_DIR="/pb/pb_data"
SETUP_MARKER="$PB_DATA_DIR/.setup_complete"

# Default admin credentials (should be overridden via environment variables)
PB_ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@checkmate.local}"
PB_ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:-checkmate_admin_2026}"

echo "🚀 Starting PocketBase..."

# Check if this is a fresh installation
if [ ! -f "$SETUP_MARKER" ]; then
    echo "📦 Fresh installation detected..."
    
    # Start PocketBase briefly to create superuser
    /pb/pocketbase serve --http=0.0.0.0:8090 &
    PB_PID=$!
    
    # Wait for PocketBase to be ready
    echo "⏳ Waiting for PocketBase to start..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if wget -q --spider http://localhost:8090/api/health 2>/dev/null; then
            echo "✅ PocketBase is ready"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 1
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ PocketBase failed to start"
        exit 1
    fi
    
    # Create superuser
    echo "👤 Creating superuser..."
    /pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" 2>/dev/null || true
    echo "✅ Superuser created"
    
    # Create marker file
    touch "$SETUP_MARKER"
    echo "✅ Initial setup complete"
    
    # Stop the background process
    kill $PB_PID 2>/dev/null || true
    wait $PB_PID 2>/dev/null || true
else
    echo "✅ Database already initialized"
fi

# Start PocketBase in the foreground
echo "🚀 Starting PocketBase server..."
exec /pb/pocketbase serve --http=0.0.0.0:8090

/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * We use it to automatically initialize the PocketBase schema.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] 🚀 Next.js server starting...');
    
    // Dynamic import to avoid bundling issues
    const { ensureSchemaInitialized } = await import('./lib/services/schema-init');
    
    // Initialize schema with retry logic
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Instrumentation] 📋 Schema initialization attempt ${attempt}/${maxRetries}...`);
        const success = await ensureSchemaInitialized();
        
        if (success) {
          console.log('[Instrumentation] ✅ Schema initialized successfully');
          return;
        }
        
        if (attempt < maxRetries) {
          console.log(`[Instrumentation] ⏳ Retrying in ${retryDelay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.error(`[Instrumentation] ❌ Attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          console.log(`[Instrumentation] ⏳ Retrying in ${retryDelay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    console.error('[Instrumentation] ❌ Schema initialization failed after all retries');
    console.error('[Instrumentation] ℹ️  The app will continue, but you may need to call /api/setup manually');
  }
}

/**
 * Droid Runtime Hijack Patcher
 * Dit script toont aan hoe we de Droid CLI kunnen fixen zonder de 55MB minified bundel 
 * aan te passen. Door dit als preload script in te laden, patchen we de Node.js core 
 * modules (zoals `fs`) in het geheugen *voordat* Droid start.
 */

const fs = require('fs');

// ============================================================================
// FIX 1: Voorkom Event-Loop Blocking door git.ts:statSync
// ============================================================================
const originalStatSync = fs.statSync;
const statCache = new Map();

fs.statSync = function(path, options) {
    // We targetten alleen de check voor `.git` directories die de lag veroorzaken
    if (typeof path === 'string' && path.endsWith('.git')) {
        // Cache hit? Return direct zonder OS I/O!
        if (statCache.has(path)) {
            return statCache.get(path);
        }
        
        try {
            const stat = originalStatSync.apply(this, arguments);
            statCache.set(path, stat); // Cache the stat
            return stat;
        } catch (e) {
            // Als het niet bestaat (bijv. ENOENT)
            statCache.set(path, e);
            throw e;
        }
    }
    
    // Al het andere mag gewoon door
    return originalStatSync.apply(this, arguments);
};

// ============================================================================
// FIX 2: 429 Rate Limit Death Spiral voorkomen (Fetch / JSON-RPC intercept)
// ============================================================================
const originalFetch = global.fetch;
let rateLimitHit = false;

global.fetch = async function(...args) {
    if (rateLimitHit) {
        // We throwen direct een error zonder het netwerk op te gaan om de 429 storm te dempen
        throw new Error('In-memory Rate Limit Guard: 429 previously hit. Backing off.');
    }
    
    const response = await originalFetch.apply(this, args);
    
    if (response.status === 429) {
        console.warn("[DROID HIJACK] 429 Rate Limit gedetecteerd! Netwerk wordt tijdelijk geknepen.");
        rateLimitHit = true;
        setTimeout(() => { rateLimitHit = false; }, 60000); // 1 minuut backoff
    }
    
    return response;
};

console.log("[DROID HIJACK] fs.statSync en global.fetch gepatched. Droid CLI is nu beveiligd tegen lags.");

// Om dit te gebruiken:
// bun run --preload ./droid-hijack-patcher.js ~/.factory/bin/droid

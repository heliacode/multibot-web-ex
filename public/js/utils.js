/**
 * Utility functions and console suppression
 */

// Suppress Tailwind CDN warning and network errors
(function() {
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;
    const originalDir = console.dir;
    const originalTable = console.table;
    
    // Override console methods to filter out unwanted messages
    console.warn = function(...args) {
        const msg = args.join(' ');
        
        // Suppress extension warnings
        if (msg.includes('content_script.js') || 
            msg.includes('extension://') ||
            msg.includes('chrome-extension://') ||
            msg.includes('control') && msg.includes('undefined')) {
            return; // Suppress extension warnings
        }
        
        if (msg.includes('cdn.tailwindcss.com') || 
            msg.includes('should not be used in production')) {
            return; // Suppress Tailwind CDN warning
        }
        originalWarn.apply(console, args);
    };
    
    // Suppress ALL network error messages AND extension errors
    console.error = function(...args) {
        const msg = args.join(' ');
        const stack = new Error().stack || '';
        
        // Suppress extension errors (content_script.js, control property errors, etc.)
        if (msg.includes('content_script.js') || 
            msg.includes('extension://') ||
            msg.includes('chrome-extension://') ||
            msg.includes('moz-extension://') ||
            msg.includes('safari-extension://') ||
            msg.includes('edge-extension://') ||
            (msg.includes('Cannot read properties') && msg.includes('control')) ||
            (msg.includes('control') && msg.includes('undefined')) ||
            stack.includes('content_script.js')) {
            return; // Suppress extension errors completely
        }
        
        // Suppress 404/500 errors for API routes and network failures
        if (msg.includes('404') || 
            msg.includes('500') || 
            msg.includes('/api/audio-commands') || 
            msg.includes('/api/obs-token') ||
            msg.includes('/api/images') ||
            msg.includes('Failed to load resource') ||
            msg.includes('GET http://localhost:3000/api/') ||
            msg.includes('loadAudioCommands') ||
            msg.includes('loadObsToken')) {
            return; // Suppress network errors
        }
        originalError.apply(console, args);
    };
    
    // Suppress debug logs for API routes
    console.log = function(...args) {
        const msg = args.join(' ');
        if (msg.includes('Route /api/') || 
            msg.includes('Server error loading') ||
            msg.includes('audio-commands') ||
            msg.includes('obs-token') ||
            msg.includes('images')) {
            return; // Suppress API route debug messages
        }
        originalLog.apply(console, args);
    };
    
    // Suppress console.dir and console.table for network errors
    console.dir = function(...args) {
        const msg = JSON.stringify(args);
        if (msg.includes('/api/') || msg.includes('404') || msg.includes('500')) {
            return;
        }
        originalDir.apply(console, args);
    };
    
    console.table = function(...args) {
        const msg = JSON.stringify(args);
        if (msg.includes('/api/') || msg.includes('404') || msg.includes('500')) {
            return;
        }
        originalTable.apply(console, args);
    };
    
    // Also suppress unhandled promise rejections from fetch AND extensions
    window.addEventListener('unhandledrejection', function(event) {
        const msg = event.reason?.message || event.reason?.toString() || '';
        const stack = event.reason?.stack ? String(event.reason.stack) : '';
        
        // Suppress extension promise rejections
        if (msg.includes('content_script.js') || 
            msg.includes('extension://') ||
            msg.includes('chrome-extension://') ||
            stack.includes('content_script.js') ||
            (msg.includes('control') && msg.includes('undefined'))) {
            event.preventDefault();
            return false;
        }
        
        if (msg.includes('/api/') || msg.includes('404') || msg.includes('500') || msg.includes('Failed to fetch')) {
            event.preventDefault();
            return false;
        }
    });

    // Suppress uncaught errors thrown by browser extensions (common when typing/focusing inputs)
    // This prevents noisy red errors like "Cannot read properties of undefined (reading 'control')"
    // from breaking the dashboard experience.
    window.addEventListener('error', function(event) {
        const filename = String(event?.filename || '');
        const message = String(event?.message || '');
        const stack = event?.error?.stack ? String(event.error.stack) : '';

        // Ignore only extension-originated errors (do NOT swallow real app errors)
        const isExtension =
            filename.includes('chrome-extension://') ||
            filename.includes('moz-extension://') ||
            filename.includes('safari-extension://') ||
            filename.includes('edge-extension://') ||
            stack.includes('content_script.js') ||
            filename.includes('content_script.js');

        const isKnownExtensionNoise =
            (message.includes('Cannot read properties') && message.includes('control')) ||
            (message.includes('control') && message.includes('undefined'));

        if (isExtension || isKnownExtensionNoise) {
            event.preventDefault();
            return false;
        }
    }, true);
})();

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


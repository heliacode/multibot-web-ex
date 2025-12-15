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
        if (msg.includes('cdn.tailwindcss.com') || 
            msg.includes('should not be used in production')) {
            return; // Suppress Tailwind CDN warning
        }
        originalWarn.apply(console, args);
    };
    
    // Suppress ALL network error messages
    console.error = function(...args) {
        const msg = args.join(' ');
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
    
    // Also suppress unhandled promise rejections from fetch
    window.addEventListener('unhandledrejection', function(event) {
        const msg = event.reason?.message || event.reason?.toString() || '';
        if (msg.includes('/api/') || msg.includes('404') || msg.includes('500') || msg.includes('Failed to fetch')) {
            event.preventDefault();
            return false;
        }
    });
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


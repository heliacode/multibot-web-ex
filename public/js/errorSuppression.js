// ULTRA-AGGRESSIVE error suppression - runs as early as possible
// Intended to suppress noisy browser-extension errors that can flood the console.
(function() {
  'use strict';

  // Pattern matching for extension errors
  const isExtensionError = function(msg, source, stack) {
    if (!msg && !source && !stack) return false;
    const combined = String(msg || '') + String(source || '') + String(stack || '');
    return (
      combined.includes('content_script.js') ||
      combined.includes('extension://') ||
      combined.includes('chrome-extension://') ||
      combined.includes('moz-extension://') ||
      combined.includes('safari-extension://') ||
      combined.includes('edge-extension://') ||
      (combined.includes('control') && combined.includes('undefined')) ||
      (combined.includes('Cannot read properties') && combined.includes('control')) ||
      combined.includes("reading 'control'")
    );
  };

  // Override window.onerror - FIRST LINE OF DEFENSE
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (isExtensionError(message, source, error?.stack)) {
      return true; // Suppress completely
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Error event listener - SECOND LINE OF DEFENSE (capture phase)
  window.addEventListener(
    'error',
    function(event) {
      if (isExtensionError(event.message, event.filename, event.error?.stack)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
    },
    true
  );

  // Unhandled promise rejections - THIRD LINE OF DEFENSE
  window.addEventListener(
    'unhandledrejection',
    function(event) {
      const reason = event.reason;
      const reasonStr = String(reason || '');
      const stack = reason?.stack ? String(reason.stack) : '';
      if (isExtensionError(reasonStr, null, stack)) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
    },
    true
  );

  // Console.error override - FOURTH LINE OF DEFENSE
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    const stack = new Error().stack || '';
    if (isExtensionError(message, null, stack)) {
      return; // Suppress completely
    }
    originalConsoleError.apply(console, args);
  };

  // Console.warn override - FIFTH LINE OF DEFENSE
  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const message = args.join(' ');
    if (isExtensionError(message, null, null)) {
      return; // Suppress completely
    }
    originalConsoleWarn.apply(console, args);
  };
})();


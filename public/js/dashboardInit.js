// Dashboard boot logic (small, safe, and late-loaded)
(function() {
  // Clear the logout flag from sessionStorage when user successfully reaches dashboard
  try {
    if (sessionStorage.getItem('logged_out') === 'true') {
      sessionStorage.removeItem('logged_out');
      console.log('[Dashboard] Cleared logout flag - user has successfully logged in');
    }
  } catch (e) {
    // Ignore
  }

  // Check database health on dashboard load
  async function checkDatabaseHealth() {
    try {
      const response = await fetch('/api/health/database', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.ok && data.database.connected) {
        console.log('[Dashboard] ✅ Database health check passed:', {
          queryTime: data.database.queryTime,
          usersTableExists: data.database.usersTableExists,
          userCount: data.database.userCount
        });
      } else {
        console.warn('[Dashboard] ⚠️ Database health check failed:', data.database.error || 'Unknown error');
      }
    } catch (error) {
      console.error('[Dashboard] ❌ Database health check error:', error);
    }
  }

  // Run health check after a short delay to not block page load
  setTimeout(checkDatabaseHealth, 1000);

  // Protect input fields from extension interference
  document.addEventListener('DOMContentLoaded', function() {
    const protectInput = function(input) {
      if (input && input.tagName === 'INPUT') {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('data-lpignore', 'true');
        input.setAttribute('data-form-type', 'other');
        input.setAttribute('data-1p-ignore', 'true');
        input.setAttribute('data-bwignore', 'true');
        // Prevent extensions from attaching to inputs
        try {
          Object.defineProperty(input, '__extensionProtected', {
            value: true,
            writable: false,
            configurable: false
          });
        } catch (e) {
          // Ignore if can't define property
        }
      }
    };

    // Protect existing inputs
    document.querySelectorAll('input').forEach(protectInput);

    // Protect dynamically added inputs
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.tagName === 'INPUT') {
              protectInput(node);
            }
            node.querySelectorAll?.('input')?.forEach?.(protectInput);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });
})();


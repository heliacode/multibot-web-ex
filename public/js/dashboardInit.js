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

  // Update LED indicator
  function updateDbLed(status) {
    const led = document.getElementById('db-status-led');
    if (!led) return;
    
    // Remove all status classes
    led.classList.remove('db-led-red', 'db-led-green', 'db-led-yellow');
    
    // Add appropriate class and update title
    if (status === 'connected') {
      led.classList.add('db-led-green');
      led.title = 'Database: Connected ✓';
    } else if (status === 'checking') {
      led.classList.add('db-led-yellow');
      led.title = 'Database: Checking...';
    } else {
      led.classList.add('db-led-red');
      led.title = 'Database: Not Connected ✗';
    }
  }

  // Check database health on dashboard load
  async function checkDatabaseHealth() {
    // Set LED to checking state
    updateDbLed('checking');
    
    try {
      const response = await fetch('/api/health/database', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.ok && data.database.connected) {
        updateDbLed('connected');
        console.log('[Dashboard] ✅ Database health check passed:', {
          queryTime: data.database.queryTime,
          usersTableExists: data.database.usersTableExists,
          userCount: data.database.userCount
        });
      } else {
        updateDbLed('disconnected');
        const errorMsg = data.database?.message || data.database?.error || 'Unknown error';
        const errorCode = data.database?.code || '';
        
        console.warn('[Dashboard] ⚠️ Database health check failed:', errorMsg);
        
        if (errorCode === 'ECONNREFUSED' || errorMsg.includes('localhost')) {
          console.warn('[Dashboard] 💡 Fix: Add Postgres database in Railway → New → Database → PostgreSQL');
          console.warn('[Dashboard] 💡 Then link it to your service in Railway → Variables → Add Reference');
        } else if (errorMsg.includes('DATABASE_URL')) {
          console.warn('[Dashboard] 💡 Fix: Set DATABASE_URL in Railway → Variables');
        }
      }
    } catch (error) {
      updateDbLed('disconnected');
      console.error('[Dashboard] ❌ Database health check error:', error.message || error);
      console.warn('[Dashboard] 💡 This usually means the database is not configured in Railway');
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


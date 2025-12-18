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


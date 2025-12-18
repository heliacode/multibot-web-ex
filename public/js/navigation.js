/**
 * Navigation and User Info Management
 */

// Track if we're programmatically navigating (to prevent beforeunload)
let isProgrammaticNavigation = false;

// Navigation functionality
function showSection(section, event, skipHistory = false) {
    if (event) {
        event.preventDefault();
    }
    
    // Get dashboard cards view
    const dashboardCards = document.getElementById('dashboard-cards');
    
    // Hide all sections
    const sections = document.querySelectorAll('[id$="-section"]');
    sections.forEach(s => s.style.display = 'none');
    
    // Show selected section
    if (section === 'dashboard') {
        // Show dashboard cards view
        if (dashboardCards) {
            dashboardCards.style.display = 'grid';
        }
        // Hide all individual sections
        sections.forEach(s => s.style.display = 'none');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // Hide dashboard cards view
        if (dashboardCards) {
            dashboardCards.style.display = 'none';
        }
        
        // Show the selected section
        // Handle both 'section' and 'section-section' formats
        let sectionId = section.endsWith('-section') ? section : `${section}-section`;
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // Trigger section-specific initialization
            if (section === 'bits-section' || section === 'bits') {
                // Ensure bit triggers are loaded when section is shown
                if (window.ensureBitTriggersLoaded) {
                    setTimeout(() => window.ensureBitTriggersLoaded(), 100);
                }
            }
            
            if (section === 'animated-text-section' || section === 'animated-text') {
                // Ensure animated text commands are loaded when section is shown
                if (window.ensureAnimatedTextCommandsLoaded) {
                    setTimeout(() => window.ensureAnimatedTextCommandsLoaded(), 100);
                }
            }
            
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
    
    // Update active menu item
    document.querySelectorAll('.menu a').forEach(a => {
        a.classList.remove('active');
        a.classList.remove('bg-white/30');
    });
    if (event && event.target && event.target.closest('a')) {
        const activeLink = event.target.closest('a');
        activeLink.classList.add('active');
        activeLink.classList.add('bg-white/30');
    } else {
        // Fallback: find the link by href
        const link = document.querySelector(`a[href="#${section}"]`);
        if (link) {
            link.classList.add('active');
            link.classList.add('bg-white/30');
        }
    }
    
    // Update URL and history (unless we're navigating from browser history)
    if (!skipHistory) {
        const currentHash = window.location.hash.replace('#', '') || 'dashboard';
        if (currentHash !== section) {
            // Update URL without page reload
            isProgrammaticNavigation = true;
            const newUrl = `${window.location.pathname}#${section}`;
            window.history.pushState({ section: section }, '', newUrl);
            setTimeout(() => {
                isProgrammaticNavigation = false;
            }, 100);
        }
    }
    
    // Close drawer on mobile after selection
    if (window.innerWidth < 1024) {
        document.getElementById('drawer-toggle').checked = false;
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    isProgrammaticNavigation = true;
    
    // Get section from URL hash or history state
    let section = 'dashboard';
    if (event.state && event.state.section) {
        section = event.state.section;
    } else {
        const hash = window.location.hash.replace('#', '');
        section = hash || 'dashboard';
    }
    
    // Navigate to the section without adding to history
    showSection(section, null, true);
    
    setTimeout(() => {
        isProgrammaticNavigation = false;
    }, 100);
});

// Warn user before leaving the website (but not for internal navigation)
let hasUnsavedChanges = false; // Set this to true when user makes changes that need saving
let alwaysWarnOnLeave = true; // Set to false if you only want to warn when there are unsaved changes

// Function to set unsaved changes flag (can be called from other modules)
window.setUnsavedChanges = function(hasChanges) {
    hasUnsavedChanges = hasChanges;
};

// Function to configure warning behavior
window.setAlwaysWarnOnLeave = function(alwaysWarn) {
    alwaysWarnOnLeave = alwaysWarn;
};

window.addEventListener('beforeunload', (event) => {
    // Only show warning if user is actually leaving the website
    // (not navigating within the dashboard via programmatic navigation)
    if (!isProgrammaticNavigation && (alwaysWarnOnLeave || hasUnsavedChanges)) {
        // Modern browsers require returnValue to be set
        event.preventDefault();
        const message = hasUnsavedChanges 
            ? 'You have unsaved changes. Are you sure you want to leave?'
            : 'Are you sure you want to leave?';
        event.returnValue = message;
        return event.returnValue;
    }
});

// Handle hash changes (direct URL navigation or external links)
window.addEventListener('hashchange', (event) => {
    if (!isProgrammaticNavigation) {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        showSection(hash, null, false);
    }
});

// Load user info
document.addEventListener('DOMContentLoaded', () => {
    // Read user info from DOM elements (already replaced by server)
    const userNameEl = document.getElementById('user-name');
    const userInitialEl = document.getElementById('user-initial');
    const profileImg = document.getElementById('user-profile-image');
    const placeholder = document.getElementById('user-avatar-placeholder');
    
    // Get values from DOM (server should have replaced placeholders)
    const userName = userNameEl ? userNameEl.textContent.trim() : 'User';
    const userInitial = userInitialEl ? userInitialEl.textContent.trim() : (userName.charAt(0).toUpperCase() || 'U');
    const profileImageUrl = profileImg ? profileImg.getAttribute('src') : '';
    
    // Update display name if it's still a placeholder
    if (userName === '{{USERNAME}}' || !userName || userName.length === 0) {
        const fallbackName = 'User';
        if (userNameEl) userNameEl.textContent = fallbackName;
        if (userInitialEl) userInitialEl.textContent = fallbackName.charAt(0).toUpperCase();
    }
    
    // Handle profile image
    if (profileImg && profileImageUrl && 
        profileImageUrl !== '{{PROFILE_IMAGE_URL}}' && 
        profileImageUrl.trim() !== '' &&
        !profileImageUrl.includes('{{')) {
        // Valid profile image URL
        profileImg.src = profileImageUrl;
        profileImg.style.display = 'block';
        profileImg.onerror = function() {
            // If image fails to load, show placeholder
            this.style.display = 'none';
            if (placeholder) {
                placeholder.style.display = 'flex';
                if (userInitialEl) {
                    const initial = userInitialEl.textContent.trim();
                    if (initial && initial !== '{{USER_INITIAL}}') {
                        placeholder.querySelector('#user-initial').textContent = initial;
                    }
                }
            }
        };
        if (placeholder) placeholder.style.display = 'none';
    } else {
        // No profile image, show placeholder with initial
        if (profileImg) profileImg.style.display = 'none';
        if (placeholder) {
            placeholder.style.display = 'flex';
            // Ensure initial is set
            const initialSpan = placeholder.querySelector('#user-initial');
            if (initialSpan && (!initialSpan.textContent || initialSpan.textContent === '{{USER_INITIAL}}')) {
                initialSpan.textContent = userInitial;
            }
        }
    }
    
    // Set initial active state
    const dashboardLink = document.querySelector('a[href="#dashboard"]');
    if (dashboardLink) {
        dashboardLink.classList.add('active');
        dashboardLink.classList.add('bg-white/30');
    }
    
    // Show dashboard cards by default
    const dashboardCards = document.getElementById('dashboard-cards');
    if (dashboardCards) {
        dashboardCards.style.display = 'grid';
    }
    
    // Hide all sections by default
    const sections = document.querySelectorAll('[id$="-section"]');
    sections.forEach(s => s.style.display = 'none');
    
    // Initialize navigation state
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    if (hash !== 'dashboard') {
        // If there's a hash, navigate to that section
        isProgrammaticNavigation = true;
        showSection(hash, null, true);
        setTimeout(() => {
            isProgrammaticNavigation = false;
        }, 100);
    } else {
        // Initialize history with dashboard
        isProgrammaticNavigation = true;
        window.history.replaceState({ section: 'dashboard' }, '', window.location.pathname + '#dashboard');
        setTimeout(() => {
            isProgrammaticNavigation = false;
        }, 100);
    }
});


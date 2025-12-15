/**
 * Navigation and User Info Management
 */

// Navigation functionality
function showSection(section, event) {
    if (event) {
        event.preventDefault();
    }
    
    // Hide all sections
    const sections = document.querySelectorAll('[id$="-section"]');
    sections.forEach(s => s.style.display = 'none');
    
    // Show selected section
    if (section === 'dashboard') {
        sections.forEach(s => s.style.display = 'block');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
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
    
    // Close drawer on mobile after selection
    if (window.innerWidth < 1024) {
        document.getElementById('drawer-toggle').checked = false;
    }
}

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
});


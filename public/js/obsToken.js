/**
 * OBS Token Management
 * Handles OBS token generation, display, and URL management
 */

let obsTokenData = null;

// Load OBS token on page load if OBS section is visible
document.addEventListener('DOMContentLoaded', async () => {
    // Check if OBS setup section exists
    if (document.getElementById('obs-setup-section')) {
        // Delay slightly to ensure page is fully loaded
        setTimeout(() => {
            loadObsToken().catch(() => {}); // Suppress all errors
        }, 100);
    }
});

async function loadObsToken() {
    try {
        const response = await fetch('/api/obs-token', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }).catch(() => null); // Suppress network errors
        
        if (!response || !response.ok) {
            // Silently handle all errors - don't log anything
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            obsTokenData = data;
            displayObsToken(data);
        } else {
            // Silently handle - don't show error
        }
    } catch (error) {
        // Suppress all errors
    }
}

function displayObsToken(data) {
    document.getElementById('obs-token-loading').classList.add('hidden');
    document.getElementById('obs-token-content').classList.remove('hidden');
    
    // Store base URL for updating
    obsTokenData = data;
    updateObsUrl();
    
    // Format date info
    const createdAt = new Date(data.createdAt);
    const lastUsed = data.lastUsedAt ? new Date(data.lastUsedAt) : null;
    let infoText = `Created: ${createdAt.toLocaleDateString()}`;
    if (lastUsed) {
        infoText += ` | Last used: ${lastUsed.toLocaleDateString()}`;
    } else {
        infoText += ' | Never used';
    }
    document.getElementById('obs-token-info').textContent = infoText;
}

function updateObsUrl() {
    if (!obsTokenData) return;
    
    const showFeedback = document.getElementById('obs-show-feedback').checked;
    let url = obsTokenData.obsUrl;
    
    // Remove existing showFeedback parameter if present
    url = url.replace(/[&?]showFeedback=[^&]*/, '');
    
    // Add showFeedback parameter
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}showFeedback=${showFeedback}`;
    
    document.getElementById('obs-url-input').value = url;
}

function showObsTokenError(message) {
    document.getElementById('obs-token-loading').innerHTML = `
        <div class="text-center py-8 text-red-400">
            <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
            <p>${escapeHtml(message)}</p>
            <button class="btn btn-primary mt-4 text-white" onclick="loadObsToken()">
                <i class="fas fa-redo"></i>
                Retry
            </button>
        </div>
    `;
}

function copyObsUrl() {
    const urlInput = document.getElementById('obs-url-input');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        // Show success feedback
        const btn = event.target.closest('button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');
        
        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-primary');
        }, 2000);
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy URL. Please copy it manually.');
    }
}

async function regenerateObsToken() {
    if (!confirm('Are you sure you want to regenerate your OBS token? You will need to update the URL in your OBS browser source.')) {
        return;
    }

    try {
        const response = await fetch('/api/obs-token/regenerate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();
        
        if (data.success) {
            obsTokenData = data;
            displayObsToken(data);
            
            // Show success message
            const toast = document.createElement('div');
            toast.className = 'toast toast-top toast-end';
            toast.innerHTML = `
                <div class="alert alert-success">
                    <span>${data.message || 'Token regenerated successfully!'}</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } else {
            alert('Error: ' + (data.message || data.error));
        }
    } catch (error) {
        console.error('Error regenerating OBS token:', error);
        alert('Failed to regenerate token: ' + error.message);
    }
}


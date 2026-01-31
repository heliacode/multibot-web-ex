/**
 * Admin Panel - Cronjob Management
 * Handles CRUD operations for scheduled article creation
 */

let cronjobs = [];

// Expose functions globally for onclick handlers
window.showAddCronjobModal = function(id = null) {
    const modal = document.getElementById('cronjob-modal');
    const form = document.getElementById('cronjob-form');
    const modalTitle = document.getElementById('modal-title');
    const cronjobIdInput = document.getElementById('cronjob-id');
    
    if (!modal) {
        console.error('[Admin] Modal not found');
        return;
    }
    
    // Reset form
    form.reset();
    cronjobIdInput.value = id || '';
    
    if (id) {
        // Edit mode
        modalTitle.textContent = 'Edit Cronjob';
        const cronjob = cronjobs.find(c => c.id === id);
        if (cronjob) {
            document.getElementById('article-title').value = cronjob.article_title || '';
            document.getElementById('cron-expression').value = cronjob.cron_expression || '';
            document.getElementById('content-template').value = cronjob.content_template || '';
            document.getElementById('keywords').value = cronjob.keywords || '';
            document.getElementById('topic').value = cronjob.topic || '';
            document.getElementById('is-active').checked = cronjob.is_active !== false;
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add Cronjob';
        document.getElementById('is-active').checked = true;
    }
    
    modal.showModal();
};

window.closeCronjobModal = function() {
    const modal = document.getElementById('cronjob-modal');
    if (modal) {
        modal.close();
    }
};

async function loadCronjobs() {
    try {
        const response = await fetch('/api/admin/cronjobs', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                console.log('[Admin] Access denied - not an admin user');
                return;
            }
            throw new Error('Failed to load cronjobs');
        }
        
        const data = await response.json();
        if (data.success) {
            cronjobs = data.cronjobs || [];
            renderCronjobs();
        }
    } catch (error) {
        console.error('[Admin] Error loading cronjobs:', error);
    }
}

function renderCronjobs() {
    const container = document.getElementById('cronjobs-list');
    if (!container) return;
    
    if (cronjobs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-clock text-6xl mb-4 animate-float"></i>
                <p>No cronjobs configured yet. Click "Add Cronjob" to create one.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cronjobs.map(cronjob => {
        const nextRun = cronjob.next_run ? new Date(cronjob.next_run).toLocaleString() : 'Not scheduled';
        const statusBadge = cronjob.is_active 
            ? '<span class="badge badge-success">Active</span>' 
            : '<span class="badge badge-error">Inactive</span>';
        
        return `
        <div class="glass-card rounded-xl p-4" data-cronjob-id="${cronjob.id}">
            <div class="flex items-center justify-between responsive-command-card">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="font-bold text-white text-lg">${escapeHtml(cronjob.article_title || 'Untitled')}</span>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                        <span><i class="fas fa-clock"></i> ${escapeHtml(cronjob.cron_expression)}</span>
                        <span><i class="fas fa-calendar"></i> Next: ${nextRun}</span>
                        ${cronjob.topic ? `<span><i class="fas fa-tag"></i> ${escapeHtml(cronjob.topic)}</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-2 responsive-command-buttons">
                    <button class="btn btn-sm btn-primary text-white" onclick="showAddCronjobModal(${cronjob.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error text-white" onclick="deleteCronjob(${cronjob.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

async function saveCronjob(event) {
    event.preventDefault();
    
    const form = event.target;
    const cronjobId = document.getElementById('cronjob-id').value;
    const isEdit = !!cronjobId;
    
    const formData = {
        article_title: document.getElementById('article-title').value,
        cron_expression: document.getElementById('cron-expression').value,
        content_template: document.getElementById('content-template').value,
        keywords: document.getElementById('keywords').value,
        topic: document.getElementById('topic').value,
        is_active: document.getElementById('is-active').checked
    };
    
    try {
        const url = isEdit ? `/api/admin/cronjobs/${cronjobId}` : '/api/admin/cronjobs';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to save cronjob');
        }
        
        if (data.success) {
            closeCronjobModal();
            await loadCronjobs();
        }
    } catch (error) {
        console.error('[Admin] Error saving cronjob:', error);
        alert('Failed to save cronjob: ' + error.message);
    }
}

async function deleteCronjob(id) {
    if (!confirm('Are you sure you want to delete this cronjob?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/cronjobs/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete cronjob');
        }
        
        if (data.success) {
            await loadCronjobs();
        }
    } catch (error) {
        console.error('[Admin] Error deleting cronjob:', error);
        alert('Failed to delete cronjob: ' + error.message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        // Set up form handler
        const form = document.getElementById('cronjob-form');
        if (form) {
            form.addEventListener('submit', saveCronjob);
        }
        
        // Load cronjobs when admin section is shown
        const originalShowSection = window.showSection;
        window.showSection = function(sectionId, event) {
            if (event) event.preventDefault();
            if (originalShowSection) {
                originalShowSection(sectionId, event);
            }
            
            if (sectionId === 'admin-section') {
                loadCronjobs();
            }
        };
    }
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

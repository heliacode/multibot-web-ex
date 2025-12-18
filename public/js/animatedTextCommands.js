/**
 * Animated Text Commands Management
 * Handles CRUD operations for animated text commands
 */

let animatedTextCommands = [];
let currentAnimatedTextEditingId = null;

/**
 * Safely get a DOM element with null checking
 * Prevents errors when extensions interfere with DOM access
 */
function safeGetElementById(id) {
    if (!id) return null;
    try {
        return document.getElementById(id) || null;
    } catch (e) {
        return null;
    }
}

/**
 * Safely get a property value from an element with optional chaining
 * Prevents "Cannot read properties of undefined" errors
 */
function safeGetValue(element, defaultValue = '') {
    if (!element) return defaultValue;
    try {
        // Try direct value access
        if (element?.value !== undefined && element?.value !== null) {
            return String(element.value);
        }
        // Try attribute access
        if (element?.getAttribute) {
            const attrValue = element.getAttribute('value') || element.getAttribute('data-last-value');
            if (attrValue) return String(attrValue);
        }
        // Try defaultValue
        if (element?.defaultValue !== undefined) {
            return String(element.defaultValue);
        }
        return defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

/**
 * Safely set a value on an element
 */
function safeSetValue(element, value) {
    if (!element) return false;
    try {
        if (element.value !== undefined) {
            element.value = String(value || '');
            // Also update data attribute as backup
            if (element.setAttribute) {
                element.setAttribute('data-last-value', String(value || ''));
            }
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Safely focus an element, catching errors from browser extensions
 * This prevents extension errors from breaking our code
 */
function safeFocus(element) {
    if (!element) return;
    try {
        // Use setTimeout to avoid triggering extension errors during validation
        setTimeout(() => {
            try {
                if (element?.focus) {
                    element.focus();
                }
            } catch (e) {
                // Silently ignore focus errors (usually from browser extensions)
            }
        }, 10);
    } catch (e) {
        // Silently ignore
    }
}

// Track if commands have been loaded
let animatedTextCommandsLoaded = false;

// Ensure DOM is ready before running code
function ensureDOMReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        // DOM is already ready
        callback();
    }
}

// Load animated text commands on page load
ensureDOMReady(() => {
    // Use Intersection Observer to detect when section becomes visible
    try {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry?.isIntersecting && !animatedTextCommandsLoaded) {
                    animatedTextCommandsLoaded = true;
                    loadAnimatedTextCommands().catch(() => {});
                }
            });
        }, { threshold: 0.1 });
        
        const section = safeGetElementById('animated-text-section');
        if (section) {
            try {
                observer.observe(section);
            } catch (e) {
                // Ignore observer errors
            }
        }
        
        // Also try loading immediately if section is already visible
        if (section && section?.style?.display !== 'none') {
            setTimeout(() => {
                if (!animatedTextCommandsLoaded) {
                    animatedTextCommandsLoaded = true;
                    loadAnimatedTextCommands().catch(() => {});
                }
            }, 100);
        }
    } catch (e) {
        // Ignore initialization errors
    }
});

// Expose function to be called when section is shown
window.ensureAnimatedTextCommandsLoaded = function() {
    if (!animatedTextCommandsLoaded) {
        animatedTextCommandsLoaded = true;
        loadAnimatedTextCommands().catch(() => {});
    }
};

async function loadAnimatedTextCommands() {
    try {
        const response = await fetch('/api/animated-text-commands', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }).catch(() => null);
        
        if (!response || !response.ok) {
            return;
        }
        
        const data = await response.json();
        if (data.success) {
            animatedTextCommands = data.commands;
            renderAnimatedTextCommands();
        }
    } catch (error) {
        // Suppress errors
    }
}

function renderAnimatedTextCommands() {
    const container = safeGetElementById('animated-text-commands-list');
    if (!container) return;

    if (animatedTextCommands.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-text-width text-6xl mb-4 animate-float"></i>
                <p>No animated text commands yet. Click "Add Command" to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = animatedTextCommands.map(cmd => `
        <div class="glass-card rounded-xl p-4" data-command-id="${cmd.id}">
            <div class="flex items-center justify-between responsive-command-card">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="font-bold text-white text-lg break-words">!${escapeHtml(cmd.command)}</span>
                        <span class="badge ${cmd.is_active ? 'badge-success' : 'badge-error'}">${cmd.is_active ? 'Active' : 'Inactive'}</span>
                        <span class="badge badge-info">${cmd.animation_type || 'neon'}</span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                        ${cmd.text_content ? `<span><i class="fas fa-font"></i> Default: "${escapeHtml(cmd.text_content)}"</span>` : '<span><i class="fas fa-font"></i> <span class="badge badge-info">Dynamic from chat</span></span>'}
                        <span><i class="fas fa-clock"></i> ${Math.round((cmd.duration || 5000) / 1000)}s</span>
                        <span><i class="fas fa-crosshairs"></i> (${cmd.position_x || 960}, ${cmd.position_y || 540})</span>
                        <span><i class="fas fa-text-height"></i> ${cmd.font_size || 48}px</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 responsive-command-buttons">
                    <button class="btn btn-sm btn-info text-white" onclick="testAnimatedTextCommand('${escapeHtml(cmd.command)}')" title="Test command - sends to OBS source">
                        <i class="fas fa-vial"></i> Test
                    </button>
                    <button class="btn btn-sm btn-primary text-white" onclick="editAnimatedTextCommand(${cmd.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error text-white" onclick="deleteAnimatedTextCommand(${cmd.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showAddAnimatedTextCommandModal() {
    currentAnimatedTextEditingId = null;
    
    const modal = safeGetElementById('animated-text-command-modal');
    const form = safeGetElementById('animated-text-command-form');
    
    if (form) {
        // Set values BEFORE reset to ensure they persist
        const animationTypeSelect = safeGetElementById('animated-text-animation-type');
        if (animationTypeSelect) {
            try {
                animationTypeSelect.value = 'neon';
                animationTypeSelect.selectedIndex = 0;
            } catch (e) {
                // Ignore extension errors
            }
        }
        
        try {
            form.reset();
        } catch (e) {
            // Ignore reset errors
        }
        
        // Set values AFTER reset to ensure they stick - use safe setters
        const titleEl = safeGetElementById('animated-text-modal-title');
        if (titleEl?.textContent !== undefined) {
            titleEl.textContent = 'Add Animated Text Command';
        }
        
        safeSetValue(safeGetElementById('animated-text-text-content'), '');
        
        if (animationTypeSelect) {
            try {
                animationTypeSelect.value = 'neon';
                animationTypeSelect.selectedIndex = 0;
                // Force the value multiple ways
                if (animationTypeSelect.setAttribute) {
                    animationTypeSelect.setAttribute('value', 'neon');
                }
                // Remove any validation attributes
                if (animationTypeSelect.removeAttribute) {
                    animationTypeSelect.removeAttribute('required');
                }
            } catch (e) {
                // Ignore extension errors
            }
        }
        
        safeSetValue(safeGetElementById('animated-text-position-x'), '960');
        safeSetValue(safeGetElementById('animated-text-position-y'), '540');
        safeSetValue(safeGetElementById('animated-text-font-size'), '48');
        safeSetValue(safeGetElementById('animated-text-duration'), '5');
        safeSetValue(safeGetElementById('animated-text-color1'), '#ff005e');
        safeSetValue(safeGetElementById('animated-text-color2'), '#00d4ff');
        safeSetValue(safeGetElementById('animated-text-font-family'), 'Arial');
        updateAnimationTypeUI();
    }
    
    if (modal?.showModal) {
        try {
            modal.showModal();
        } catch (e) {
            // Fallback if showModal fails
            if (modal.open !== undefined) {
                modal.open = true;
            }
        }
    }
}

function editAnimatedTextCommand(id) {
    const command = animatedTextCommands.find(cmd => cmd?.id === id);
    if (!command) return;
    
    currentAnimatedTextEditingId = id;
    
    const modal = safeGetElementById('animated-text-command-modal');
    const form = safeGetElementById('animated-text-command-form');
    
    if (form) {
        const titleEl = safeGetElementById('animated-text-modal-title');
        if (titleEl?.textContent !== undefined) {
            titleEl.textContent = 'Edit Animated Text Command';
        }
        
        safeSetValue(safeGetElementById('animated-text-command-input'), command?.command || '');
        safeSetValue(safeGetElementById('animated-text-text-content'), command?.text_content || '');
        
        const animationTypeSelect = safeGetElementById('animated-text-animation-type');
        if (animationTypeSelect) {
            try {
                const animType = command?.animation_type || 'neon';
                animationTypeSelect.value = animType;
                // Ensure the value is properly set
                if (animationTypeSelect.value !== animType && animationTypeSelect.options) {
                    // If value didn't set, find and select the option
                    const options = animationTypeSelect.options;
                    for (let i = 0; i < options.length; i++) {
                        if (options[i]?.value === animType) {
                            animationTypeSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                // Remove any validation attributes
                if (animationTypeSelect.removeAttribute) {
                    animationTypeSelect.removeAttribute('required');
                }
                if (animationTypeSelect.setAttribute) {
                    animationTypeSelect.setAttribute('data-validated', 'true');
                }
            } catch (e) {
                // Ignore extension errors
            }
        }
        
        safeSetValue(safeGetElementById('animated-text-position-x'), command?.position_x || 960);
        safeSetValue(safeGetElementById('animated-text-position-y'), command?.position_y || 540);
        safeSetValue(safeGetElementById('animated-text-font-size'), command?.font_size || 48);
        // Convert milliseconds to seconds for display (like GIF commands)
        safeSetValue(safeGetElementById('animated-text-duration'), Math.round((command?.duration || 5000) / 1000));
        safeSetValue(safeGetElementById('animated-text-color1'), command?.color1 || '#ff005e');
        safeSetValue(safeGetElementById('animated-text-color2'), command?.color2 || '#00d4ff');
        safeSetValue(safeGetElementById('animated-text-font-family'), command?.font_family || 'Arial');
        updateAnimationTypeUI();
    }
    
    if (modal?.showModal) {
        try {
            modal.showModal();
        } catch (e) {
            // Fallback if showModal fails
            if (modal.open !== undefined) {
                modal.open = true;
            }
        }
    }
}

// Make function globally accessible
window.updateAnimationTypeUI = function() {
    const animationTypeSelect = safeGetElementById('animated-text-animation-type');
    const animationType = safeGetValue(animationTypeSelect, 'neon');
    const neonOptions = safeGetElementById('animated-text-neon-options');
    const threeDOptions = safeGetElementById('animated-text-3d-options');
    
    try {
        if (animationType === 'neon') {
            if (neonOptions?.style) neonOptions.style.display = 'block';
            if (threeDOptions?.style) threeDOptions.style.display = 'none';
        } else if (animationType === '3d') {
            if (neonOptions?.style) neonOptions.style.display = 'none';
            if (threeDOptions?.style) threeDOptions.style.display = 'block';
        }
    } catch (e) {
        // Ignore extension errors
    }
};

// Also make other functions globally accessible
window.showAddAnimatedTextCommandModal = showAddAnimatedTextCommandModal;
window.editAnimatedTextCommand = editAnimatedTextCommand;
window.saveAnimatedTextCommand = saveAnimatedTextCommand;
window.deleteAnimatedTextCommand = deleteAnimatedTextCommand;
window.testAnimatedTextCommand = testAnimatedTextCommand;

async function saveAnimatedTextCommand(event) {
    // Aggressively prevent default form behavior
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.returnValue = false;
    }
    
    // Small delay to ensure any extension modifications are complete
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Get all form fields using safe getters
    const commandInput = safeGetElementById('animated-text-command-input');
    const animationTypeSelect = safeGetElementById('animated-text-animation-type');
    
    if (!commandInput) {
        alert('Command input field not found');
        return false;
    }
    
    if (!animationTypeSelect) {
        alert('Animation type field not found');
        return false;
    }
    
    // Ensure animation type select always has a value
    try {
        const currentValue = safeGetValue(animationTypeSelect, '');
        if (!currentValue || currentValue === '') {
            safeSetValue(animationTypeSelect, 'neon');
            if (animationTypeSelect.selectedIndex !== undefined) {
                animationTypeSelect.selectedIndex = 0;
            }
        }
    } catch (e) {
        // Ignore extension errors, default will be handled later
    }
    
    // Validate command - use safe getter with multiple fallbacks
    let commandValue = safeGetValue(commandInput, '').trim();
    
    // Final validation - if still empty after all attempts
    if (!commandValue || commandValue.length === 0) {
        alert('Command is required. Please enter a command name (e.g., !neon or !test)\n\nTip: If you already entered a command, try clicking in the field and typing it again, or disable browser extensions temporarily.');
        safeFocus(commandInput);
        return false;
    }
    
    // Remove ! prefix if present
    commandValue = commandValue.replace(/^!+/, '').trim(); // Remove one or more ! prefixes
    
    // Check if we have a valid command after removing !
    if (!commandValue || commandValue.length === 0) {
        alert('Command is required (enter a command name after the !)');
        safeFocus(commandInput);
        return false;
    }
    
    // Validate command pattern (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(commandValue)) {
        alert('Command can only contain letters, numbers, and underscores');
        safeFocus(commandInput);
        return false;
    }
    
    // Validate animation type - ensure it has a value using safe getter
    let animationType = safeGetValue(animationTypeSelect, 'neon');
    if (!animationType || animationType === '' || (animationType !== 'neon' && animationType !== '3d')) {
        // Default to neon if invalid
        animationType = 'neon';
        safeSetValue(animationTypeSelect, 'neon');
        try {
            if (animationTypeSelect.selectedIndex !== undefined) {
                animationTypeSelect.selectedIndex = 0;
            }
        } catch (e) {
            // Ignore
        }
    }
    
    // Get all form values using safe getters
    // Convert seconds to milliseconds for backend (like GIF commands do)
    const durationSeconds = parseInt(safeGetValue(safeGetElementById('animated-text-duration'), '5')) || 5;
    const durationMs = durationSeconds * 1000;
    
    const formData = {
        command: commandValue,
        textContent: safeGetValue(safeGetElementById('animated-text-text-content'), '').trim() || null,
        animationType: animationType || 'neon', // Ensure we always have a value
        positionX: parseInt(safeGetValue(safeGetElementById('animated-text-position-x'), '960')) || 960,
        positionY: parseInt(safeGetValue(safeGetElementById('animated-text-position-y'), '540')) || 540,
        fontSize: parseInt(safeGetValue(safeGetElementById('animated-text-font-size'), '48')) || 48,
        duration: durationMs,
        color1: safeGetValue(safeGetElementById('animated-text-color1'), '#ff005e'),
        color2: safeGetValue(safeGetElementById('animated-text-color2'), '#00d4ff'),
        fontFamily: safeGetValue(safeGetElementById('animated-text-font-family'), 'Arial')
    };
    
    // Validate numeric fields using safe getters
    if (isNaN(formData.positionX) || formData.positionX < 0 || formData.positionX > 1920) {
        alert('X Position must be between 0 and 1920');
        safeFocus(safeGetElementById('animated-text-position-x'));
        return false;
    }
    
    if (isNaN(formData.positionY) || formData.positionY < 0 || formData.positionY > 1080) {
        alert('Y Position must be between 0 and 1080');
        safeFocus(safeGetElementById('animated-text-position-y'));
        return false;
    }
    
    if (isNaN(formData.fontSize) || formData.fontSize < 12 || formData.fontSize > 200) {
        alert('Font Size must be between 12 and 200');
        safeFocus(safeGetElementById('animated-text-font-size'));
        return false;
    }
    
    // Validate duration in seconds (1-30), matching GIF commands
    if (isNaN(durationSeconds) || durationSeconds < 1 || durationSeconds > 30) {
        alert('Duration must be between 1 and 30 seconds');
        safeFocus(safeGetElementById('animated-text-duration'));
        return false;
    }
    
    // textContent is optional - if empty, it will use text from chat
    
    try {
        const url = currentAnimatedTextEditingId 
            ? `/api/animated-text-commands/${currentAnimatedTextEditingId}`
            : '/api/animated-text-commands';
        const method = currentAnimatedTextEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data?.success) {
            const modal = safeGetElementById('animated-text-command-modal');
            if (modal?.close) {
                try {
                    modal.close();
                } catch (e) {
                    // Fallback
                    if (modal.open !== undefined) {
                        modal.open = false;
                    }
                }
            }
            await loadAnimatedTextCommands();
        } else {
            alert(data?.error || 'Failed to save animated text command');
        }
    } catch (error) {
        console.error('Error saving animated text command:', error);
        alert('Failed to save animated text command');
    }
    
    return false; // Always return false to prevent form submission
}

async function deleteAnimatedTextCommand(id) {
    if (!confirm('Are you sure you want to delete this animated text command?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/animated-text-commands/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadAnimatedTextCommands();
        } else {
            alert(data.error || 'Failed to delete animated text command');
        }
    } catch (error) {
        console.error('Error deleting animated text command:', error);
        alert('Failed to delete animated text command');
    }
}

// Test animated text command by simulating a chat message
async function testAnimatedTextCommand(command) {
    try {
        const response = await fetch('/api/test/simulate-command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success feedback
            const buttons = document.querySelectorAll(`button[onclick*="testAnimatedTextCommand('${escapeHtml(command)}')"]`);
            buttons.forEach(button => {
                const originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Sent';
                button.classList.add('btn-success');
                button.classList.remove('btn-info');
                
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.classList.remove('btn-success');
                    button.classList.add('btn-info');
                }, 2000);
            });
        } else {
            alert(`Failed to test command: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error testing command:', error);
        alert('Failed to test command. Please try again.');
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

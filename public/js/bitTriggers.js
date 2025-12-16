// Bit Triggers Management
let bitTriggers = [];
let currentBitEditingId = null;
let triggersLoaded = false;

// Load bit triggers on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with loading state
    showLoadingState();
    
    // Load triggers when bits section becomes visible
    observeBitsSection();
});

// Observe when bits section becomes visible and load triggers
function observeBitsSection() {
    const bitsSection = document.getElementById('bits-section');
    if (!bitsSection) return;
    
    // Use Intersection Observer to detect when section becomes visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !triggersLoaded) {
                loadBitTriggers();
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(bitsSection);
    
    // Also listen for manual navigation (when section is shown via showSection)
    // Check periodically if section is visible and not loaded
    const checkVisibility = setInterval(() => {
        if (bitsSection.style.display !== 'none' && !triggersLoaded) {
            loadBitTriggers();
        }
        if (triggersLoaded) {
            clearInterval(checkVisibility);
        }
    }, 500);
    
    // Clean up after 30 seconds
    setTimeout(() => clearInterval(checkVisibility), 30000);
}

// Function to manually trigger load when section is shown via navigation
function ensureBitTriggersLoaded() {
    const bitsSection = document.getElementById('bits-section');
    if (bitsSection && bitsSection.style.display !== 'none' && !triggersLoaded) {
        loadBitTriggers();
    }
}

function showLoadingState() {
    const container = document.getElementById('bit-triggers-list');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-spinner fa-spin text-6xl mb-4"></i>
                <p>Loading bit triggers...</p>
            </div>
        `;
    }
}

async function loadBitTriggers() {
    if (triggersLoaded) return; // Prevent multiple simultaneous loads
    
    const container = document.getElementById('bit-triggers-list');
    if (!container) {
        console.error('bit-triggers-list container not found');
        return;
    }
    
    showLoadingState();
    
    try {
        const response = await fetch('/api/bit-triggers', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load bit triggers');
        }
        
        const data = await response.json();
        bitTriggers = data.triggers || [];
        triggersLoaded = true;
        renderBitTriggers();
    } catch (error) {
        console.error('Error loading bit triggers:', error);
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Error loading bit triggers. Please refresh the page.</p>
                <button class="btn btn-primary btn-sm mt-4 text-white" onclick="reloadBitTriggers()">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
        triggersLoaded = false;
    }
}

// Function to reload triggers (called by retry button)
function reloadBitTriggers() {
    triggersLoaded = false;
    loadBitTriggers();
}

function renderBitTriggers() {
    const container = document.getElementById('bit-triggers-list');
    
    if (!bitTriggers || bitTriggers.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-coins text-6xl mb-4 animate-float"></i>
                <p>No bit triggers yet. Click "Add Trigger" to create one.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = bitTriggers.map(trigger => {
        const isDedicated = trigger.is_dedicated;
        return `
        <div class="glass-card rounded-xl p-4" data-trigger-id="${trigger.id}">
            <div class="flex items-center justify-between responsive-command-card">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="font-bold text-white text-lg">
                            <i class="fas fa-coins"></i> ${trigger.bit_amount} bits
                        </span>
                        <span class="badge ${trigger.is_active ? 'badge-success' : 'badge-error'}">
                            ${trigger.is_active ? 'Active' : 'Inactive'}
                        </span>
                        ${isDedicated ? `
                            <span class="badge badge-warning">
                                <i class="fas fa-gift"></i> Bits Only
                            </span>
                        ` : `
                            <span class="badge badge-info">
                                ${trigger.command_type === 'audio' ? 'Audio' : 'GIF'}
                            </span>
                        `}
                    </div>
                    ${isDedicated ? `
                        <div class="text-sm text-white/70">
                            <span><i class="fas fa-image"></i> ${trigger.dedicated_gif_title || 'Thank You GIF'}</span>
                        </div>
                        ${trigger.dedicated_gif_url ? `
                            <img src="${trigger.dedicated_gif_url}" alt="GIF preview" class="mt-2 max-w-xs rounded" style="max-height: 100px;">
                        ` : ''}
                    ` : `
                        <div class="text-sm text-white/70">
                            <span><i class="fas fa-command"></i> ${trigger.command_name || 'Unknown command'}</span>
                        </div>
                    `}
                </div>
                <div class="flex items-center gap-2 responsive-command-buttons">
                    <button class="btn btn-sm btn-info text-white" onclick="testBitTrigger(${trigger.bit_amount})" title="Test bits trigger">
                        <i class="fas fa-vial"></i> Test
                    </button>
                    <button class="btn btn-sm btn-primary text-white" onclick="editBitTrigger(${trigger.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error text-white" onclick="deleteBitTrigger(${trigger.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Dedicated GIF state
let selectedDedicatedGif = null;

function toggleBitTriggerType() {
    const triggerType = document.getElementById('bit-trigger-type').value;
    const commandSection = document.getElementById('bit-command-section');
    const dedicatedSection = document.getElementById('bit-dedicated-section');
    
    if (triggerType === 'dedicated') {
        commandSection.style.display = 'none';
        dedicatedSection.style.display = 'block';
        // Remove required from command fields
        document.getElementById('bit-command-type').removeAttribute('required');
        document.getElementById('bit-command-id').removeAttribute('required');
        // Load trending GIFs
        loadTrendingGifsForBitTrigger();
    } else {
        commandSection.style.display = 'block';
        dedicatedSection.style.display = 'none';
        // Add required back to command fields
        document.getElementById('bit-command-type').setAttribute('required', 'required');
        document.getElementById('bit-command-id').setAttribute('required', 'required');
        // Clear dedicated GIF
        clearBitDedicatedGif();
    }
}

function showAddBitTriggerModal() {
    currentBitEditingId = null;
    selectedDedicatedGif = null;
    document.getElementById('bit-trigger-modal-title').textContent = 'Add Bits Trigger';
    document.getElementById('bit-trigger-form').reset();
    document.getElementById('bit-trigger-type').value = 'command';
    document.getElementById('bit-command-id').innerHTML = '<option value="" style="background-color: #1f2937; color: white;">Select a command...</option>';
    toggleBitTriggerType();
    document.getElementById('bit-trigger-modal').showModal();
    
    // Load commands for selection
    loadCommandsForBitTrigger();
}

async function loadCommandsForBitTrigger() {
    const commandType = document.getElementById('bit-command-type').value;
    const commandSelect = document.getElementById('bit-command-id');
    
    if (!commandType) {
        commandSelect.innerHTML = '<option value="" style="background-color: #1f2937; color: white;">Select a command...</option>';
        return;
    }
    
    try {
        let commands = [];
        if (commandType === 'audio') {
            const response = await fetch('/api/audio-commands', { credentials: 'include' });
            const data = await response.json();
            commands = data.commands || [];
        } else if (commandType === 'gif') {
            const response = await fetch('/api/gif-commands', { credentials: 'include' });
            const data = await response.json();
            commands = data.commands || [];
        }
        
        commandSelect.innerHTML = '<option value="" style="background-color: #1f2937; color: white;">Select a command...</option>' +
            commands.filter(cmd => cmd.is_active).map(cmd => `
                <option value="${cmd.id}" style="background-color: #1f2937; color: white;">
                    !${cmd.command}
                </option>
            `).join('');
    } catch (error) {
        console.error('Error loading commands:', error);
    }
}

function updateBitCommandList() {
    loadCommandsForBitTrigger();
}

function editBitTrigger(id) {
    const trigger = bitTriggers.find(t => t.id === id);
    if (!trigger) return;
    
    currentBitEditingId = id;
    document.getElementById('bit-trigger-modal-title').textContent = 'Edit Bits Trigger';
    
    document.getElementById('bit-amount').value = trigger.bit_amount;
    
    // Check if it's a dedicated trigger or command-based
    if (trigger.is_dedicated && trigger.dedicated_gif_url) {
        document.getElementById('bit-trigger-type').value = 'dedicated';
        selectedDedicatedGif = {
            url: trigger.dedicated_gif_url,
            id: trigger.dedicated_gif_id || null,
            title: trigger.dedicated_gif_title || 'Thank You!'
        };
        document.getElementById('bit-dedicated-position').value = trigger.dedicated_gif_position || 'center';
        document.getElementById('bit-dedicated-size').value = trigger.dedicated_gif_size || 'medium';
        document.getElementById('bit-dedicated-duration').value = trigger.dedicated_gif_duration || 5000;
        updateDedicatedGifPreview();
    } else {
        document.getElementById('bit-trigger-type').value = 'command';
        document.getElementById('bit-command-type').value = trigger.command_type;
        // Load commands and then set the selected command
        loadCommandsForBitTrigger().then(() => {
            setTimeout(() => {
                document.getElementById('bit-command-id').value = trigger.command_id;
            }, 100);
        });
    }
    
    toggleBitTriggerType();
    document.getElementById('bit-trigger-modal').showModal();
}

async function deleteBitTrigger(id) {
    if (!confirm('Are you sure you want to delete this bit trigger?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/bit-triggers/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete bit trigger');
        }
        
        triggersLoaded = false; // Reset to allow reload
        await loadBitTriggers();
    } catch (error) {
        console.error('Error deleting bit trigger:', error);
        alert('Failed to delete bit trigger. Please try again.');
    }
}

async function saveBitTrigger() {
    const bitAmount = parseInt(document.getElementById('bit-amount').value);
    const triggerType = document.getElementById('bit-trigger-type').value;
    
    if (!bitAmount) {
        alert('Please enter a bit amount');
        return;
    }
    
    let requestBody = { bitAmount };
    
    if (triggerType === 'dedicated') {
        if (!selectedDedicatedGif || !selectedDedicatedGif.url) {
            alert('Please select a GIF for the dedicated trigger');
            return;
        }
        requestBody.isDedicated = true;
        requestBody.dedicatedGifUrl = selectedDedicatedGif.url;
        requestBody.dedicatedGifId = selectedDedicatedGif.id || null;
        requestBody.dedicatedGifTitle = selectedDedicatedGif.title || 'Thank You!';
        requestBody.dedicatedGifPosition = document.getElementById('bit-dedicated-position').value;
        requestBody.dedicatedGifSize = document.getElementById('bit-dedicated-size').value;
        requestBody.dedicatedGifDuration = parseInt(document.getElementById('bit-dedicated-duration').value) || 5000;
    } else {
        const commandType = document.getElementById('bit-command-type').value;
        const commandId = parseInt(document.getElementById('bit-command-id').value);
        
        if (!commandType || !commandId) {
            alert('Please select a command type and command');
            return;
        }
        
        requestBody.isDedicated = false;
        requestBody.commandType = commandType;
        requestBody.commandId = commandId;
    }
    
    try {
        const url = currentBitEditingId 
            ? `/api/bit-triggers/${currentBitEditingId}`
            : '/api/bit-triggers';
        
        const method = currentBitEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save bit trigger');
        }
        
        closeBitTriggerModal();
        triggersLoaded = false; // Reset to allow reload
        await loadBitTriggers();
    } catch (error) {
        console.error('Error saving bit trigger:', error);
        alert(`Failed to save bit trigger: ${error.message}`);
    }
}

function closeBitTriggerModal() {
    document.getElementById('bit-trigger-modal').close();
    currentBitEditingId = null;
    selectedDedicatedGif = null;
    clearBitDedicatedGif();
}

// Test bit trigger by simulating a bits donation
async function testBitTrigger(bitAmount) {
    try {
        const response = await fetch('/api/test/simulate-bits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                bits: bitAmount, 
                username: 'test_viewer' 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success feedback
            const buttons = document.querySelectorAll(`button[onclick*="testBitTrigger(${bitAmount})"]`);
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
            alert(`Failed to test bits trigger: ${data.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error testing bits trigger:', error);
        alert('Failed to test bits trigger. Please try again.');
    }
}

// Giphy search for dedicated triggers
let bitTriggerSearchTimeout = null;

async function searchGiphyForBitTrigger(query) {
    if (!query || query.trim().length < 2) {
        return;
    }
    
    if (bitTriggerSearchTimeout) {
        clearTimeout(bitTriggerSearchTimeout);
    }
    
    bitTriggerSearchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/gif-commands/giphy/search?q=${encodeURIComponent(query)}&limit=25`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to search GIFs');
            }
            
            const data = await response.json();
            renderGiphyResultsForBitTrigger(data.gifs || []);
        } catch (error) {
            console.error('Error searching GIFs:', error);
            document.getElementById('bit-dedicated-giphy-results').innerHTML = `
                <div class="text-center py-8 text-white/60">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                    <p>Error searching GIFs. Please try again.</p>
                </div>
            `;
        }
    }, 300);
}

async function loadTrendingGifsForBitTrigger() {
    const resultsDiv = document.getElementById('bit-dedicated-giphy-results');
    resultsDiv.innerHTML = `
        <div class="text-center py-8 text-white/60">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading trending GIFs...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/gif-commands/giphy/trending?limit=25', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load trending GIFs');
        }
        
        const data = await response.json();
        renderGiphyResultsForBitTrigger(data.gifs || []);
    } catch (error) {
        console.error('Error loading trending GIFs:', error);
        resultsDiv.innerHTML = `
            <div class="text-center py-8 text-white/60">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Error loading trending GIFs. Please try again.</p>
            </div>
        `;
    }
}

function renderGiphyResultsForBitTrigger(gifs) {
    const resultsDiv = document.getElementById('bit-dedicated-giphy-results');
    
    if (!gifs || gifs.length === 0) {
        resultsDiv.innerHTML = `
            <div class="text-center py-8 text-white/60">
                <p>No GIFs found. Try a different search.</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = `
        <div class="grid grid-cols-3 gap-2">
            ${gifs.map(gif => `
                <div class="cursor-pointer hover:opacity-80 transition-opacity" onclick="selectDedicatedGif({
                    id: '${gif.id}',
                    url: '${gif.url.replace(/'/g, "\\'")}',
                    title: '${(gif.title || 'GIF').replace(/'/g, "\\'")}'
                })">
                    <img src="${gif.preview || gif.url}" alt="${gif.title || 'GIF'}" class="w-full h-24 object-cover rounded" />
                </div>
            `).join('')}
        </div>
    `;
}

function selectDedicatedGif(gif) {
    selectedDedicatedGif = gif;
    updateDedicatedGifPreview();
}

function updateDedicatedGifPreview() {
    const previewDiv = document.getElementById('bit-dedicated-gif-preview');
    const previewImg = document.getElementById('bit-dedicated-gif-preview-img');
    const previewUrl = document.getElementById('bit-dedicated-gif-url');
    
    if (selectedDedicatedGif && selectedDedicatedGif.url) {
        previewDiv.classList.remove('hidden');
        previewImg.src = selectedDedicatedGif.url;
        previewUrl.textContent = selectedDedicatedGif.title || selectedDedicatedGif.url;
    } else {
        previewDiv.classList.add('hidden');
    }
}

function clearBitDedicatedGif() {
    selectedDedicatedGif = null;
    updateDedicatedGifPreview();
}

// Export functions for use in HTML
window.showAddBitTriggerModal = showAddBitTriggerModal;
window.editBitTrigger = editBitTrigger;
window.deleteBitTrigger = deleteBitTrigger;
window.closeBitTriggerModal = closeBitTriggerModal;
window.updateBitCommandList = updateBitCommandList;
window.saveBitTrigger = saveBitTrigger;
window.testBitTrigger = testBitTrigger;
window.reloadBitTriggers = reloadBitTriggers;
window.ensureBitTriggersLoaded = ensureBitTriggersLoaded;
window.toggleBitTriggerType = toggleBitTriggerType;
window.searchGiphyForBitTrigger = searchGiphyForBitTrigger;
window.loadTrendingGifsForBitTrigger = loadTrendingGifsForBitTrigger;
window.selectDedicatedGif = selectDedicatedGif;
window.clearBitDedicatedGif = clearBitDedicatedGif;


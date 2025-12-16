// Bit Triggers Management
let bitTriggers = [];
let currentBitEditingId = null;

// Load bit triggers on page load
document.addEventListener('DOMContentLoaded', () => {
    loadBitTriggers();
});

async function loadBitTriggers() {
    try {
        const response = await fetch('/api/bit-triggers', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load bit triggers');
        }
        
        const data = await response.json();
        bitTriggers = data.triggers || [];
        renderBitTriggers();
    } catch (error) {
        console.error('Error loading bit triggers:', error);
        document.getElementById('bit-triggers-list').innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Error loading bit triggers. Please refresh the page.</p>
            </div>
        `;
    }
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
    
    container.innerHTML = bitTriggers.map(trigger => `
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
                        <span class="badge badge-info">
                            ${trigger.command_type === 'audio' ? 'Audio' : 'GIF'}
                        </span>
                    </div>
                    <div class="text-sm text-white/70">
                        <span><i class="fas fa-command"></i> ${trigger.command_name || 'Unknown command'}</span>
                    </div>
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
    `).join('');
}

function showAddBitTriggerModal() {
    currentBitEditingId = null;
    document.getElementById('bit-trigger-modal-title').textContent = 'Add Bits Trigger';
    document.getElementById('bit-trigger-form').reset();
    document.getElementById('bit-command-id').innerHTML = '<option value="" style="background-color: #1f2937; color: white;">Select a command...</option>';
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
    document.getElementById('bit-command-type').value = trigger.command_type;
    
    // Load commands and then set the selected command
    loadCommandsForBitTrigger().then(() => {
        setTimeout(() => {
            document.getElementById('bit-command-id').value = trigger.command_id;
        }, 100);
    });
    
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
        
        await loadBitTriggers();
    } catch (error) {
        console.error('Error deleting bit trigger:', error);
        alert('Failed to delete bit trigger. Please try again.');
    }
}

async function saveBitTrigger() {
    const bitAmount = parseInt(document.getElementById('bit-amount').value);
    const commandType = document.getElementById('bit-command-type').value;
    const commandId = parseInt(document.getElementById('bit-command-id').value);
    
    if (!bitAmount || !commandType || !commandId) {
        alert('Please fill in all fields');
        return;
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
            body: JSON.stringify({
                bitAmount,
                commandType,
                commandId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save bit trigger');
        }
        
        closeBitTriggerModal();
        await loadBitTriggers();
    } catch (error) {
        console.error('Error saving bit trigger:', error);
        alert(`Failed to save bit trigger: ${error.message}`);
    }
}

function closeBitTriggerModal() {
    document.getElementById('bit-trigger-modal').close();
    currentBitEditingId = null;
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

// Export functions for use in HTML
window.showAddBitTriggerModal = showAddBitTriggerModal;
window.editBitTrigger = editBitTrigger;
window.deleteBitTrigger = deleteBitTrigger;
window.closeBitTriggerModal = closeBitTriggerModal;
window.updateBitCommandList = updateBitCommandList;
window.saveBitTrigger = saveBitTrigger;
window.testBitTrigger = testBitTrigger;


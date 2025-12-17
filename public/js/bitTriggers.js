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
                            <span><i class="fas fa-tag"></i> <strong>${trigger.command_name || 'Unnamed Trigger'}</strong></span>
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

// Bit trigger state - GIF modal
let gifBitTriggerSelectedGif = null;
let gifBitTriggerSearchTimeout = null;

// Bit trigger state - Audio modal
let audioBitTriggerSelectedFile = null;
let audioBitTriggerUploadMethod = 'file';

function showAddGifBitTriggerModal() {
    currentBitEditingId = null;
    gifBitTriggerSelectedGif = null;
    
    // Update modal title
    document.getElementById('bit-gif-trigger-modal-title').textContent = 'Add GIF Bits Trigger';
    
    // Reset form
    document.getElementById('bit-gif-trigger-form').reset();
    
    // Clear GIF results
    const resultsDiv = document.getElementById('bit-gif-trigger-giphy-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }
    
    // Clear preview
    const previewDiv = document.getElementById('bit-gif-trigger-preview');
    if (previewDiv) previewDiv.classList.add('hidden');
    
    // Open modal
    document.getElementById('bit-gif-trigger-modal').showModal();
    
    // Load trending GIFs
    loadTrendingGifsForGifBitTrigger();
}

function showAddAudioBitTriggerModal() {
    currentBitEditingId = null;
    audioBitTriggerSelectedFile = null;
    audioBitTriggerUploadMethod = 'file';
    
    // Update modal title
    document.getElementById('bit-audio-trigger-modal-title').textContent = 'Add Audio Bits Trigger';
    
    // Reset form
    document.getElementById('bit-audio-trigger-form').reset();
    
    // Reset volume
    const volumeSlider = document.getElementById('bit-audio-trigger-volume-slider');
    if (volumeSlider) {
        volumeSlider.value = 50;
        updateAudioBitTriggerVolumeDisplay(50);
    }
    
    // Reset upload method
    switchAudioBitTriggerUploadMethod('file');
    
    // Clear file info
    clearAudioBitTriggerFile();
    
    // Open modal
    document.getElementById('bit-audio-trigger-modal').showModal();
}

async function editBitTrigger(id) {
    const trigger = bitTriggers.find(t => t.id === id);
    if (!trigger) return;
    
    currentBitEditingId = id;
    
    try {
        // Fetch full trigger details including command data
        const response = await fetch(`/api/bit-triggers/${id}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load trigger details');
        }
        
        const data = await response.json();
        const fullTrigger = data.trigger;
        
        // Load command details based on type
        if (fullTrigger.command_type === 'gif') {
            // Fetch GIF command details
            const gifResponse = await fetch(`/api/gif-commands/${fullTrigger.command_id}`, {
                credentials: 'include'
            });
            
            if (!gifResponse.ok) {
                throw new Error('Failed to load GIF command');
            }
            
            const gifData = await gifResponse.json();
            const gifCommand = gifData.command;
            
            // Update modal title
            document.getElementById('bit-gif-trigger-modal-title').textContent = 'Edit GIF Bits Trigger';
            
            // Populate form
            document.getElementById('bit-gif-trigger-name').value = gifCommand.command || '';
            document.getElementById('bit-gif-trigger-amount').value = fullTrigger.bit_amount;
            document.getElementById('bit-gif-trigger-duration').value = Math.round((gifCommand.duration || 5000) / 1000);
            document.getElementById('bit-gif-trigger-position').value = gifCommand.position || 'center';
            document.getElementById('bit-gif-trigger-size').value = gifCommand.size || 'medium';
            
            // Set selected GIF
            gifBitTriggerSelectedGif = {
                id: gifCommand.gif_id || null,
                url: gifCommand.gif_url,
                title: gifCommand.command || 'Selected GIF'
            };
            updateGifBitTriggerPreview();
            
            // Open modal
            document.getElementById('bit-gif-trigger-modal').showModal();
            
            // Load trending GIFs
            loadTrendingGifsForGifBitTrigger();
            
        } else if (fullTrigger.command_type === 'audio') {
            // Fetch Audio command details
            const audioResponse = await fetch(`/api/audio-commands/${fullTrigger.command_id}`, {
                credentials: 'include'
            });
            
            if (!audioResponse.ok) {
                throw new Error('Failed to load audio command');
            }
            
            const audioData = await audioResponse.json();
            const audioCommand = audioData.command;
            
            // Update modal title
            document.getElementById('bit-audio-trigger-modal-title').textContent = 'Edit Audio Bits Trigger';
            
            // Populate form
            document.getElementById('bit-audio-trigger-name').value = audioCommand.command || '';
            document.getElementById('bit-audio-trigger-amount').value = fullTrigger.bit_amount;
            document.getElementById('bit-audio-trigger-volume-slider').value = Math.round((audioCommand.volume || 0.5) * 100);
            updateAudioBitTriggerVolumeDisplay(Math.round((audioCommand.volume || 0.5) * 100));
            
            // Set file URL if available
            if (audioCommand.file_url) {
                document.getElementById('bit-audio-trigger-url-input').value = audioCommand.file_url;
                switchAudioBitTriggerUploadMethod('url');
            } else {
                // When editing, show file method but don't require a new file
                switchAudioBitTriggerUploadMethod('file');
                // Show existing file info if available
                if (audioCommand.file_path) {
                    const fileInfo = document.getElementById('bit-audio-trigger-file-info');
                    if (fileInfo) {
                        fileInfo.classList.remove('hidden');
                        document.getElementById('bit-audio-trigger-file-name').textContent = audioCommand.file_path.split('/').pop() || 'Existing file';
                        document.getElementById('bit-audio-trigger-file-size').textContent = audioCommand.file_size ? formatFileSize(audioCommand.file_size) : '';
                    }
                }
            }
            
            // Open modal
            document.getElementById('bit-audio-trigger-modal').showModal();
        }
    } catch (error) {
        console.error('Error loading trigger for edit:', error);
        alert('Failed to load trigger details. Please try again.');
    }
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

async function saveGifBitTrigger() {
    const triggerName = document.getElementById('bit-gif-trigger-name').value.trim();
    const bitAmount = parseInt(document.getElementById('bit-gif-trigger-amount').value);
    
    if (!triggerName) {
        alert('Please enter a trigger name');
        return;
    }
    
    if (!bitAmount || bitAmount < 1) {
        alert('Please enter a valid bit amount');
        return;
    }
    
    if (!gifBitTriggerSelectedGif || !gifBitTriggerSelectedGif.url) {
        alert('Please select a GIF');
        return;
    }
    
    try {
        if (currentBitEditingId) {
            // Update existing trigger
            const triggerResponse = await fetch(`/api/bit-triggers/${currentBitEditingId}`, {
                credentials: 'include'
            });
            
            if (!triggerResponse.ok) {
                throw new Error('Failed to load trigger');
            }
            
            const triggerData = await triggerResponse.json();
            const existingTrigger = triggerData.trigger;
            
            // Update GIF command
            const gifResponse = await fetch(`/api/gif-commands/${existingTrigger.command_id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    command: triggerName,
                    gifId: gifBitTriggerSelectedGif.id,
                    gifUrl: gifBitTriggerSelectedGif.url,
                    duration: (parseInt(document.getElementById('bit-gif-trigger-duration').value) || 5) * 1000,
                    position: document.getElementById('bit-gif-trigger-position').value || 'center',
                    size: document.getElementById('bit-gif-trigger-size').value || 'medium'
                })
            });
            
            if (!gifResponse.ok) {
                const error = await gifResponse.json();
                throw new Error(error.error || 'Failed to update GIF command');
            }
            
            // Update bit trigger
            const response = await fetch(`/api/bit-triggers/${currentBitEditingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    bitAmount
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update bit trigger');
            }
        } else {
            // Create new trigger
            const gifResponse = await fetch('/api/gif-commands', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    command: triggerName,
                    gifId: gifBitTriggerSelectedGif.id,
                    gifUrl: gifBitTriggerSelectedGif.url,
                    duration: (parseInt(document.getElementById('bit-gif-trigger-duration').value) || 5) * 1000,
                    position: document.getElementById('bit-gif-trigger-position').value || 'center',
                    size: document.getElementById('bit-gif-trigger-size').value || 'medium',
                    isBitsOnly: true
                })
            });
            
            if (!gifResponse.ok) {
                const error = await gifResponse.json();
                throw new Error(error.error || 'Failed to create GIF command');
            }
            
            const gifData = await gifResponse.json();
            const commandId = gifData.command.id;
            
            // Create the bit trigger
            const response = await fetch('/api/bit-triggers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    bitAmount,
                    isDedicated: false,
                    commandType: 'gif',
                    commandId: commandId
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save bit trigger');
            }
        }
        
        closeGifBitTriggerModal();
        triggersLoaded = false;
        await loadBitTriggers();
    } catch (error) {
        console.error('Error saving GIF bit trigger:', error);
        alert(`Failed to save GIF trigger: ${error.message}`);
    }
}

async function saveAudioBitTrigger() {
    const triggerName = document.getElementById('bit-audio-trigger-name').value.trim();
    const bitAmount = parseInt(document.getElementById('bit-audio-trigger-amount').value);
    
    if (!triggerName) {
        alert('Please enter a trigger name');
        return;
    }
    
    if (!bitAmount || bitAmount < 1) {
        alert('Please enter a valid bit amount');
        return;
    }
    
    // Validate audio
    if (audioBitTriggerUploadMethod === 'file') {
        if (!audioBitTriggerSelectedFile) {
            alert('Please select an audio file');
            return;
        }
        console.log('[BIT TRIGGER DEBUG] File selected:', {
            name: audioBitTriggerSelectedFile.name,
            size: audioBitTriggerSelectedFile.size,
            type: audioBitTriggerSelectedFile.type
        });
    } else if (audioBitTriggerUploadMethod === 'url') {
        const url = document.getElementById('bit-audio-trigger-url-input').value.trim();
        if (!url) {
            alert('Please enter an audio file URL');
            return;
        }
        console.log('[BIT TRIGGER DEBUG] URL provided:', url);
    } else {
        alert('Please select an audio file or enter a URL');
        return;
    }
    
    try {
        if (currentBitEditingId) {
            // Update existing trigger
            const triggerResponse = await fetch(`/api/bit-triggers/${currentBitEditingId}`, {
                credentials: 'include'
            });
            
            if (!triggerResponse.ok) {
                throw new Error('Failed to load trigger');
            }
            
            const triggerData = await triggerResponse.json();
            const existingTrigger = triggerData.trigger;
            
            // Update audio command
            const formData = new FormData();
            
            if (audioBitTriggerUploadMethod === 'file' && audioBitTriggerSelectedFile) {
                formData.append('audioFile', audioBitTriggerSelectedFile);
            } else if (audioBitTriggerUploadMethod === 'url') {
                const url = document.getElementById('bit-audio-trigger-url-input').value;
                if (url) {
                    formData.append('fileUrl', url);
                }
            }
            
            formData.append('command', triggerName);
            formData.append('volume', document.getElementById('bit-audio-trigger-volume-slider').value / 100);
            
            const audioResponse = await fetch(`/api/audio-commands/${existingTrigger.command_id}`, {
                method: 'PUT',
                credentials: 'include',
                body: formData
            });
            
            if (!audioResponse.ok) {
                let errorMessage = 'Failed to update audio command';
                try {
                    const contentType = audioResponse.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const error = await audioResponse.json();
                        errorMessage = error.error || error.message || errorMessage;
                    } else {
                        const text = await audioResponse.text();
                        errorMessage = `Server error: ${audioResponse.status} ${audioResponse.statusText}`;
                        console.error('Non-JSON error response:', text.substring(0, 200));
                    }
                } catch (parseError) {
                    console.error('Error parsing error response:', parseError);
                    errorMessage = `Server error: ${audioResponse.status} ${audioResponse.statusText}`;
                }
                throw new Error(errorMessage);
            }
            
            // Verify response is JSON and has expected format
            const updateAudioData = await audioResponse.json();
            if (!updateAudioData.command && !updateAudioData.audioCommand) {
                console.warn('Unexpected update response format:', updateAudioData);
            }
            
            // Update bit trigger
            const response = await fetch(`/api/bit-triggers/${currentBitEditingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    bitAmount
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update bit trigger');
            }
        } else {
            // Create new trigger
            const formData = new FormData();
            
            console.log('[BIT TRIGGER DEBUG] Creating audio trigger:', {
                uploadMethod: audioBitTriggerUploadMethod,
                hasFile: !!audioBitTriggerSelectedFile,
                fileName: audioBitTriggerSelectedFile?.name,
                fileSize: audioBitTriggerSelectedFile?.size,
                triggerName,
                bitAmount
            });
            
            if (audioBitTriggerUploadMethod === 'file' && audioBitTriggerSelectedFile) {
                formData.append('audioFile', audioBitTriggerSelectedFile);
                console.log('[BIT TRIGGER DEBUG] Added file to FormData');
            } else if (audioBitTriggerUploadMethod === 'url') {
                const url = document.getElementById('bit-audio-trigger-url-input').value;
                formData.append('fileUrl', url);
                console.log('[BIT TRIGGER DEBUG] Added URL to FormData:', url);
            } else {
                console.error('[BIT TRIGGER DEBUG] No file or URL provided!', {
                    uploadMethod: audioBitTriggerUploadMethod,
                    hasFile: !!audioBitTriggerSelectedFile,
                    urlValue: document.getElementById('bit-audio-trigger-url-input')?.value
                });
                alert('Please select an audio file or enter a URL');
                return;
            }
            
            formData.append('command', triggerName);
            const volumeValue = document.getElementById('bit-audio-trigger-volume-slider').value / 100;
            formData.append('volume', volumeValue.toString());
            formData.append('isBitsOnly', 'true');
            
            console.log('[BIT TRIGGER DEBUG] Sending request with FormData:', {
                hasAudioFile: formData.has('audioFile'),
                hasFileUrl: formData.has('fileUrl'),
                command: formData.get('command'),
                volume: formData.get('volume'),
                isBitsOnly: formData.get('isBitsOnly')
            });
            
            const audioResponse = await fetch('/api/audio-commands', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!audioResponse.ok) {
                let errorMessage = 'Failed to create audio command';
                let errorDetails = null;
                try {
                    const contentType = audioResponse.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const error = await audioResponse.json();
                        errorMessage = error.error || error.message || errorMessage;
                        errorDetails = error;
                        console.error('[BIT TRIGGER DEBUG] Server error response:', error);
                    } else {
                        const text = await audioResponse.text();
                        errorMessage = `Server error: ${audioResponse.status} ${audioResponse.statusText}`;
                        errorDetails = { status: audioResponse.status, text: text.substring(0, 500) };
                        console.error('[BIT TRIGGER DEBUG] Non-JSON error response:', text.substring(0, 500));
                    }
                } catch (parseError) {
                    console.error('[BIT TRIGGER DEBUG] Error parsing error response:', parseError);
                    errorMessage = `Server error: ${audioResponse.status} ${audioResponse.statusText}`;
                }
                console.error('[BIT TRIGGER DEBUG] Full error details:', {
                    status: audioResponse.status,
                    statusText: audioResponse.statusText,
                    errorDetails
                });
                throw new Error(errorMessage);
            }
            
            const audioData = await audioResponse.json();
            const commandId = audioData.command?.id || audioData.audioCommand?.id;
            if (!commandId) {
                throw new Error('Invalid response format from server');
            }
            
            // Create the bit trigger
            const response = await fetch('/api/bit-triggers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    bitAmount,
                    isDedicated: false,
                    commandType: 'audio',
                    commandId: commandId
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save bit trigger');
            }
        }
        
        closeAudioBitTriggerModal();
        triggersLoaded = false;
        await loadBitTriggers();
    } catch (error) {
        console.error('Error saving audio bit trigger:', error);
        alert(`Failed to save audio trigger: ${error.message}`);
    }
}

function closeGifBitTriggerModal() {
    document.getElementById('bit-gif-trigger-modal').close();
    currentBitEditingId = null;
    gifBitTriggerSelectedGif = null;
    document.getElementById('bit-gif-trigger-form').reset();
    const resultsDiv = document.getElementById('bit-gif-trigger-giphy-results');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
        resultsDiv.style.display = 'none';
    }
    const previewDiv = document.getElementById('bit-gif-trigger-preview');
    if (previewDiv) previewDiv.classList.add('hidden');
}

function closeAudioBitTriggerModal() {
    document.getElementById('bit-audio-trigger-modal').close();
    currentBitEditingId = null;
    audioBitTriggerSelectedFile = null;
    document.getElementById('bit-audio-trigger-form').reset();
    clearAudioBitTriggerFile();
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

// GIF Bit Trigger Functions
async function searchGiphyForGifBitTrigger(query) {
    if (!query || query.trim().length < 2) return;
    
    if (gifBitTriggerSearchTimeout) clearTimeout(gifBitTriggerSearchTimeout);
    
    gifBitTriggerSearchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/gif-commands/giphy/search?q=${encodeURIComponent(query)}&limit=25`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to search GIFs');
            
            const data = await response.json();
            renderGiphyResultsForGifBitTrigger(data.gifs || []);
        } catch (error) {
            console.error('Error searching GIFs:', error);
            const resultsDiv = document.getElementById('bit-gif-trigger-giphy-results');
            if (resultsDiv) {
                resultsDiv.style.display = 'block';
                resultsDiv.innerHTML = `
                    <div class="text-center py-8 text-white/60">
                        <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                        <p>Error searching GIFs. Please try again.</p>
                    </div>
                `;
            }
        }
    }, 300);
}

async function loadTrendingGifsForGifBitTrigger() {
    const resultsDiv = document.getElementById('bit-gif-trigger-giphy-results');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';
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
        
        if (!response.ok) throw new Error('Failed to load trending GIFs');
        
        const data = await response.json();
        renderGiphyResultsForGifBitTrigger(data.gifs || []);
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

function renderGiphyResultsForGifBitTrigger(gifs) {
    const resultsDiv = document.getElementById('bit-gif-trigger-giphy-results');
    if (!resultsDiv) return;
    
    resultsDiv.style.display = 'block';
    
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
                <div class="cursor-pointer hover:opacity-80 transition-opacity" onclick="selectGifBitTriggerGif({
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

function selectGifBitTriggerGif(gif) {
    gifBitTriggerSelectedGif = gif;
    updateGifBitTriggerPreview();
}

function updateGifBitTriggerPreview() {
    const previewDiv = document.getElementById('bit-gif-trigger-preview');
    const previewImg = document.getElementById('bit-gif-trigger-preview-img');
    const previewUrl = document.getElementById('bit-gif-trigger-url');
    
    if (!previewDiv || !previewImg || !previewUrl) return;
    
    if (gifBitTriggerSelectedGif && gifBitTriggerSelectedGif.url) {
        previewDiv.classList.remove('hidden');
        previewImg.src = gifBitTriggerSelectedGif.url;
        previewUrl.textContent = gifBitTriggerSelectedGif.title || gifBitTriggerSelectedGif.url;
    } else {
        previewDiv.classList.add('hidden');
    }
}

function clearGifBitTriggerGif() {
    gifBitTriggerSelectedGif = null;
    updateGifBitTriggerPreview();
}

// Audio Bit Trigger Functions
function switchAudioBitTriggerUploadMethod(method) {
    audioBitTriggerUploadMethod = method;
    const fileSection = document.getElementById('bit-audio-trigger-file-upload-section');
    const urlSection = document.getElementById('bit-audio-trigger-url-upload-section');
    const tabs = document.querySelectorAll('#bit-audio-trigger-modal .tab');
    
    tabs.forEach(tab => tab.classList.remove('tab-active'));
    
    if (method === 'file') {
        fileSection.style.display = 'block';
        urlSection.style.display = 'none';
        if (tabs[0]) tabs[0].classList.add('tab-active');
    } else {
        fileSection.style.display = 'none';
        urlSection.style.display = 'block';
        if (tabs[1]) tabs[1].classList.add('tab-active');
    }
}

function handleAudioBitTriggerDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-white/60');
}

function handleAudioBitTriggerDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-white/60');
}

function handleAudioBitTriggerDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-white/60');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleAudioBitTriggerFile(files[0]);
    }
}

function handleAudioBitTriggerFileSelect(e) {
    if (e.target.files.length > 0) {
        handleAudioBitTriggerFile(e.target.files[0]);
    }
}

function handleAudioBitTriggerFile(file) {
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
        alert('Please select an MP3 audio file');
        return;
    }

    if (file.size > 500 * 1024) {
        alert('File size exceeds 500KB limit');
        return;
    }

    audioBitTriggerSelectedFile = file;
    document.getElementById('bit-audio-trigger-file-name').textContent = file.name;
    document.getElementById('bit-audio-trigger-file-size').textContent = formatFileSize(file.size);
    document.getElementById('bit-audio-trigger-file-info').classList.remove('hidden');

    // Set up preview
    const url = URL.createObjectURL(file);
    const audioPreview = document.getElementById('bit-audio-trigger-preview');
    if (audioPreview) {
        audioPreview.src = url;
        document.getElementById('bit-audio-trigger-preview-section').classList.remove('hidden');
    }
}

function clearAudioBitTriggerFile() {
    audioBitTriggerSelectedFile = null;
    const fileInfo = document.getElementById('bit-audio-trigger-file-info');
    const previewSection = document.getElementById('bit-audio-trigger-preview-section');
    if (fileInfo) fileInfo.classList.add('hidden');
    if (previewSection) previewSection.classList.add('hidden');
    const fileInput = document.getElementById('bit-audio-trigger-file-input');
    if (fileInput) fileInput.value = '';
}

function updateAudioBitTriggerVolumeDisplay(value) {
    const volumeValue = document.getElementById('bit-audio-trigger-volume-value');
    if (volumeValue) {
        volumeValue.textContent = `${value}%`;
    }
    const audioPreview = document.getElementById('bit-audio-trigger-preview');
    if (audioPreview) {
        audioPreview.volume = value / 100;
    }
}

function playAudioBitTriggerPreview() {
    const audioPreview = document.getElementById('bit-audio-trigger-preview');
    if (audioPreview) {
        audioPreview.play();
    }
}

function stopAudioBitTriggerPreview() {
    const audioPreview = document.getElementById('bit-audio-trigger-preview');
    if (audioPreview) {
        audioPreview.pause();
        audioPreview.currentTime = 0;
    }
}

// Export functions for use in HTML
window.showAddGifBitTriggerModal = showAddGifBitTriggerModal;
window.showAddAudioBitTriggerModal = showAddAudioBitTriggerModal;
window.editBitTrigger = editBitTrigger;
window.deleteBitTrigger = deleteBitTrigger;
window.closeGifBitTriggerModal = closeGifBitTriggerModal;
window.closeAudioBitTriggerModal = closeAudioBitTriggerModal;
window.saveGifBitTrigger = saveGifBitTrigger;
window.saveAudioBitTrigger = saveAudioBitTrigger;
window.testBitTrigger = testBitTrigger;
window.reloadBitTriggers = reloadBitTriggers;
window.ensureBitTriggersLoaded = ensureBitTriggersLoaded;
window.searchGiphyForGifBitTrigger = searchGiphyForGifBitTrigger;
window.loadTrendingGifsForGifBitTrigger = loadTrendingGifsForGifBitTrigger;
window.selectGifBitTriggerGif = selectGifBitTriggerGif;
window.clearGifBitTriggerGif = clearGifBitTriggerGif;
window.switchAudioBitTriggerUploadMethod = switchAudioBitTriggerUploadMethod;
window.handleAudioBitTriggerDrop = handleAudioBitTriggerDrop;
window.handleAudioBitTriggerDragOver = handleAudioBitTriggerDragOver;
window.handleAudioBitTriggerDragLeave = handleAudioBitTriggerDragLeave;
window.handleAudioBitTriggerFileSelect = handleAudioBitTriggerFileSelect;
window.clearAudioBitTriggerFile = clearAudioBitTriggerFile;
window.updateAudioBitTriggerVolumeDisplay = updateAudioBitTriggerVolumeDisplay;
window.playAudioBitTriggerPreview = playAudioBitTriggerPreview;
window.stopAudioBitTriggerPreview = stopAudioBitTriggerPreview;


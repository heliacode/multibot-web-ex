/**
 * Audio Commands Management
 * Handles CRUD operations for audio commands, file uploads, and modal management
 */

let audioCommands = [];
let currentEditingId = null;
let selectedFile = null;
let uploadMethod = 'file';
let audioPreviewElement = null;

// Expose functions globally IMMEDIATELY (before DOMContentLoaded) so onclick handlers can access them
// Store in both locations for compatibility
window.showAddAudioCommandModal = function showAddAudioCommandModal() {
    currentEditingId = null;
    const modal = document.getElementById('audio-command-modal');
    if (!modal) {
        console.error('[Audio Commands] Modal not found - page may still be loading');
        // Retry after a short delay
        setTimeout(() => {
            const retryModal = document.getElementById('audio-command-modal');
            if (retryModal) {
                window.showAddAudioCommandModal();
            } else {
                alert('Page is still loading. Please wait a moment and try again.');
            }
        }, 500);
        return;
    }
    const form = document.getElementById('audio-command-form');
    const fileSection = document.getElementById('file-upload-section');
    const urlSection = document.getElementById('url-upload-section');
    
    // Reset form
    document.getElementById('modal-title').textContent = 'Add Audio Command';
    form.reset();
    document.getElementById('volume-slider').value = 50;
    if (typeof updateVolumeDisplay === 'function') {
        updateVolumeDisplay(50);
    }
    if (typeof clearFile === 'function') {
        clearFile();
    }
    
    // Ensure sections are visible/hidden correctly using both class and style
    fileSection.classList.remove('hidden');
    fileSection.style.display = 'block';
    urlSection.classList.add('hidden');
    urlSection.style.display = 'none';
    
    // Reset tabs to show "Upload File" as active
    const tabs = modal.querySelectorAll('.tab');
    tabs.forEach((tab, index) => {
        tab.classList.remove('tab-active');
        if (index === 0) {
            tab.classList.add('tab-active');
        }
    });
    
    // Hide preview section
    const previewSection = document.getElementById('audio-preview-section');
    if (previewSection) {
        previewSection.classList.add('hidden');
    }
    
    // Set upload method
    uploadMethod = 'file';
    
    // Show modal
    modal.showModal();
    
    // Double-check visibility after modal opens (small delay to ensure rendering)
    setTimeout(() => {
        if (fileSection.classList.contains('hidden') || fileSection.style.display === 'none') {
            fileSection.classList.remove('hidden');
            fileSection.style.display = 'block';
        }
        if (!urlSection.classList.contains('hidden') || urlSection.style.display !== 'none') {
            urlSection.classList.add('hidden');
            urlSection.style.display = 'none';
        }
    }, 100);
};

// Also store as _showAddAudioCommandModal for the stub function to find
window._showAddAudioCommandModal = window.showAddAudioCommandModal;

// Load audio commands on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('audio-section')) {
        // Delay slightly to ensure page is fully loaded
        setTimeout(() => {
            loadAudioCommands().catch(() => {}); // Suppress all errors
        }, 100);
    }
});

async function loadAudioCommands() {
    try {
        const response = await fetch('/api/audio-commands', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        }).catch(() => null); // Suppress network errors
        
        if (!response || !response.ok) {
            // Silently handle expected errors - don't log anything
            return;
        }
        
        const data = await response.json();
        if (data.success) {
            audioCommands = data.commands;
            renderAudioCommands();
        }
    } catch (error) {
        // Suppress all errors - expected when not authenticated or route issues
    }
}

function renderAudioCommands() {
    const container = document.getElementById('audio-commands-list');
    if (!container) return;

    if (audioCommands.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-music text-6xl mb-4 animate-float"></i>
                <p>No audio commands yet. Click "Add Command" to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = audioCommands.map(cmd => {
        // Prefer file_url if available (persists across deployments), fallback to file_path
        const audioSrc = cmd.file_url || cmd.file_path;
        // Escape JavaScript string for use in HTML attribute
        const escapedAudioSrc = audioSrc ? audioSrc.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
        return `
        <div class="glass-card rounded-xl p-4" data-command-id="${cmd.id}">
            <div class="flex items-center justify-between responsive-command-card">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="font-bold text-white text-lg break-words">${escapeHtml(cmd.command)}</span>
                        <span class="badge ${cmd.is_active ? 'badge-success' : 'badge-error'}">${cmd.is_active ? 'Active' : 'Inactive'}</span>
                        ${!cmd.file_url && cmd.file_path ? '<span class="badge badge-warning" title="File may not persist across deployments">Local File</span>' : ''}
                    </div>
                    <div class="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                        <span><i class="fas fa-volume-up"></i> ${Math.round(cmd.volume * 100)}%</span>
                        <span><i class="fas fa-file-audio"></i> ${formatFileSize(cmd.file_size)}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 responsive-command-buttons">
                    <audio id="audio-${cmd.id}" src="${audioSrc}" preload="metadata" onerror="handleAudioError(${cmd.id}, '${escapedAudioSrc}')"></audio>
                    <button class="btn btn-sm btn-info text-white" onclick="testAudioCommand('${escapeHtml(cmd.command)}')" title="Test command in chat">
                        <i class="fas fa-vial"></i> Test
                    </button>
                    <button class="btn btn-sm btn-success text-white" onclick="playAudioCommand(${cmd.id}, ${cmd.volume})">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-sm btn-error text-white" onclick="stopAudioCommand(${cmd.id})">
                        <i class="fas fa-stop"></i>
                    </button>
                    <button class="btn btn-sm btn-primary text-white" onclick="editAudioCommand(${cmd.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error text-white" onclick="deleteAudioCommand(${cmd.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Function is already defined at the top of the file for immediate availability

function switchUploadMethod(method) {
    uploadMethod = method;
    const modal = document.getElementById('audio-command-modal');
    const fileSection = document.getElementById('file-upload-section');
    const urlSection = document.getElementById('url-upload-section');
    
    // Only select tabs within the modal to avoid conflicts
    const tabs = modal.querySelectorAll('.tab');
    
    if (!tabs || tabs.length < 2) {
        console.error('Could not find tabs in modal');
        return;
    }

    // Remove active class from all tabs
    tabs.forEach(tab => tab.classList.remove('tab-active'));
    
    if (method === 'file') {
        // Show file upload section
        fileSection.classList.remove('hidden');
        fileSection.style.display = 'block';
        urlSection.classList.add('hidden');
        urlSection.style.display = 'none';
        // Activate first tab (Upload File)
        if (tabs[0]) {
            tabs[0].classList.add('tab-active');
        }
    } else if (method === 'url') {
        // Show URL input section
        fileSection.classList.add('hidden');
        fileSection.style.display = 'none';
        urlSection.classList.remove('hidden');
        urlSection.style.display = 'block';
        // Activate second tab (From URL)
        if (tabs[1]) {
            tabs[1].classList.add('tab-active');
        }
    }
    
    // Force visibility check
    if (method === 'file' && (fileSection.classList.contains('hidden') || fileSection.style.display === 'none')) {
        console.warn('File section was hidden, forcing visibility');
        fileSection.classList.remove('hidden');
        fileSection.style.display = 'block';
    }
    if (method === 'url' && (urlSection.classList.contains('hidden') || urlSection.style.display === 'none')) {
        console.warn('URL section was hidden, forcing visibility');
        urlSection.classList.remove('hidden');
        urlSection.style.display = 'block';
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-white/60');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-white/60');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-white/60');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
        alert('Please select an MP3 audio file');
        return;
    }

    if (file.size > 500 * 1024) {
        alert('File size exceeds 500KB limit');
        return;
    }

    selectedFile = file;
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = formatFileSize(file.size);
    document.getElementById('file-info').classList.remove('hidden');

    // Set up preview
    const url = URL.createObjectURL(file);
    const audioPreview = document.getElementById('audio-preview');
    audioPreview.src = url;
    document.getElementById('audio-preview-section').classList.remove('hidden');
}

function clearFile() {
    selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-info').classList.add('hidden');
    document.getElementById('audio-preview-section').classList.add('hidden');
    const audioPreview = document.getElementById('audio-preview');
    if (audioPreview) {
        audioPreview.src = '';
        audioPreview.pause();
    }
}

function updateVolumeDisplay(value) {
    document.getElementById('volume-value').textContent = value + '%';
}

function playPreview() {
    const audio = document.getElementById('audio-preview');
    if (audio) {
        audio.volume = document.getElementById('volume-slider').value / 100;
        audio.play();
    }
}

function stopPreview() {
    const audio = document.getElementById('audio-preview');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

async function saveAudioCommand(e) {
    e.preventDefault();
    
    const command = document.getElementById('audio-command-input').value.trim();
    if (!command.startsWith('!')) {
        alert('Command must start with !');
        return;
    }

    const formData = new FormData();
    formData.append('command', command);
    formData.append('volume', document.getElementById('volume-slider').value / 100);

    if (uploadMethod === 'file') {
        if (!selectedFile) {
            alert('Please select a file or provide a URL');
            return;
        }
        formData.append('audioFile', selectedFile);
    } else {
        const url = document.getElementById('url-input').value.trim();
        if (!url) {
            alert('Please provide a URL or select a file');
            return;
        }
        formData.append('fileUrl', url);
    }

    try {
        const url = currentEditingId 
            ? `/api/audio-commands/${currentEditingId}`
            : '/api/audio-commands';
        const method = currentEditingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData,
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            // Try to get error message from response
            let errorMsg = `Server error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorData.error || errorMsg;
            } catch (e) {
                // Response is not JSON, use status text
            }
            alert('Error: ' + errorMsg);
            return;
        }

        const data = await response.json();
        if (data.success) {
            closeAudioCommandModal();
            await loadAudioCommands();
        } else {
            alert('Error: ' + (data.message || data.error));
        }
    } catch (error) {
        // Suppress console error, show user-friendly message
        alert('Failed to save audio command. Please try again.');
    }
}

function editAudioCommand(id) {
    const cmd = audioCommands.find(c => c.id === id);
    if (!cmd) return;

    const modal = document.getElementById('audio-command-modal');
    const fileSection = document.getElementById('file-upload-section');
    const urlSection = document.getElementById('url-upload-section');

    currentEditingId = id;
    document.getElementById('modal-title').textContent = 'Edit Audio Command';
    document.getElementById('audio-command-input').value = cmd.command;
    document.getElementById('volume-slider').value = Math.round(cmd.volume * 100);
    updateVolumeDisplay(Math.round(cmd.volume * 100));

    if (cmd.file_url) {
        switchUploadMethod('url');
        document.getElementById('url-input').value = cmd.file_url;
    } else {
        switchUploadMethod('file');
        // Can't edit file, but show current file info
        document.getElementById('file-name').textContent = cmd.file_path.split('/').pop();
        document.getElementById('file-size').textContent = formatFileSize(cmd.file_size);
        document.getElementById('file-info').classList.remove('hidden');
    }

    // Set up preview with existing file
    const audioPreview = document.getElementById('audio-preview');
    // Prefer file_url if available, fallback to file_path
    audioPreview.src = cmd.file_url || cmd.file_path;
    document.getElementById('audio-preview-section').classList.remove('hidden');

    // Show modal
    modal.showModal();
    
    // Ensure correct section is visible after modal opens
    setTimeout(() => {
        if (cmd.file_url) {
            if (urlSection.classList.contains('hidden') || urlSection.style.display === 'none') {
                urlSection.classList.remove('hidden');
                urlSection.style.display = 'block';
            }
            if (!fileSection.classList.contains('hidden') || fileSection.style.display !== 'none') {
                fileSection.classList.add('hidden');
                fileSection.style.display = 'none';
            }
        } else {
            if (fileSection.classList.contains('hidden') || fileSection.style.display === 'none') {
                fileSection.classList.remove('hidden');
                fileSection.style.display = 'block';
            }
            if (!urlSection.classList.contains('hidden') || urlSection.style.display !== 'none') {
                urlSection.classList.add('hidden');
                urlSection.style.display = 'none';
            }
        }
    }, 100);
}

async function deleteAudioCommand(id) {
    if (!confirm('Are you sure you want to delete this audio command?')) {
        return;
    }

    try {
        const response = await fetch(`/api/audio-commands/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();
        if (data.success) {
            await loadAudioCommands();
        } else {
            alert('Error: ' + (data.message || data.error));
        }
    } catch (error) {
        console.error('Error deleting audio command:', error);
        alert('Failed to delete audio command: ' + error.message);
    }
}

function handleAudioError(audioId, src) {
    console.error(`[Audio] Failed to load audio file: ${src}`);
    const cmd = audioCommands.find(c => c.id === audioId);
    if (cmd) {
        // Try file_url if file_path failed
        if (cmd.file_url && src === cmd.file_path) {
            console.log(`[Audio] Trying file_url as fallback: ${cmd.file_url}`);
            const audio = document.getElementById(`audio-${audioId}`);
            if (audio) {
                audio.src = cmd.file_url;
                audio.load();
            }
        } else {
            alert(`Audio file not found. ${cmd.file_url ? 'The file may have been deleted.' : 'Please re-upload the audio file.'}`);
        }
    }
}

function playAudioCommand(id, volume) {
    const audio = document.getElementById(`audio-${id}`);
    if (audio) {
        // Check if audio has valid source
        if (!audio.src || audio.src === window.location.href) {
            const cmd = audioCommands.find(c => c.id === id);
            if (cmd) {
                const audioSrc = cmd.file_url || cmd.file_path;
                if (audioSrc) {
                    audio.src = audioSrc;
                    audio.load();
                } else {
                    alert('Audio file not available. Please re-upload the audio file.');
                    return;
                }
            }
        }
        
        audio.volume = volume;
        audio.play().catch(error => {
            console.error(`[Audio] Playback error for command ${id}:`, error);
            // Try to reload and play again
            audio.load();
            setTimeout(() => {
                audio.play().catch(err => {
                    alert('Failed to play audio. The file may be missing or corrupted.');
                });
            }, 100);
        });
    }
}

function stopAudioCommand(id) {
    const audio = document.getElementById(`audio-${id}`);
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function closeAudioCommandModal() {
    document.getElementById('audio-command-modal').close();
    clearFile();
    currentEditingId = null;
}

// Handle command triggers from chat (shared with chatDebug)
function handleCommandTrigger(commandData) {
    if (commandData.type === 'audio_command') {
        // Find the audio element for this command
        const audioElement = document.getElementById(`audio-${commandData.id}`);
        if (audioElement) {
            audioElement.volume = commandData.volume;
            audioElement.play().catch(error => {
                console.error('Error playing audio command:', error);
            });
        } else {
            // If audio element doesn't exist yet, create it temporarily
            const audio = new Audio(commandData.filePath);
            audio.volume = commandData.volume;
            audio.play().catch(error => {
                console.error('Error playing audio command:', error);
            });
        }
    }
}

// Test audio command by simulating a chat message
async function testAudioCommand(command) {
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
            const buttons = document.querySelectorAll(`button[onclick*="testAudioCommand('${command}')"]`);
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

// Expose all functions used in onclick handlers to global scope
// Note: showAddAudioCommandModal is already exposed at the top of the file
window.testAudioCommand = testAudioCommand;
window.editAudioCommand = editAudioCommand;
window.deleteAudioCommand = deleteAudioCommand;
window.playAudioCommand = playAudioCommand;
window.stopAudioCommand = stopAudioCommand;
window.switchUploadMethod = switchUploadMethod;
window.handleDrop = handleDrop;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleFileSelect = handleFileSelect;
window.clearFile = clearFile;
window.updateVolumeDisplay = updateVolumeDisplay;
window.playPreview = playPreview;
window.stopPreview = stopPreview;
window.closeAudioCommandModal = closeAudioCommandModal;
window.saveAudioCommand = saveAudioCommand;

// Ensure functions are available immediately (not waiting for DOMContentLoaded)
console.log('[Audio Commands] Functions exposed to window:', {
    showAddAudioCommandModal: typeof window.showAddAudioCommandModal,
    editAudioCommand: typeof window.editAudioCommand,
    deleteAudioCommand: typeof window.deleteAudioCommand
});


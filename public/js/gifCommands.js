/**
 * GIF Commands Management
 * Handles CRUD operations for GIF commands using Giphy API
 */

let gifCommands = [];
let currentGifEditingId = null;
let giphySearchResults = [];
let selectedGif = null;
let searchTimeout = null;

// Load GIF commands on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('gif-section')) {
        setTimeout(() => {
            loadGifCommands().catch(() => {});
        }, 100);
    }
});

async function loadGifCommands() {
    try {
        const response = await fetch('/api/gif-commands', {
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
            gifCommands = data.commands;
            renderGifCommands();
        }
    } catch (error) {
        // Suppress errors
    }
}

function renderGifCommands() {
    const container = document.getElementById('gif-commands-list');
    if (!container) return;

    if (gifCommands.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-images text-6xl mb-4 animate-float"></i>
                <p>No GIF commands yet. Click "Add Command" to create one.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = gifCommands.map(cmd => `
        <div class="glass-card rounded-xl p-4" data-command-id="${cmd.id}">
            <div class="flex items-center justify-between responsive-command-card">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="font-bold text-white text-lg break-words">!${escapeHtml(cmd.command)}</span>
                        <span class="badge ${cmd.is_active ? 'badge-success' : 'badge-error'}">${cmd.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                        <span><i class="fas fa-clock"></i> ${cmd.duration || 5000}ms</span>
                        <span><i class="fas fa-crosshairs"></i> ${cmd.position || 'center'}</span>
                        <span><i class="fas fa-expand-arrows-alt"></i> ${cmd.size || 'medium'}</span>
                        ${cmd.gif_title ? `<span><i class="fas fa-info-circle"></i> ${escapeHtml(cmd.gif_title)}</span>` : ''}
                    </div>
                    ${cmd.gif_url ? `<img src="${cmd.gif_url}" alt="GIF preview" class="mt-2 max-w-xs rounded" style="max-height: 100px;">` : ''}
                </div>
                <div class="flex items-center gap-2 responsive-command-buttons">
                    <button class="btn btn-sm btn-info text-white" onclick="testGifCommand('${escapeHtml(cmd.command)}')" title="Test command in chat">
                        <i class="fas fa-vial"></i> Test
                    </button>
                    <button class="btn btn-sm btn-primary text-white" onclick="editGifCommand(${cmd.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-error text-white" onclick="deleteGifCommand(${cmd.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showAddGifCommandModal() {
    currentGifEditingId = null;
    selectedGif = null;
    giphySearchResults = [];
    
    const modal = document.getElementById('gif-command-modal');
    const form = document.getElementById('gif-command-form');
    const searchResults = document.getElementById('giphy-search-results');
    
    if (form) {
        form.reset();
    }
    
    if (searchResults) {
        searchResults.innerHTML = '<div class="text-center py-8 text-white/60">Search for GIFs above</div>';
    }
    
    if (modal) {
        modal.showModal();
    }
    
    // Load trending GIFs by default
    loadTrendingGifs();
}

function editGifCommand(id) {
    const cmd = gifCommands.find(c => c.id === id);
    if (!cmd) return;
    
    currentGifEditingId = id;
    selectedGif = {
        id: cmd.gif_id,
        url: cmd.gif_url,
        title: cmd.gif_title
    };
    
    const modal = document.getElementById('gif-command-modal');
    const form = document.getElementById('gif-command-form');
    
    if (form) {
        document.getElementById('gif-command-name').value = cmd.command;
        document.getElementById('gif-duration').value = cmd.duration || 5000;
        const positionInput = document.getElementById('gif-position');
        if (positionInput) positionInput.value = cmd.position || 'center';
        const sizeInput = document.getElementById('gif-size');
        if (sizeInput) sizeInput.value = cmd.size || 'medium';
    }
    
    // Show selected GIF
    const searchResults = document.getElementById('giphy-search-results');
    if (searchResults && selectedGif) {
        searchResults.innerHTML = `
            <div class="text-center">
                <img src="${selectedGif.url}" alt="${selectedGif.title || 'Selected GIF'}" class="mx-auto rounded" style="max-height: 200px;">
                <p class="text-white/80 mt-2">${selectedGif.title || 'Selected GIF'}</p>
            </div>
        `;
    }
    
    if (modal) {
        modal.showModal();
    }
}

async function deleteGifCommand(id) {
    if (!confirm('Are you sure you want to delete this GIF command?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/gif-commands/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete command');
        }
        
        await loadGifCommands();
    } catch (error) {
        alert('Failed to delete GIF command: ' + error.message);
    }
}

function closeGifCommandModal() {
    const modal = document.getElementById('gif-command-modal');
    if (modal) {
        modal.close();
    }
    currentGifEditingId = null;
    selectedGif = null;
    giphySearchResults = [];
}

async function searchGiphy(query) {
    if (!query || query.trim().length < 2) {
        return;
    }
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce search
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/gif-commands/giphy/search?q=${encodeURIComponent(query)}&limit=25`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const data = await response.json();
            if (data.success) {
                giphySearchResults = data.gifs;
                renderGiphyResults();
            }
        } catch (error) {
            console.error('Error searching Giphy:', error);
            const searchResults = document.getElementById('giphy-search-results');
            if (searchResults) {
                searchResults.innerHTML = '<div class="text-center py-8 text-red-400">Error searching GIFs. Make sure GIPHY_API_KEY is configured.</div>';
            }
        }
    }, 300);
}

async function loadTrendingGifs() {
    try {
        const response = await fetch('/api/gif-commands/giphy/trending?limit=25', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load trending GIFs');
        }
        
        const data = await response.json();
        if (data.success) {
            giphySearchResults = data.gifs;
            renderGiphyResults();
        }
    } catch (error) {
        console.error('Error loading trending GIFs:', error);
        const searchResults = document.getElementById('giphy-search-results');
        if (searchResults) {
            searchResults.innerHTML = '<div class="text-center py-8 text-red-400">Error loading trending GIFs. Make sure GIPHY_API_KEY is configured.</div>';
        }
    }
}

function renderGiphyResults() {
    const container = document.getElementById('giphy-search-results');
    if (!container) return;
    
    if (giphySearchResults.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-white/60">No GIFs found</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${giphySearchResults.map(gif => `
                <div class="cursor-pointer hover:opacity-80 transition-opacity" onclick="selectGif(${JSON.stringify(gif).replace(/"/g, '&quot;')})">
                    <img src="${gif.previewUrl || gif.url}" alt="${escapeHtml(gif.title || 'GIF')}" class="w-full rounded" loading="lazy">
                    <p class="text-white/70 text-xs mt-1 truncate">${escapeHtml(gif.title || 'GIF')}</p>
                </div>
            `).join('')}
        </div>
    `;
}

function selectGif(gif) {
    selectedGif = gif;
    const searchResults = document.getElementById('giphy-search-results');
    if (searchResults) {
        searchResults.innerHTML = `
            <div class="text-center">
                <img src="${gif.url}" alt="${gif.title || 'Selected GIF'}" class="mx-auto rounded" style="max-height: 200px;">
                <p class="text-white/80 mt-2">${gif.title || 'Selected GIF'}</p>
                <p class="text-white/60 text-sm mt-1">Click "Save Command" to use this GIF</p>
            </div>
        `;
    }
}

async function saveGifCommand() {
    const commandInput = document.getElementById('gif-command-name');
    const durationInput = document.getElementById('gif-duration');
    const positionInput = document.getElementById('gif-position');
    const sizeInput = document.getElementById('gif-size');
    
    if (!commandInput || !durationInput || !positionInput || !sizeInput) return;
    
    const command = commandInput.value.trim();
    const duration = parseInt(durationInput.value) || 5000;
    const position = positionInput.value || 'center';
    const size = sizeInput.value || 'medium';
    
    if (!command) {
        alert('Please enter a command name');
        return;
    }
    
    if (!selectedGif || !selectedGif.url) {
        alert('Please select a GIF');
        return;
    }
    
    try {
        const url = currentGifEditingId 
            ? `/api/gif-commands/${currentGifEditingId}`
            : '/api/gif-commands';
        
        const method = currentGifEditingId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                command: command.replace(/^!/, ''), // Remove ! if user added it
                gifUrl: selectedGif.url,
                gifId: selectedGif.id,
                gifTitle: selectedGif.title,
                duration,
                position,
                size
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save command');
        }
        
        await loadGifCommands();
        closeGifCommandModal();
    } catch (error) {
        alert('Failed to save GIF command: ' + error.message);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions for use in HTML
window.showAddGifCommandModal = showAddGifCommandModal;
window.editGifCommand = editGifCommand;
window.deleteGifCommand = deleteGifCommand;
window.closeGifCommandModal = closeGifCommandModal;
window.searchGiphy = searchGiphy;
window.loadTrendingGifs = loadTrendingGifs;
window.selectGif = selectGif;
window.saveGifCommand = saveGifCommand;
window.testGifCommand = testGifCommand;

// Test GIF command by simulating a chat message
async function testGifCommand(command) {
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
            const buttons = document.querySelectorAll(`button[onclick*="testGifCommand('${command}')"]`);
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


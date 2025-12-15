/**
 * Design Canvas - Stream Design Editor
 * Handles drag-and-drop design canvas with Interact.js for creating visual elements
 * 
 * Canvas Resolution: 1920x1080 (1080p) - 16:9 aspect ratio
 * The canvas is scaled for display but all coordinates are stored in 1080p resolution
 */

// Canvas base resolution (1080p)
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;
const CANVAS_ASPECT_RATIO = 16 / 9;

let designElements = [];
let selectedElement = null;
let elementIdCounter = 0;
let canvas = null;
let canvasScale = 1; // Scale factor for display

// Helper functions to convert between 1080p coordinates and display coordinates
function toDisplayX(x1080p) {
    return x1080p * canvasScale;
}

function toDisplayY(y1080p) {
    return y1080p * canvasScale;
}

function toDisplaySize(size1080p) {
    return size1080p * canvasScale;
}

function fromDisplayX(xDisplay) {
    return xDisplay / canvasScale;
}

function fromDisplayY(yDisplay) {
    return yDisplay / canvasScale;
}

function fromDisplaySize(sizeDisplay) {
    return sizeDisplay / canvasScale;
}

// Calculate scale factor based on actual canvas size
function updateCanvasScale() {
    if (!canvas) canvas = document.getElementById('design-canvas');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    // Scale to fit while maintaining aspect ratio
    const scaleX = canvasRect.width / CANVAS_WIDTH;
    const scaleY = canvasRect.height / CANVAS_HEIGHT;
    canvasScale = Math.min(scaleX, scaleY);
}

// Initialize Interact.js when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('design-canvas');
    if (!canvas || typeof interact === 'undefined') return;
    
    // Update scale on load and resize
    updateCanvasScale();
    window.addEventListener('resize', updateCanvasScale);
    
    // Make canvas a drop zone
    interact(canvas)
        .dropzone({
            accept: '.draggable-element',
            ondrop: function(event) {
                // Elements are already positioned by Interact.js
            }
        });
    
    // Set canvas size indicator
    const canvasInfo = document.createElement('div');
    canvasInfo.className = 'absolute top-2 right-2 text-white/60 text-xs bg-black/50 px-2 py-1 rounded';
    canvasInfo.textContent = `${CANVAS_WIDTH}×${CANVAS_HEIGHT} (1080p)`;
    canvas.appendChild(canvasInfo);
});

function addTextElement() {
    if (!canvas) canvas = document.getElementById('design-canvas');
    const elementId = `element-${elementIdCounter++}`;
    
    updateCanvasScale(); // Ensure scale is up to date
    
    // Element size in 1080p coordinates
    const initialWidth = 300; // Width in 1080p pixels
    const initialHeight = 100; // Height in 1080p pixels
    
    // Center position in 1080p coordinates
    const centerX1080p = CANVAS_WIDTH / 2 - initialWidth / 2;
    const centerY1080p = CANVAS_HEIGHT / 2 - initialHeight / 2;
    
    // Convert to display coordinates for rendering
    const centerX = toDisplayX(centerX1080p);
    const centerY = toDisplayY(centerY1080p);
    const displayWidth = toDisplaySize(initialWidth);
    const displayHeight = toDisplaySize(initialHeight);
    
    const element = document.createElement('div');
    element.id = elementId;
    element.className = 'draggable-element';
    element.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: ${displayWidth}px;
        height: ${displayHeight}px;
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        color: white;
        font-size: 24px;
        font-weight: bold;
        cursor: move;
        user-select: none;
        z-index: 10;
        min-width: 100px;
        text-align: center;
        box-sizing: border-box;
    `;
    element.textContent = 'Sample Text';
    
    // Set initial position using data attributes (Interact.js style)
    element.setAttribute('data-x', centerX);
    element.setAttribute('data-y', centerY);
    element.style.transform = `translate(${centerX}px, ${centerY}px) rotate(0deg)`;
    
    // Set z-index based on current number of elements
    element.style.zIndex = (10 + designElements.length).toString();
    
    canvas.appendChild(element);
    
    // Store coordinates in 1080p space (absolute pixels)
    const elementData = {
        id: elementId,
        type: 'text',
        x: centerX1080p,  // Store in 1080p coordinates
        y: centerY1080p,
        width: initialWidth,   // Width in 1080p space
        height: initialHeight, // Height in 1080p space
        rotation: 0,
        text: 'Sample Text',
        fontSize: 24,
        color: '#ffffff'
    };
    
    designElements.push(elementData);
    setupInteract(element, elementData);
    updateElementCount();
    updateLayersList();
    selectElement(elementId);
}

function addShapeElement(shape) {
    if (!canvas) canvas = document.getElementById('design-canvas');
    const elementId = `element-${elementIdCounter++}`;
    
    updateCanvasScale(); // Ensure scale is up to date
    
    // Size in 1080p coordinates
    const initialSize = 160; // Size in 1080p pixels
    
    // Center position in 1080p coordinates
    const centerX1080p = CANVAS_WIDTH / 2 - initialSize / 2;
    const centerY1080p = CANVAS_HEIGHT / 2 - initialSize / 2;
    
    // Convert to display coordinates
    const centerX = toDisplayX(centerX1080p);
    const centerY = toDisplayY(centerY1080p);
    const displaySize = toDisplaySize(initialSize);
    
    const element = document.createElement('div');
    element.id = elementId;
    element.className = 'draggable-element';
    
    const isCircle = shape === 'circle';
    const borderRadius = isCircle ? 'border-radius: 50%;' : '';
    
    element.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: ${displaySize}px;
        height: ${displaySize}px;
        ${borderRadius}
        background: rgba(255, 100, 100, 0.5);
        border: 2px solid rgba(255, 255, 255, 0.5);
        cursor: move;
        user-select: none;
        z-index: 10;
        box-sizing: border-box;
    `;
    
    // Set initial position using data attributes (Interact.js style)
    element.setAttribute('data-x', centerX);
    element.setAttribute('data-y', centerY);
    element.style.transform = `translate(${centerX}px, ${centerY}px) rotate(0deg)`;
    
    // Set z-index based on current number of elements
    element.style.zIndex = (10 + designElements.length).toString();
    
    canvas.appendChild(element);
    
    // Store coordinates in 1080p space
    const elementData = {
        id: elementId,
        type: shape,
        x: centerX1080p,
        y: centerY1080p,
        width: initialSize,
        height: initialSize,
        rotation: 0,
        color: '#ff6464'
    };
    
    designElements.push(elementData);
    setupInteract(element, elementData);
    updateElementCount();
    updateLayersList();
    selectElement(elementId);
}

function setupInteract(element, elementData) {
    if (typeof interact === 'undefined') return;
    
    interact(element)
        .draggable({
            listeners: {
                start(event) {
                    selectElement(elementData.id);
                },
                move(event) {
                    const target = event.target;
                    let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                    
                    // Constrain to canvas bounds
                    const canvasRect = canvas.getBoundingClientRect();
                    const rect = target.getBoundingClientRect();
                    const width = rect.width;
                    const height = rect.height;
                    
                    // Ensure element stays within canvas
                    x = Math.max(0, Math.min(x, canvasRect.width - width));
                    y = Math.max(0, Math.min(y, canvasRect.height - height));
                    
                    // Apply transform
                    target.style.transform = `translate(${x}px, ${y}px) rotate(${elementData.rotation || 0}deg)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    
                    // Update element data (store in 1080p coordinates)
                    elementData.x = fromDisplayX(x);
                    elementData.y = fromDisplayY(y);
                    
                    // Constrain to 1080p bounds
                    elementData.x = Math.max(0, Math.min(elementData.x, CANVAS_WIDTH - fromDisplaySize(width)));
                    elementData.y = Math.max(0, Math.min(elementData.y, CANVAS_HEIGHT - fromDisplaySize(height)));
                    
                    updatePropertiesPanel();
                }
            },
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: canvas,
                    endOnly: false
                })
            ]
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                start(event) {
                    selectElement(elementData.id);
                },
                move(event) {
                    const target = event.target;
                    
                    // Get current position
                    let x = parseFloat(target.getAttribute('data-x')) || 0;
                    let y = parseFloat(target.getAttribute('data-y')) || 0;
                    
                    // Adjust position if resizing from left or top
                    x += event.deltaRect.left;
                    y += event.deltaRect.top;
                    
                    // Update size
                    target.style.width = event.rect.width + 'px';
                    target.style.height = event.rect.height + 'px';
                    
                    // Constrain position to canvas bounds
                    const canvasRect = canvas.getBoundingClientRect();
                    x = Math.max(0, Math.min(x, canvasRect.width - event.rect.width));
                    y = Math.max(0, Math.min(y, canvasRect.height - event.rect.height));
                    
                    // Apply transform
                    target.style.transform = `translate(${x}px, ${y}px) rotate(${elementData.rotation || 0}deg)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    
                    // Update element data (store in 1080p coordinates)
                    elementData.width = fromDisplaySize(event.rect.width);
                    elementData.height = fromDisplaySize(event.rect.height);
                    elementData.x = fromDisplayX(x);
                    elementData.y = fromDisplayY(y);
                    
                    // Constrain to 1080p bounds
                    elementData.x = Math.max(0, Math.min(elementData.x, CANVAS_WIDTH - elementData.width));
                    elementData.y = Math.max(0, Math.min(elementData.y, CANVAS_HEIGHT - elementData.height));
                    
                    updatePropertiesPanel();
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 20, height: 20 },
                    max: { width: 1000, height: 1000 }
                }),
                interact.modifiers.restrictEdges({
                    outer: canvas
                })
            ]
        })
        .on('tap', function(event) {
            selectElement(elementData.id);
        });
}

function selectElement(elementId) {
    // Deselect all
    document.querySelectorAll('.draggable-element').forEach(el => {
        el.style.border = el.style.border.replace('3px solid', '2px solid');
        el.style.boxShadow = '';
        el.style.outline = '';
    });
    
    const elementData = designElements.find(el => el.id === elementId);
    if (!elementData) {
        selectedElement = null;
        updatePropertiesPanel();
        updateLayersList();
        return;
    }
    
    selectedElement = elementData;
    const element = document.getElementById(elementId);
    
    if (element) {
        element.style.border = '3px solid #60a5fa';
        element.style.boxShadow = '0 0 10px rgba(96, 165, 250, 0.5)';
        element.style.outline = '1px dashed rgba(96, 165, 250, 0.3)';
    }
    
    updatePropertiesPanel();
    updateLayersList();
}

function updatePropertiesPanel() {
    const propsPanel = document.getElementById('element-properties');
    if (!selectedElement) {
        propsPanel.classList.add('hidden');
        document.getElementById('selected-element-info').textContent = 'No element selected';
        return;
    }
    
    propsPanel.classList.remove('hidden');
    
    const element = document.getElementById(selectedElement.id);
    if (!element) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // Get actual pixel position from data attributes (more accurate)
    // Handle both old percentage format and new 1080p format
    let xPx, yPx, widthPx, heightPx;
    
    if (selectedElement.x > 100) {
        // New format: 1080p coordinates
        xPx = toDisplayX(selectedElement.x);
        yPx = toDisplayY(selectedElement.y);
        widthPx = toDisplaySize(selectedElement.width);
        heightPx = toDisplaySize(selectedElement.height);
    } else {
        // Old format: percentages (convert for display)
        xPx = parseFloat(element.getAttribute('data-x')) || ((selectedElement.x / 100) * canvasRect.width);
        yPx = parseFloat(element.getAttribute('data-y')) || ((selectedElement.y / 100) * canvasRect.height);
        widthPx = selectedElement.width || 100;
        heightPx = selectedElement.height || 50;
    }
    
    document.getElementById('prop-x').value = Math.round(selectedElement.x > 100 ? selectedElement.x : xPx);
    document.getElementById('prop-y').value = Math.round(selectedElement.y > 100 ? selectedElement.y : yPx);
    document.getElementById('prop-width').value = Math.round(selectedElement.width || 100);
    document.getElementById('prop-height').value = Math.round(selectedElement.height || 50);
    document.getElementById('prop-rotation').value = selectedElement.rotation || 0;
    document.getElementById('rotation-value').textContent = (selectedElement.rotation || 0) + '°';
    
    // Show/hide text-specific properties
    const textGroup = document.getElementById('prop-text-group');
    const sizeGroup = document.getElementById('prop-size-group');
    
    if (selectedElement.type === 'text') {
        textGroup.style.display = 'block';
        sizeGroup.style.display = 'block';
        document.getElementById('prop-text').value = selectedElement.text || '';
        document.getElementById('prop-fontsize').value = selectedElement.fontSize || 24;
        document.getElementById('prop-color').value = selectedElement.color || '#ffffff';
    } else {
        textGroup.style.display = 'none';
        sizeGroup.style.display = 'block';
        document.getElementById('prop-color').value = selectedElement.color || '#ff6464';
    }
    
    document.getElementById('selected-element-info').textContent = 
        `Selected: ${selectedElement.type} (${Math.round(xPx)}, ${Math.round(yPx)})`;
}

function updateRotationSlider(value) {
    document.getElementById('rotation-value').textContent = value + '°';
    updateElementProperty('rotation', value);
}

function updateElementProperty(prop, value) {
    if (!selectedElement) return;
    
    const element = document.getElementById(selectedElement.id);
    if (!element) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    let currentX = parseFloat(element.getAttribute('data-x')) || 0;
    let currentY = parseFloat(element.getAttribute('data-y')) || 0;
    const currentRotation = selectedElement.rotation || 0;
    
    updateCanvasScale(); // Ensure scale is current
    
    switch(prop) {
        case 'x':
            // Value is in 1080p coordinates
            const x1080p = parseFloat(value);
            // Constrain to 1080p bounds
            const elementWidth1080p = selectedElement.width || 100;
            const constrainedX1080p = Math.max(0, Math.min(x1080p, CANVAS_WIDTH - elementWidth1080p));
            selectedElement.x = constrainedX1080p;
            
            // Convert to display coordinates for rendering
            const xDisplay = toDisplayX(constrainedX1080p);
            element.style.transform = `translate(${xDisplay}px, ${currentY}px) rotate(${currentRotation}deg)`;
            element.setAttribute('data-x', xDisplay);
            currentX = xDisplay;
            break;
        case 'y':
            // Value is in 1080p coordinates
            const y1080p = parseFloat(value);
            // Constrain to 1080p bounds
            const elementHeight1080p = selectedElement.height || 50;
            const constrainedY1080p = Math.max(0, Math.min(y1080p, CANVAS_HEIGHT - elementHeight1080p));
            selectedElement.y = constrainedY1080p;
            
            // Convert to display coordinates for rendering
            const yDisplay = toDisplayY(constrainedY1080p);
            element.style.transform = `translate(${currentX}px, ${yDisplay}px) rotate(${currentRotation}deg)`;
            element.setAttribute('data-y', yDisplay);
            currentY = yDisplay;
            break;
        case 'width':
            // Value is in 1080p coordinates
            const newWidth1080p = parseFloat(value);
            selectedElement.width = newWidth1080p;
            
            // Convert to display coordinates for rendering
            const widthDisplay = toDisplaySize(newWidth1080p);
            element.style.width = widthDisplay + 'px';
            
            // Re-constrain position if element goes out of bounds
            const maxX1080p = CANVAS_WIDTH - newWidth1080p;
            if (selectedElement.x > maxX1080p) {
                selectedElement.x = maxX1080p;
                currentX = toDisplayX(maxX1080p);
                element.setAttribute('data-x', currentX);
            }
            element.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentRotation}deg)`;
            break;
        case 'height':
            // Value is in 1080p coordinates
            const newHeight1080p = parseFloat(value);
            selectedElement.height = newHeight1080p;
            
            // Convert to display coordinates for rendering
            const heightDisplay = toDisplaySize(newHeight1080p);
            element.style.height = heightDisplay + 'px';
            
            // Re-constrain position if element goes out of bounds
            const maxY1080p = CANVAS_HEIGHT - newHeight1080p;
            if (selectedElement.y > maxY1080p) {
                selectedElement.y = maxY1080p;
                currentY = toDisplayY(maxY1080p);
                element.setAttribute('data-y', currentY);
            }
            element.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentRotation}deg)`;
            break;
        case 'rotation':
            selectedElement.rotation = parseFloat(value);
            element.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${value}deg)`;
            document.getElementById('rotation-value').textContent = value + '°';
            break;
        case 'text':
            selectedElement.text = value;
            element.textContent = value;
            break;
        case 'fontSize':
            selectedElement.fontSize = parseInt(value);
            element.style.fontSize = value + 'px';
            break;
        case 'color':
            selectedElement.color = value;
            if (selectedElement.type === 'text') {
                element.style.color = value;
            } else {
                element.style.background = value + '80';
            }
            break;
    }
    
    updatePropertiesPanel();
}

function deleteSelectedElement() {
    if (!selectedElement) return;
    deleteElementFromLayer(selectedElement.id);
}

function updateElementCount() {
    const countEl = document.getElementById('element-count');
    if (countEl) {
        countEl.textContent = `${designElements.length} element${designElements.length !== 1 ? 's' : ''}`;
    }
}

function updateLayersList() {
    const layersList = document.getElementById('layers-list');
    const layerCount = document.getElementById('layer-count');
    
    if (!layersList) return;
    
    if (designElements.length === 0) {
        layersList.innerHTML = `
            <div class="text-center py-8 text-white/40 text-sm">
                <i class="fas fa-layer-group text-2xl mb-2"></i>
                <p>No elements yet</p>
            </div>
        `;
        if (layerCount) layerCount.textContent = '0';
        return;
    }
    
    // Sort by z-index (reverse order - top layer first in list)
    const sortedElements = [...designElements].sort((a, b) => {
        const elA = document.getElementById(a.id);
        const elB = document.getElementById(b.id);
        const zA = elA ? parseInt(window.getComputedStyle(elA).zIndex) || 0 : 0;
        const zB = elB ? parseInt(window.getComputedStyle(elB).zIndex) || 0 : 0;
        return zB - zA; // Higher z-index first
    });
    
    layersList.innerHTML = sortedElements.map((elementData, index) => {
        const element = document.getElementById(elementData.id);
        const isSelected = selectedElement && selectedElement.id === elementData.id;
        const icon = elementData.type === 'text' ? 'fa-font' : 
                    elementData.type === 'image' ? 'fa-image' :
                    elementData.type === 'circle' ? 'fa-circle' : 'fa-square';
        const displayName = elementData.type === 'text' ? 
            (elementData.text || 'Text') : 
            elementData.type === 'image' ?
            (elementData.imagePath ? elementData.imagePath.split('/').pop() : 'Image') :
            elementData.type.charAt(0).toUpperCase() + elementData.type.slice(1);
        
        return `
            <div 
                class="layer-item p-2 mb-1 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-white/20 border border-blue-400' : 'bg-white/5 hover:bg-white/10'}"
                onclick="selectElement('${elementData.id}')"
                data-element-id="${elementData.id}"
                data-layer-index="${index}"
            >
                <div class="flex items-center gap-2">
                    <i class="fas fa-grip-vertical text-white/40 text-xs cursor-move" 
                       title="Drag to reorder"></i>
                    <i class="fas ${icon} text-white/60 text-xs"></i>
                    <span class="flex-1 text-white/90 text-sm truncate">${escapeHtml(displayName)}</span>
                    <div class="flex items-center gap-1">
                        <button 
                            class="btn btn-xs btn-ghost text-white/60 hover:text-white"
                            onclick="event.stopPropagation(); toggleLayerVisibility('${elementData.id}')"
                            title="Toggle visibility"
                        >
                            <i class="fas fa-eye" id="eye-${elementData.id}"></i>
                        </button>
                        <button 
                            class="btn btn-xs btn-ghost text-white/60 hover:text-red-400"
                            onclick="event.stopPropagation(); deleteElementFromLayer('${elementData.id}')"
                            title="Delete"
                        >
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (layerCount) layerCount.textContent = designElements.length.toString();
    
    // Setup drag and drop for layer items using Interact.js
    if (typeof interact !== 'undefined') {
        setupLayerDragAndDrop();
    }
}

function setupLayerDragAndDrop() {
    const layersList = document.getElementById('layers-list');
    if (!layersList || typeof interact === 'undefined') return;
    
    const layerItems = layersList.querySelectorAll('.layer-item');
    
    layerItems.forEach(item => {
        interact(item)
            .draggable({
                listeners: {
                    start(event) {
                        event.target.style.opacity = '0.5';
                        event.target.classList.add('dragging');
                    },
                    move(event) {
                        const target = event.target;
                        const rect = target.getBoundingClientRect();
                        const y = rect.top + event.dy;
                        
                        // Find which layer item we're over
                        const layerItems = Array.from(layersList.querySelectorAll('.layer-item'));
                        let insertBefore = null;
                        
                        for (let otherItem of layerItems) {
                            if (otherItem === target) continue;
                            
                            const otherRect = otherItem.getBoundingClientRect();
                            const otherCenterY = otherRect.top + otherRect.height / 2;
                            
                            if (y < otherCenterY) {
                                insertBefore = otherItem;
                                break;
                            }
                        }
                        
                        // Visual feedback - move the dragging item
                        if (insertBefore) {
                            layersList.insertBefore(target, insertBefore);
                        } else {
                            layersList.appendChild(target);
                        }
                    },
                    end(event) {
                        event.target.style.opacity = '';
                        event.target.classList.remove('dragging');
                        
                        // Reorder elements array based on new DOM order
                        const layerItems = Array.from(layersList.querySelectorAll('.layer-item'));
                        const newOrder = layerItems.map(item => {
                            return designElements.find(el => el.id === item.getAttribute('data-element-id'));
                        }).filter(el => el !== undefined);
                        
                        if (newOrder.length === designElements.length) {
                            designElements = newOrder;
                            
                            // Update z-index based on new order (reverse - last in array = highest z-index)
                            designElements.forEach((el, index) => {
                                const element = document.getElementById(el.id);
                                if (element) {
                                    // Reverse order: last element gets highest z-index
                                    element.style.zIndex = (10 + designElements.length - index).toString();
                                }
                            });
                            
                            // Update layers list without recreating (just update order)
                            updateLayersList();
                        }
                    }
                },
                modifiers: [
                    interact.modifiers.restrict({
                        restriction: layersList,
                        endOnly: true
                    })
                ]
            });
    });
}

function toggleLayerVisibility(elementId) {
    const element = document.getElementById(elementId);
    const eyeIcon = document.getElementById(`eye-${elementId}`);
    if (!element || !eyeIcon) return;
    
    const isVisible = element.style.display !== 'none';
    element.style.display = isVisible ? 'none' : '';
    eyeIcon.className = isVisible ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function deleteElementFromLayer(elementId) {
    if (!confirm('Delete this element?')) return;
    
    const elementData = designElements.find(el => el.id === elementId);
    if (!elementData) return;
    
    const element = document.getElementById(elementId);
    if (element) {
        if (typeof interact !== 'undefined') {
            interact(element).unset();
        }
        element.remove();
    }
    
    designElements = designElements.filter(el => el.id !== elementId);
    if (selectedElement && selectedElement.id === elementId) {
        selectedElement = null;
    }
    
    updatePropertiesPanel();
    updateElementCount();
    updateLayersList();
}

function clearCanvas() {
    if (designElements.length === 0) return;
    if (!confirm('Clear all elements from canvas?')) return;
    
    designElements.forEach(elementData => {
        const element = document.getElementById(elementData.id);
        if (element) {
            if (typeof interact !== 'undefined') {
                interact(element).unset();
            }
            element.remove();
        }
    });
    
    designElements = [];
    selectedElement = null;
    updatePropertiesPanel();
    updateElementCount();
    updateLayersList();
}

async function saveDesign() {
    try {
        const response = await fetch('/api/design', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                elements: designElements
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Save failed' }));
            throw new Error(errorData.message || errorData.error || 'Failed to save design');
        }

        const data = await response.json();
        
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast toast-top toast-end';
        toast.innerHTML = `
            <div class="alert alert-success">
                <span>Design saved successfully!</span>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
        
        console.log('Design saved:', data);
    } catch (error) {
        console.error('Error saving design:', error);
        alert('Failed to save design: ' + error.message);
    }
}

// Load design on page load
async function loadDesign() {
    try {
        const response = await fetch('/api/design', {
            credentials: 'include'
        });

        if (!response.ok) {
            // No design saved yet, that's okay
            return;
        }

        const data = await response.json();
        if (data.success && data.design && data.design.design_data && data.design.design_data.length > 0) {
            // Restore elements
            designElements = data.design.design_data;
            renderDesignElements();
        }
    } catch (error) {
        console.error('Error loading design:', error);
    }
}

function renderDesignElements() {
    if (!canvas) canvas = document.getElementById('design-canvas');
    if (!canvas) return;
    
    const canvasRect = canvas.getBoundingClientRect();
    
    // Clear existing elements (except the ones we're about to restore)
    const existingElements = canvas.querySelectorAll('.draggable-element');
    existingElements.forEach(el => el.remove());
    
    // Reset counter to avoid ID conflicts
    elementIdCounter = designElements.length;
    
    // Render each element
    designElements.forEach((elementData, index) => {
        const elementId = elementData.id || `element-${index}`;
        
        // Convert 1080p coordinates to display coordinates
        // Handle both old percentage format and new 1080p format
        let x1080p, y1080p, width1080p, height1080p;
        
        if (elementData.x > 100) {
            // New format: 1080p coordinates (pixels)
            x1080p = elementData.x;
            y1080p = elementData.y;
            width1080p = elementData.width;
            height1080p = elementData.height;
        } else {
            // Old format: percentages (migrate to 1080p)
            x1080p = (elementData.x / 100) * CANVAS_WIDTH;
            y1080p = (elementData.y / 100) * CANVAS_HEIGHT;
            width1080p = elementData.width * (CANVAS_WIDTH / canvasRect.width);
            height1080p = elementData.height * (CANVAS_HEIGHT / canvasRect.height);
            // Update to new format
            elementData.x = x1080p;
            elementData.y = y1080p;
            elementData.width = width1080p;
            elementData.height = height1080p;
        }
        
        const x = toDisplayX(x1080p);
        const y = toDisplayY(y1080p);
        const width = toDisplaySize(width1080p);
        const height = toDisplaySize(height1080p);
        
        let element;
        
        if (elementData.type === 'text') {
            element = document.createElement('div');
            element.textContent = elementData.text || 'Sample Text';
            element.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: ${width}px;
                height: ${height}px;
                padding: 10px 20px;
                background: rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                color: ${elementData.color || '#ffffff'};
                font-size: ${elementData.fontSize || 24}px;
                font-weight: bold;
                cursor: move;
                user-select: none;
                z-index: ${10 + index};
                min-width: 100px;
                text-align: center;
                box-sizing: border-box;
            `;
        } else if (elementData.type === 'image') {
            element = document.createElement('img');
            element.src = elementData.imagePath;
            element.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: ${width}px;
                height: ${height}px;
                object-fit: contain;
                border: 2px solid rgba(255, 255, 255, 0.3);
                cursor: move;
                user-select: none;
                z-index: ${10 + index};
                box-sizing: border-box;
            `;
        } else if (elementData.type === 'circle' || elementData.type === 'square') {
            element = document.createElement('div');
            const isCircle = elementData.type === 'circle';
            const borderRadius = isCircle ? 'border-radius: 50%;' : '';
            element.style.cssText = `
                position: absolute;
                left: 0;
                top: 0;
                width: ${width}px;
                height: ${height}px;
                ${borderRadius}
                background: ${elementData.color || 'rgba(255, 100, 100, 0.5)'};
                border: 2px solid rgba(255, 255, 255, 0.5);
                cursor: move;
                user-select: none;
                z-index: ${10 + index};
                box-sizing: border-box;
            `;
        }
        
        if (element) {
            element.id = elementId;
            element.className = 'draggable-element';
            element.setAttribute('data-x', x);
            element.setAttribute('data-y', y);
            element.style.transform = `translate(${x}px, ${y}px) rotate(${elementData.rotation || 0}deg)`;
            
            canvas.appendChild(element);
            setupInteract(element, elementData);
        }
    });
    
    updateElementCount();
    updateLayersList();
}

// Load design when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for canvas to be ready
    setTimeout(() => {
        loadDesign();
    }, 500);
});

// Export for use by imageManager.js
window.addImageElement = function(imagePath, width, height) {
    if (!canvas) canvas = document.getElementById('design-canvas');
    const elementId = `element-${elementIdCounter++}`;
    
    updateCanvasScale(); // Ensure scale is up to date
    
    // Create image element and wait for it to load to get actual dimensions
    const img = new Image();
    img.onload = function() {
        // Use actual image dimensions if provided dimensions are null, otherwise use provided
        // Dimensions are in 1080p space
        const actualWidth1080p = width && width > 0 ? width : Math.min(this.naturalWidth, 400);
        const actualHeight1080p = height && height > 0 ? height : Math.min(this.naturalHeight, 400);
        
        // Center position in 1080p coordinates
        const centerX1080p = CANVAS_WIDTH / 2 - actualWidth1080p / 2;
        const centerY1080p = CANVAS_HEIGHT / 2 - actualHeight1080p / 2;
        
        // Convert to display coordinates
        const centerX = toDisplayX(centerX1080p);
        const centerY = toDisplayY(centerY1080p);
        const displayWidth = toDisplaySize(actualWidth1080p);
        const displayHeight = toDisplaySize(actualHeight1080p);
        
        const element = document.createElement('img');
        element.id = elementId;
        element.className = 'draggable-element';
        element.src = imagePath;
        element.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            width: ${displayWidth}px;
            height: ${displayHeight}px;
            object-fit: contain;
            border: 2px solid rgba(255, 255, 255, 0.3);
            cursor: move;
            user-select: none;
            z-index: 10;
            box-sizing: border-box;
        `;
        
        // Set initial position using data attributes (Interact.js style)
        element.setAttribute('data-x', centerX);
        element.setAttribute('data-y', centerY);
        element.style.transform = `translate(${centerX}px, ${centerY}px) rotate(0deg)`;
        
        // Set z-index based on current number of elements
        element.style.zIndex = (10 + designElements.length).toString();
        
        canvas.appendChild(element);
        
        // Store coordinates in 1080p space
        const elementData = {
            id: elementId,
            type: 'image',
            x: centerX1080p,
            y: centerY1080p,
            width: actualWidth1080p,
            height: actualHeight1080p,
            rotation: 0,
            imagePath: imagePath
        };
        
        designElements.push(elementData);
        setupInteract(element, elementData);
        updateElementCount();
        updateLayersList();
        selectElement(elementId);
    };
    img.onerror = function() {
        alert('Failed to load image');
    };
    img.src = imagePath;
};


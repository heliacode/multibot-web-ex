/**
 * Image Management
 * Handles image upload, gallery display, and deletion for the design canvas
 */

let userImages = [];

async function showImageSelector() {
    const modal = document.getElementById('image-selector-modal');
    modal.showModal();
    await loadUserImages();
}

function closeImageSelector() {
    document.getElementById('image-selector-modal').close();
}

async function loadUserImages() {
    try {
        const response = await fetch('/api/images', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load images');
        }

        const data = await response.json();
        if (data.success) {
            userImages = data.images || [];
            renderImageGallery();
        }
    } catch (error) {
        console.error('Error loading images:', error);
        document.getElementById('image-gallery').innerHTML = `
            <div class="text-center py-8 text-white/40 text-sm col-span-3">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Failed to load images</p>
            </div>
        `;
    }
}

function renderImageGallery() {
    const gallery = document.getElementById('image-gallery');
    
    if (userImages.length === 0) {
        gallery.innerHTML = `
            <div class="text-center py-8 text-white/40 text-sm col-span-3">
                <i class="fas fa-images text-2xl mb-2"></i>
                <p>No images uploaded yet</p>
            </div>
        `;
        return;
    }

    gallery.innerHTML = userImages.map(image => `
        <div class="relative group cursor-pointer" onclick="addImageElement('${image.file_path}', ${image.width || 200}, ${image.height || 200})">
            <img 
                src="${image.file_path}" 
                alt="${escapeHtml(image.file_name)}"
                class="w-full h-24 object-cover rounded-lg border-2 border-white/20 hover:border-blue-400 transition-colors"
            />
            <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    class="btn btn-xs btn-error text-white"
                    onclick="event.stopPropagation(); deleteImage(${image.id})"
                    title="Delete"
                >
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate">
                ${escapeHtml(image.file_name)}
            </div>
        </div>
    `).join('');
}

function handleImageDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-white/60');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        uploadImageFile(files[0]);
    }
}

function handleImageDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-white/60');
}

function handleImageDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-white/60');
}

function handleImageFileSelect(event) {
    if (event.target.files.length > 0) {
        uploadImageFile(event.target.files[0]);
    }
}

async function uploadImageFile(file) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('Only image files (JPEG, PNG, GIF, WebP) are allowed');
        return;
    }

    // Validate file size (600KB)
    if (file.size > 600 * 1024) {
        alert('File size exceeds 600KB limit');
        return;
    }

    const formData = new FormData();
    formData.append('imageFile', file);

    try {
        const response = await fetch('/api/images', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
            const errorMessage = errorData.message || errorData.error || 'Upload failed';
            throw new Error(errorMessage);
        }

        const data = await response.json();
        if (data.success) {
            await loadUserImages();
            
            // Show success message
            const toast = document.createElement('div');
            toast.className = 'toast toast-top toast-end';
            toast.innerHTML = `
                <div class="alert alert-success">
                    <span>Image uploaded successfully!</span>
                </div>
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image: ' + error.message);
    }
}

async function deleteImage(imageId) {
    if (!confirm('Delete this image? This will also remove it from any designs using it.')) {
        return;
    }

    try {
        const response = await fetch(`/api/images/${imageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Delete failed');
        }

        await loadUserImages();
    } catch (error) {
        console.error('Error deleting image:', error);
        alert('Failed to delete image');
    }
}


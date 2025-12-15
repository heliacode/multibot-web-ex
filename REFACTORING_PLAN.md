# Dashboard.html Refactoring Plan

## Current Status
- ✅ CSS extracted to `/public/css/dashboard.css`
- ✅ Utils extracted to `/public/js/utils.js`
- ✅ Navigation extracted to `/public/js/navigation.js`
- ⏳ Remaining JavaScript needs extraction

## Remaining JavaScript Modules to Extract

### 1. `/public/js/audioCommands.js` (~450 lines)
- Audio command CRUD operations
- File upload handling
- Modal management
- Audio preview functionality

### 2. `/public/js/chatDebug.js` (~200 lines)
- WebSocket connection management
- Chat message display
- Auto-connect functionality

### 3. `/public/js/obsToken.js` (~150 lines)
- OBS token loading
- Token regeneration
- URL management

### 4. `/public/js/designCanvas.js` (~800 lines)
- Canvas element management
- Interact.js integration
- Drag, resize, rotate functionality
- Layers management

### 5. `/public/js/imageManagement.js` (~200 lines)
- Image upload
- Image gallery
- Image deletion
- Canvas integration

## Next Steps
1. Extract each module from dashboard.html
2. Update dashboard.html to reference external modules
3. Test that everything still works
4. Remove all inline JavaScript from dashboard.html


# Dashboard JavaScript Modules Structure

## File Organization

### Core Files
- `utils.js` - Utility functions (escapeHtml, formatFileSize, console suppression)
- `navigation.js` - Navigation and user info management

### Feature Modules
- `audioCommands.js` - Audio command CRUD operations
- `chatDebug.js` - Chat WebSocket connection and message display
- `obsToken.js` - OBS token generation and management
- `designCanvas.js` - Design canvas with drag/drop, resize, rotate
- `imageManagement.js` - Image upload, gallery, and canvas integration

## Loading Order
1. utils.js (must load first)
2. navigation.js
3. audioCommands.js
4. chatDebug.js
5. obsToken.js
6. designCanvas.js
7. imageManagement.js

## Global Variables Shared Between Modules
- `handleCommandTrigger()` - Shared between chatDebug and audioCommands
- `escapeHtml()` - From utils.js
- `formatFileSize()` - From utils.js


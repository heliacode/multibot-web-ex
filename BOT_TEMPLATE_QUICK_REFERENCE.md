# Quick Reference: Adding a New Bot

## Step-by-Step Checklist

### 1. Frontend - Dashboard Card
**Location:** `public/dashboard.html` - Inside `#dashboard-cards` grid

```html
<!-- [BOT_NAME] Bot Card -->
<div class="glass-card rounded-3xl shadow-2xl cursor-pointer" onclick="showSection('[bot-id]', event)">
    <div class="card-body p-6 md:p-8 text-center">
        <div class="flex flex-col items-center justify-center min-h-[180px] md:min-h-[200px]">
            <i class="fas fa-[icon] text-5xl md:text-6xl text-white/80 mb-3 md:mb-4"></i>
            <h3 class="text-xl md:text-2xl font-bold text-white mb-2">[BOT_NAME] Bot</h3>
            <p class="text-white/70 text-xs md:text-sm px-2">[Description]</p>
        </div>
    </div>
</div>
```

### 2. Frontend - Bot Section
**Location:** `public/dashboard.html` - After dashboard cards, before modals

```html
<!-- [BOT_NAME] Bot Section -->
<div id="[bot-id]-section" class="glass-card rounded-3xl shadow-2xl" style="display: none;">
    <div class="card-body p-8">
        <div class="flex items-center justify-between mb-6 responsive-header">
            <div>
                <h2 class="card-title text-2xl text-white mb-2">
                    <i class="fas fa-[icon] text-white/80"></i>
                    [BOT_NAME] Bot
                </h2>
                <p class="text-white/80">[Description]</p>
            </div>
            <button class="btn btn-primary text-white" onclick="showAdd[BotName]Modal()">
                <i class="fas fa-plus"></i>
                Add [Item]
            </button>
        </div>
        <div class="divider my-4" style="border-color: rgba(255,255,255,0.2);"></div>
        <div id="[bot-id]-list" class="space-y-4">
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-[icon] text-6xl mb-4 animate-float"></i>
                <p>No [items] yet. Click "Add [Item]" to create one.</p>
            </div>
        </div>
    </div>
</div>
```

### 3. Frontend - Sidebar Navigation
**Location:** `public/dashboard.html` - Inside sidebar `<ul class="menu">`

```html
<li>
    <a href="#[bot-id]" class="text-white hover:bg-white/20 rounded-lg" onclick="showSection('[bot-id]', event)">
        <i class="fas fa-[icon]"></i>
        [BOT_NAME] Bot
    </a>
</li>
```

**For setup/config items (purple color):**
```html
<li>
    <a href="#[bot-id]" class="text-purple-300 hover:bg-purple-500/20 rounded-lg" onclick="showSection('[bot-id]', event)">
        <i class="fas fa-[icon]"></i>
        [BOT_NAME]
    </a>
</li>
```

### 4. Frontend - JavaScript File
**Create:** `public/js/[botId].js`

**Key functions needed:**
- `load[BotName]()` - Fetch data from API
- `render[BotName]()` - Display data in list
- `showAdd[BotName]Modal()` - Open add modal
- `save[BotName]()` - Create/update item
- `edit[BotName](id)` - Load item for editing
- `delete[BotName](id)` - Delete item
- `ensure[BotName]Loaded()` - Lazy load when section shown

**Export all functions to window:**
```javascript
window.load[BotName] = load[BotName];
window.showAdd[BotName]Modal = showAdd[BotName]Modal;
// ... etc
```

### 5. Frontend - Navigation Hook
**Location:** `public/js/navigation.js` - In `showSection()` function

```javascript
case '[bot-id]':
case '[bot-id]-section':
    if (window.ensure[BotName]Loaded) {
        setTimeout(() => window.ensure[BotName]Loaded(), 100);
    }
    break;
```

### 6. Frontend - Script Tag
**Location:** `public/dashboard.html` - Before `</body>`

```html
<script src="/js/[botId].js"></script>
```

### 7. Backend - Route File
**Create:** `routes/[botId].js`

```javascript
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/[botId]Controller.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', controller.get[BotName]s);
router.get('/:id', controller.get[BotName]ById);
router.post('/', controller.create[BotName]);
router.put('/:id', controller.update[BotName]);
router.delete('/:id', controller.delete[BotName]);

export default router;
```

### 8. Backend - Controller File
**Create:** `controllers/[botId]Controller.js`

**Required functions:**
- `create[BotName](req, res)`
- `get[BotName]s(req, res)`
- `get[BotName]ById(req, res)`
- `update[BotName](req, res)`
- `delete[BotName](req, res)`

**Pattern:**
1. Check authentication (`req.session.userId`)
2. Get user from Twitch ID
3. Call model function
4. Return JSON response

### 9. Backend - Model File
**Create:** `models/[botId].js`

**Required functions:**
- `create[BotName](data)`
- `get[BotName]sByUserId(userId)`
- `get[BotName]ById(id, userId)`
- `update[BotName](id, userId, updateData)`
- `delete[BotName](id, userId)`

### 10. Backend - Register Route
**Location:** `server.js` or `routes/index.js`

```javascript
import [botId]Routes from './routes/[botId].js';
app.use('/api/[bot-id]', [botId]Routes);
```

### 11. Database - Migration (if new table)
**Create:** `database/add_[table_name]_table.sql`

```sql
CREATE TABLE IF NOT EXISTS [table_name] (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    -- Add your columns here
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_[table_name]_user_id ON [table_name](user_id);
CREATE INDEX IF NOT EXISTS idx_[table_name]_twitch_user_id ON [table_name](twitch_user_id);

CREATE TRIGGER update_[table_name]_updated_at BEFORE UPDATE ON [table_name]
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Naming Conventions

- **Bot ID:** `kebab-case` (e.g., `sound-effects`, `text-to-speech`)
- **Section ID:** `[bot-id]-section` (e.g., `sound-effects-section`)
- **JavaScript File:** `[botId].js` (camelCase, e.g., `soundEffects.js`)
- **JavaScript Functions:** `PascalCase` (e.g., `SoundEffect`, `loadSoundEffects`)
- **Backend Routes:** `/api/[bot-id]` (kebab-case)
- **Backend Files:** `[botId]Controller.js`, `[botId].js` (camelCase)
- **Database Table:** `snake_case` (e.g., `sound_effects`)

## Common Patterns

### Modal Template
```html
<dialog id="[bot-id]-modal" class="modal">
    <div class="modal-box glass-card max-w-4xl">
        <h3 class="font-bold text-2xl text-white mb-4">
            <i class="fas fa-[icon]"></i>
            <span id="[bot-id]-modal-title">Add [Item]</span>
        </h3>
        <form id="[bot-id]-form" onsubmit="event.preventDefault(); save[BotName]();">
            <!-- Form fields here -->
            <div class="modal-action">
                <button type="button" class="btn btn-ghost text-white" onclick="close[BotName]Modal()">Cancel</button>
                <button type="submit" class="btn btn-primary text-white">
                    <i class="fas fa-save"></i>
                    Save
                </button>
            </div>
        </form>
    </div>
    <form method="dialog" class="modal-backdrop">
        <button onclick="close[BotName]Modal()">close</button>
    </form>
</dialog>
```

### List Item Template
```html
<div class="glass-card rounded-xl p-4" data-[bot-id]-id="${item.id}">
    <div class="flex items-center justify-between responsive-command-card">
        <div class="flex-1">
            <div class="flex items-center gap-3 mb-2 flex-wrap">
                <span class="font-bold text-white text-lg">${item.name}</span>
                <span class="badge ${item.is_active ? 'badge-success' : 'badge-error'}">
                    ${item.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="text-sm text-white/70">
                <!-- Item details -->
            </div>
        </div>
        <div class="flex items-center gap-2 responsive-command-buttons">
            <button class="btn btn-sm btn-primary text-white" onclick="edit[BotName](${item.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-error text-white" onclick="delete[BotName](${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
</div>
```

## Testing Checklist

- [ ] Dashboard card appears and is clickable
- [ ] Section shows when card is clicked
- [ ] Sidebar navigation works
- [ ] List loads data from API
- [ ] Add modal opens and saves
- [ ] Edit loads existing data
- [ ] Delete works
- [ ] Empty state shows when no items
- [ ] Error handling works
- [ ] Responsive design works on mobile

## Example: "Sound Effects Bot"

**Replacements:**
- `[BOT_NAME]` → `Sound Effects`
- `[bot-id]` → `sound-effects`
- `[botId]` → `soundEffects`
- `[BotName]` → `SoundEffect`
- `[Item]` → `Sound Effect`
- `[items]` → `sound effects`
- `[icon]` → `sound`
- `[table_name]` → `sound_effects`

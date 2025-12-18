# Bot Template Guide

This template provides a standardized way to add new bots to the MultiBot dashboard. Follow these steps to add a new bot feature.

## 1. Dashboard Card (Main Grid)

Add this card to the `#dashboard-cards` grid in `views/dashboard/partials/content/dashboardCards.html`:

```html
<!-- [BOT_NAME] Bot Card -->
<div class="glass-card rounded-3xl shadow-2xl cursor-pointer" onclick="showSection('[bot-id]', event)">
    <div class="card-body p-6 md:p-8 text-center">
        <div class="flex flex-col items-center justify-center min-h-[180px] md:min-h-[200px]">
            <i class="fas fa-[icon-name] text-5xl md:text-6xl text-white/80 mb-3 md:mb-4"></i>
            <h3 class="text-xl md:text-2xl font-bold text-white mb-2">[BOT_NAME] Bot</h3>
            <p class="text-white/70 text-xs md:text-sm px-2">[Brief description of what this bot does]</p>
        </div>
    </div>
</div>
```

**Replace:**
- `[BOT_NAME]` - The display name of your bot (e.g., "Text-to-Speech", "Audio Commands")
- `[bot-id]` - A lowercase, hyphenated ID (e.g., "tts", "audio", "gif")
- `[icon-name]` - FontAwesome icon name (e.g., "volume-up", "music", "images")
- `[Brief description...]` - A short description of the bot's purpose

## 2. Bot Section (Configuration Page)

Add this section after the dashboard cards, before the modals:

```html
<!-- [BOT_NAME] Bot Section -->
<div id="[bot-id]-section" class="glass-card rounded-3xl shadow-2xl" style="display: none;">
    <div class="card-body p-8">
        <div class="flex items-center justify-between mb-6 responsive-header">
            <div>
                <h2 class="card-title text-2xl text-white mb-2">
                    <i class="fas fa-[icon-name] text-white/80"></i>
                    [BOT_NAME] Bot
                </h2>
                <p class="text-white/80">[Description of what users can do here]</p>
            </div>
            <button class="btn btn-primary text-white" onclick="showAdd[BotName]Modal()">
                <i class="fas fa-plus"></i>
                Add [Item]
            </button>
        </div>
        <div class="divider my-4" style="border-color: rgba(255,255,255,0.2);"></div>
        
        <!-- [BOT_NAME] List/Content -->
        <div id="[bot-id]-list" class="space-y-4">
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-[icon-name] text-6xl mb-4 animate-float"></i>
                <p>No [items] yet. Click "Add [Item]" to create one.</p>
            </div>
        </div>
    </div>
</div>
```

**Replace:**
- `[BOT_NAME]` - The display name
- `[bot-id]` - The lowercase, hyphenated ID
- `[icon-name]` - FontAwesome icon name
- `[Description...]` - What users can do in this section
- `[BotName]` - PascalCase version (e.g., "AudioCommand", "GifCommand")
- `[Item]` - What users are creating (e.g., "Command", "Trigger", "Effect")
- `[items]` - Plural form

## 3. Sidebar Navigation Item

Add this to the sidebar menu in `views/dashboard/partials/chrome/sidebar.html`:

```html
<li>
    <a href="#[bot-id]" class="text-white hover:bg-white/20 rounded-lg" onclick="showSection('[bot-id]', event)">
        <i class="fas fa-[icon-name]"></i>
        [BOT_NAME] Bot
    </a>
</li>
```

**Note:** For setup/configuration items (like OBS Setup), use a different color:
```html
<li>
    <a href="#[bot-id]" class="text-purple-300 hover:bg-purple-500/20 rounded-lg" onclick="showSection('[bot-id]', event)">
        <i class="fas fa-[icon-name]"></i>
        [BOT_NAME]
    </a>
</li>
```

## 4. JavaScript Functions Template

Create a new file `public/js/[botId].js` with this template:

```javascript
// [BOT_NAME] Bot Management
let [botId]Loaded = false;
let [botId]List = [];

// Load [items] from server
async function load[BotName]() {
    if ([botId]Loaded) return;
    
    const container = document.getElementById('[bot-id]-list');
    if (!container) return;
    
    try {
        const response = await fetch('/api/[bot-id]', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load [items]');
        }
        
        const data = await response.json();
        [botId]List = data.[items] || [];
        [botId]Loaded = true;
        render[BotName]();
    } catch (error) {
        console.error('Error loading [items]:', error);
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Error loading [items]. Please refresh the page.</p>
            </div>
        `;
    }
}

// Render [items] list
function render[BotName]() {
    const container = document.getElementById('[bot-id]-list');
    
    if (![botId]List || [botId]List.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-white/60">
                <i class="fas fa-[icon-name] text-6xl mb-4 animate-float"></i>
                <p>No [items] yet. Click "Add [Item]" to create one.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = [botId]List.map(item => `
        <div class="glass-card rounded-xl p-4" data-[bot-id]-id="${item.id}">
            <div class="flex items-center justify-between responsive-command-card">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2 flex-wrap">
                        <span class="font-bold text-white text-lg">${item.name || item.title || 'Unnamed'}</span>
                        <span class="badge ${item.is_active ? 'badge-success' : 'badge-error'}">
                            ${item.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="text-sm text-white/70">
                        <!-- Add item-specific details here -->
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
    `).join('');
}

// Show add modal
function showAdd[BotName]Modal() {
    // Reset form
    document.getElementById('[bot-id]-form').reset();
    // Open modal
    document.getElementById('[bot-id]-modal').showModal();
}

// Save [item]
async function save[BotName]() {
    // Get form data
    const formData = {
        // Add your form fields here
    };
    
    try {
        const response = await fetch('/api/[bot-id]', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save [item]');
        }
        
        // Close modal and reload
        document.getElementById('[bot-id]-modal').close();
        [botId]Loaded = false;
        await load[BotName]();
    } catch (error) {
        console.error('Error saving [item]:', error);
        alert(`Failed to save [item]: ${error.message}`);
    }
}

// Edit [item]
async function edit[BotName](id) {
    const item = [botId]List.find(i => i.id === id);
    if (!item) return;
    
    // Load item data into form
    // Open modal
    document.getElementById('[bot-id]-modal').showModal();
}

// Delete [item]
async function delete[BotName](id) {
    if (!confirm('Are you sure you want to delete this [item]?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/[bot-id]/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete [item]');
        }
        
        [botId]Loaded = false;
        await load[BotName]();
    } catch (error) {
        console.error('Error deleting [item]:', error);
        alert('Failed to delete [item]. Please try again.');
    }
}

// Ensure [items] are loaded when section is shown
function ensure[BotName]Loaded() {
    const section = document.getElementById('[bot-id]-section');
    if (section && section.style.display !== 'none') {
        load[BotName]();
    }
}

// Export functions
window.load[BotName] = load[BotName];
window.render[BotName] = render[BotName];
window.showAdd[BotName]Modal = showAdd[BotName]Modal;
window.save[BotName] = save[BotName];
window.edit[BotName] = edit[BotName];
window.delete[BotName] = delete[BotName];
window.ensure[BotName]Loaded = ensure[BotName]Loaded;
```

## 5. Update Navigation JavaScript

In `public/js/navigation.js`, add to the `showSection` function:

```javascript
case '[bot-id]':
    ensure[BotName]Loaded();
    break;
```

## 6. Add Script Tag

In `views/dashboard/partials/chrome/scripts.html`, add before the closing `</body>` tag:

```html
<script src="/js/[botId].js"></script>
```

## 7. Backend Routes Template

Create `routes/[botId].js`:

```javascript
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  create[BotName],
  get[BotName]s,
  get[BotName]ById,
  update[BotName],
  delete[BotName]
} from '../controllers/[botId]Controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', get[BotName]s);
router.get('/:id', get[BotName]ById);
router.post('/', create[BotName]);
router.put('/:id', update[BotName]);
router.delete('/:id', delete[BotName]);

export default router;
```

## 8. Backend Controller Template

Create `controllers/[botId]Controller.js`:

```javascript
import {
  create[BotName],
  get[BotName]sByUserId,
  get[BotName]ById,
  update[BotName],
  delete[BotName]
} from '../models/[botId].js';
import { getUserByTwitchId } from '../models/user.js';

export async function create[BotName](req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add your creation logic here
    const [item] = await create[BotName]({
      userId: user.id,
      twitchUserId,
      // Add your fields here
    });

    res.status(201).json({
      success: true,
      [item]: [item]
    });
  } catch (error) {
    console.error('Error creating [item]:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function get[BotName]s(req, res) {
  try {
    const twitchUserId = req.session.userId;
    
    if (!twitchUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserByTwitchId(twitchUserId);
    if (!user || !user.id) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [items] = await get[BotName]sByUserId(user.id);

    res.json({
      success: true,
      [items]
    });
  } catch (error) {
    console.error('Error getting [items]:', error);
    res.status(500).json({ error: error.message });
  }
}

// Add get[BotName]ById, update[BotName], delete[BotName] following the same pattern
```

## 9. Database Model Template

Create `models/[botId].js`:

```javascript
import pool from '../config/database.js';

export async function create[BotName](data) {
  const query = `
    INSERT INTO [table_name] (
      user_id, twitch_user_id, /* add your columns */
    )
    VALUES ($1, $2, /* add your values */)
    RETURNING *
  `;

  const values = [
    data.userId,
    data.twitchUserId,
    // Add your values
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

export async function get[BotName]sByUserId(userId) {
  const query = `
    SELECT *
    FROM [table_name]
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

// Add get[BotName]ById, update[BotName], delete[BotName] following the same pattern
```

## 10. Register Routes

In `server.js` or `routes/index.js`, add:

```javascript
import [botId]Routes from './routes/[botId].js';
app.use('/api/[bot-id]', [botId]Routes);
```

## Checklist

- [ ] Dashboard card added
- [ ] Bot section added
- [ ] Sidebar navigation item added
- [ ] JavaScript file created (`public/js/[botId].js`)
- [ ] Navigation.js updated
- [ ] Script tag added to `views/dashboard/partials/chrome/scripts.html`
- [ ] Backend routes created
- [ ] Backend controller created
- [ ] Database model created
- [ ] Database migration created (if new table needed)
- [ ] Routes registered in server.js

## Example: Adding a "Sound Effects Bot"

1. **Dashboard Card:**
```html
<!-- Sound Effects Bot Card -->
<div class="glass-card rounded-3xl shadow-2xl cursor-pointer" onclick="showSection('sound-effects', event)">
    <div class="card-body p-6 md:p-8 text-center">
        <div class="flex flex-col items-center justify-center min-h-[180px] md:min-h-[200px]">
            <i class="fas fa-sound text-5xl md:text-6xl text-white/80 mb-3 md:mb-4"></i>
            <h3 class="text-xl md:text-2xl font-bold text-white mb-2">Sound Effects Bot</h3>
            <p class="text-white/70 text-xs md:text-sm px-2">Trigger sound effects with chat commands</p>
        </div>
    </div>
</div>
```

2. **Section ID:** `sound-effects-section`
3. **JavaScript file:** `public/js/soundEffects.js`
4. **Backend route:** `/api/sound-effects`
5. **Controller:** `controllers/soundEffectsController.js`
6. **Model:** `models/soundEffect.js`

Follow this template and you'll have a consistent, maintainable bot structure!

-- Create gif_commands table for storing GIF commands
CREATE TABLE IF NOT EXISTS gif_commands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    command VARCHAR(100) NOT NULL,
    gif_url TEXT NOT NULL,
    gif_id VARCHAR(255), -- Giphy GIF ID for reference
    gif_title VARCHAR(255), -- Title/description from Giphy
    duration INTEGER DEFAULT 5000, -- Display duration in milliseconds
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(twitch_user_id, command) -- One command per user
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_gif_commands_user_id ON gif_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_gif_commands_twitch_user_id ON gif_commands(twitch_user_id);
CREATE INDEX IF NOT EXISTS idx_gif_commands_command ON gif_commands(command);
CREATE INDEX IF NOT EXISTS idx_gif_commands_active ON gif_commands(is_active) WHERE is_active = true;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_gif_commands_updated_at BEFORE UPDATE ON gif_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


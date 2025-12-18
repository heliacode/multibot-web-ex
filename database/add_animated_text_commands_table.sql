-- Create animated_text_commands table for storing animated text commands
CREATE TABLE IF NOT EXISTS animated_text_commands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    command VARCHAR(100) NOT NULL,
    text_content TEXT NOT NULL,
    animation_type VARCHAR(50) NOT NULL DEFAULT 'neon', -- 'neon', '3d', etc.
    position_x INTEGER DEFAULT 960, -- X position (default center of 1920px)
    position_y INTEGER DEFAULT 540, -- Y position (default center of 1080px)
    font_size INTEGER DEFAULT 48,
    duration INTEGER DEFAULT 5000, -- Display duration in milliseconds
    color1 VARCHAR(7) DEFAULT '#ff005e', -- Primary color (for neon)
    color2 VARCHAR(7) DEFAULT '#00d4ff', -- Secondary color (for neon)
    font_family VARCHAR(255) DEFAULT 'Arial', -- Font family (for 3d text)
    is_active BOOLEAN DEFAULT true,
    is_bits_only BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(twitch_user_id, command) -- One command per user
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_animated_text_commands_user_id ON animated_text_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_animated_text_commands_twitch_user_id ON animated_text_commands(twitch_user_id);
CREATE INDEX IF NOT EXISTS idx_animated_text_commands_command ON animated_text_commands(command);
CREATE INDEX IF NOT EXISTS idx_animated_text_commands_active ON animated_text_commands(is_active) WHERE is_active = true;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_animated_text_commands_updated_at BEFORE UPDATE ON animated_text_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

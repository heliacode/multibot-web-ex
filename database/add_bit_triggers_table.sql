-- Create bit_triggers table for mapping bit amounts to commands
CREATE TABLE IF NOT EXISTS bit_triggers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    bit_amount INTEGER NOT NULL CHECK (bit_amount > 0),
    command_type VARCHAR(20) NOT NULL CHECK (command_type IN ('audio', 'gif')),
    command_id INTEGER NOT NULL, -- References audio_commands.id or gif_commands.id
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(twitch_user_id, bit_amount)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_bit_triggers_user_id ON bit_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_bit_triggers_twitch_user_id ON bit_triggers(twitch_user_id);
CREATE INDEX IF NOT EXISTS idx_bit_triggers_bit_amount ON bit_triggers(bit_amount);
CREATE INDEX IF NOT EXISTS idx_bit_triggers_active ON bit_triggers(is_active) WHERE is_active = true;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bit_triggers_updated_at BEFORE UPDATE ON bit_triggers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


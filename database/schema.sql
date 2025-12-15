-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    twitch_user_id VARCHAR(255) UNIQUE NOT NULL,
    twitch_username VARCHAR(255) NOT NULL,
    twitch_display_name VARCHAR(255) NOT NULL,
    twitch_email VARCHAR(255),
    profile_image_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    scopes JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on twitch_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_twitch_user_id ON users(twitch_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audio_commands table
CREATE TABLE IF NOT EXISTS audio_commands (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    command VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER NOT NULL,
    volume DECIMAL(3,2) DEFAULT 0.5 CHECK (volume >= 0 AND volume <= 1),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(twitch_user_id, command)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_audio_commands_user_id ON audio_commands(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_commands_twitch_user_id ON audio_commands(twitch_user_id);
CREATE INDEX IF NOT EXISTS idx_audio_commands_command ON audio_commands(command);
CREATE INDEX IF NOT EXISTS idx_audio_commands_active ON audio_commands(is_active) WHERE is_active = true;

-- Create trigger to automatically update updated_at for audio_commands
CREATE TRIGGER update_audio_commands_updated_at BEFORE UPDATE ON audio_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create obs_tokens table for OBS browser source authentication
CREATE TABLE IF NOT EXISTS obs_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    UNIQUE(user_id) -- One token per user
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_obs_tokens_user_id ON obs_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_obs_tokens_token ON obs_tokens(token);
CREATE INDEX IF NOT EXISTS idx_obs_tokens_twitch_user_id ON obs_tokens(twitch_user_id);


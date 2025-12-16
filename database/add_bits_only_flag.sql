-- Add is_bits_only flag to audio_commands and gif_commands tables
-- Commands with this flag set to true are only triggered by bits, not by chat commands

-- Add to audio_commands
ALTER TABLE audio_commands 
ADD COLUMN IF NOT EXISTS is_bits_only BOOLEAN DEFAULT false;

-- Add to gif_commands
ALTER TABLE gif_commands 
ADD COLUMN IF NOT EXISTS is_bits_only BOOLEAN DEFAULT false;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_audio_commands_bits_only ON audio_commands(is_bits_only) WHERE is_bits_only = false;
CREATE INDEX IF NOT EXISTS idx_gif_commands_bits_only ON gif_commands(is_bits_only) WHERE is_bits_only = false;

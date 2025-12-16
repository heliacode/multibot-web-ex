-- Add support for dedicated bit triggers (not tied to commands)
-- These triggers show GIFs only when bits are donated, not via commands

-- Add new columns to bit_triggers table
ALTER TABLE bit_triggers 
ADD COLUMN IF NOT EXISTS is_dedicated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dedicated_gif_url TEXT,
ADD COLUMN IF NOT EXISTS dedicated_gif_position VARCHAR(50) DEFAULT 'center',
ADD COLUMN IF NOT EXISTS dedicated_gif_size VARCHAR(50) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS dedicated_gif_duration INTEGER DEFAULT 5000;

-- Make command_id nullable for dedicated triggers
ALTER TABLE bit_triggers 
ALTER COLUMN command_id DROP NOT NULL;

-- Make command_type nullable for dedicated triggers
ALTER TABLE bit_triggers 
ALTER COLUMN command_type DROP NOT NULL;

-- Add check constraint to ensure either command_id or dedicated_gif_url is set
ALTER TABLE bit_triggers 
ADD CONSTRAINT bit_trigger_has_content 
CHECK (
  (is_dedicated = true AND dedicated_gif_url IS NOT NULL) OR
  (is_dedicated = false AND command_id IS NOT NULL AND command_type IS NOT NULL)
);

-- Update the unique constraint to allow multiple dedicated triggers for same bit amount
-- (since they're not tied to commands, users might want different GIFs for same amount)
-- Actually, let's keep the unique constraint but allow it if is_dedicated is different
-- We'll handle this in application logic instead

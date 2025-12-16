-- Add position column to gif_commands table
ALTER TABLE gif_commands 
ADD COLUMN IF NOT EXISTS position VARCHAR(20) DEFAULT 'center' 
CHECK (position IN ('top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'));

-- Update existing records to have default position
UPDATE gif_commands SET position = 'center' WHERE position IS NULL;


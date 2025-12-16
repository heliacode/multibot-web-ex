-- Add size column to gif_commands table
ALTER TABLE gif_commands 
ADD COLUMN IF NOT EXISTS size VARCHAR(20) DEFAULT 'medium' 
CHECK (size IN ('small', 'medium', 'original'));

-- Update existing records to have default size
UPDATE gif_commands SET size = 'medium' WHERE size IS NULL;


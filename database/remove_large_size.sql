-- Remove 'large' size option from gif_commands
-- Update any existing records with 'large' to 'medium'
UPDATE gif_commands SET size = 'medium' WHERE size = 'large';

-- Update the CHECK constraint to remove 'large'
ALTER TABLE gif_commands 
DROP CONSTRAINT IF EXISTS gif_commands_size_check;

ALTER TABLE gif_commands 
ADD CONSTRAINT gif_commands_size_check 
CHECK (size IN ('small', 'medium', 'original'));

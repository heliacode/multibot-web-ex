-- Add transition settings to animated_text_commands
-- This enables fade/slide/pop transitions on the OBS browser source.

ALTER TABLE animated_text_commands
  ADD COLUMN IF NOT EXISTS transition_preset VARCHAR(50) DEFAULT 'fade',
  ADD COLUMN IF NOT EXISTS transition_in_ms INTEGER DEFAULT 250,
  ADD COLUMN IF NOT EXISTS transition_out_ms INTEGER DEFAULT 400,
  ADD COLUMN IF NOT EXISTS transition_distance INTEGER DEFAULT 40;

-- Make text_content nullable (code supports dynamic-from-chat by storing NULL)
ALTER TABLE animated_text_commands
  ALTER COLUMN text_content DROP NOT NULL;


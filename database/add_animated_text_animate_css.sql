-- Add animate.css customization fields to animated_text_commands
-- Allows per-command CSS animation classes for enter/exit.

ALTER TABLE animated_text_commands
  ADD COLUMN IF NOT EXISTS custom_animation_in VARCHAR(100),
  ADD COLUMN IF NOT EXISTS custom_animation_out VARCHAR(100);


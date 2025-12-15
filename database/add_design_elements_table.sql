-- Create design_elements table for storing canvas design elements
CREATE TABLE IF NOT EXISTS design_elements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(255) NOT NULL,
    design_data JSONB NOT NULL, -- Stores the entire design elements array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- One design per user
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_design_elements_user_id ON design_elements(user_id);
CREATE INDEX IF NOT EXISTS idx_design_elements_twitch_user_id ON design_elements(twitch_user_id);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_design_elements_updated_at BEFORE UPDATE ON design_elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


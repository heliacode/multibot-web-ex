-- Create cronjobs table for scheduled article creation
CREATE TABLE IF NOT EXISTS cronjobs (
    id SERIAL PRIMARY KEY,
    article_title VARCHAR(255) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    content_template TEXT,
    keywords VARCHAR(500),
    topic VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    next_run TIMESTAMP,
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on is_active for faster queries
CREATE INDEX IF NOT EXISTS idx_cronjobs_is_active ON cronjobs(is_active);

-- Create index on next_run for scheduling queries
CREATE INDEX IF NOT EXISTS idx_cronjobs_next_run ON cronjobs(next_run);

-- Add comment to table
COMMENT ON TABLE cronjobs IS 'Stores scheduled cronjobs for automated article creation';

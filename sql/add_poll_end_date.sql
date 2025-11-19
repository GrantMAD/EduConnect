-- SQL to add end_date column to polls table
-- Run this in your Supabase SQL Editor

ALTER TABLE polls 
ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;

-- Optional: Set a default end date for existing polls (30 days from creation)
UPDATE polls 
SET end_date = created_at + INTERVAL '30 days' 
WHERE end_date IS NULL;

-- Optional: Add a comment to the column
COMMENT ON COLUMN polls.end_date IS 'The date and time when the poll expires and stops accepting votes';

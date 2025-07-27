-- Add title and language columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_posts_language ON public.posts(language);

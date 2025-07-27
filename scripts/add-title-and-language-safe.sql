-- Safely add title and language columns if they don't exist
DO $$ 
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'title') THEN
        ALTER TABLE public.posts ADD COLUMN title TEXT;
    END IF;
    
    -- Add language column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'language') THEN
        ALTER TABLE public.posts ADD COLUMN language TEXT DEFAULT 'en';
    END IF;
END $$;

-- Create index for language filtering if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_posts_language ON public.posts(language);

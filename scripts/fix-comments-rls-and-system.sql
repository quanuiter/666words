-- Fix comments table and RLS policies

-- First, ensure the comments table has the correct structure
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS thread_identifier TEXT,
ADD COLUMN IF NOT EXISTS is_author_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymous_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_thread_identifier ON public.comments(thread_identifier);
CREATE INDEX IF NOT EXISTS idx_comments_is_author_reply ON public.comments(is_author_reply);
CREATE INDEX IF NOT EXISTS idx_comments_anonymous_id ON public.comments(anonymous_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create new policies
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anonymous users can insert comments with anonymous_id" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() IS NULL AND anonymous_id IS NOT NULL);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
    );

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT ON public.comments TO anon;

-- Final fix for comments RLS system

-- Ensure comments table structure is correct
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS thread_identifier TEXT,
ADD COLUMN IF NOT EXISTS is_author_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymous_id TEXT;

-- Drop all existing policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Everyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Everyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Anonymous users can insert comments with anonymous_id" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Create comprehensive policies
CREATE POLICY "Anyone can view comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert comments" ON public.comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their comments" ON public.comments
    FOR UPDATE USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
    );

CREATE POLICY "Users can delete their comments" ON public.comments
    FOR DELETE USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND anonymous_id IS NOT NULL)
    );

-- Grant all necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT ON public.comments TO anon;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_thread_identifier ON public.comments(thread_identifier);
CREATE INDEX IF NOT EXISTS idx_comments_is_author_reply ON public.comments(is_author_reply);
CREATE INDEX IF NOT EXISTS idx_comments_anonymous_id ON public.comments(anonymous_id);

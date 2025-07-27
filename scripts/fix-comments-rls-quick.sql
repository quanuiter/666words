-- Quick fix for comments RLS to allow anonymous commenting

-- Drop all existing policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Anonymous users can insert comments with anonymous_id" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create simple, permissive policies
CREATE POLICY "Everyone can view comments" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Everyone can insert comments" ON public.comments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Ensure proper permissions
GRANT ALL ON public.comments TO authenticated, anon;

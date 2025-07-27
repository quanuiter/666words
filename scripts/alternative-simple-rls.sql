-- Alternative: Ultra-simple RLS approach
-- If the above still causes issues, use this simpler approach

-- Disable RLS temporarily to test
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Grant full access for testing
GRANT ALL ON public.comments TO authenticated, anon;
GRANT ALL ON public.posts TO authenticated, anon;
GRANT ALL ON public.notifications TO authenticated, anon;

-- Note: This is for testing only. Re-enable RLS in production with proper policies.

-- Drop all policies
DROP POLICY IF EXISTS "Users can read own comments" ON public.comments;
DROP POLICY IF EXISTS "Post authors read all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can read replies to their comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

-- Drop the security definer functions if they exist
DROP FUNCTION IF EXISTS is_post_author(UUID);
DROP FUNCTION IF EXISTS is_comment_owner(UUID, TEXT);
DROP FUNCTION IF EXISTS is_reply_to_my_comment(UUID);

-- Re-enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create the most basic policies possible

-- 1. Anyone can insert
CREATE POLICY "insert_comments" ON public.comments
  FOR INSERT WITH CHECK (true);

-- 2. Anyone can read (we'll handle filtering in the application)
CREATE POLICY "read_comments" ON public.comments
  FOR SELECT USING (true);

-- 3. Users can update their own
CREATE POLICY "update_own_comments" ON public.comments
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- 4. Users can delete their own
CREATE POLICY "delete_own_comments" ON public.comments
  FOR DELETE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

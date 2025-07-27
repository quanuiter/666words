-- Redesign comment system for better thread management

-- Drop existing comment table and recreate with better structure
DROP TABLE IF EXISTS public.comments CASCADE;

CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    anonymous_id TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    thread_identifier TEXT NOT NULL,
    is_author_reply BOOLEAN DEFAULT FALSE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_thread_identifier ON public.comments(thread_identifier);
CREATE INDEX idx_comments_is_author_reply ON public.comments(is_author_reply);
CREATE INDEX idx_comments_anonymous_id ON public.comments(anonymous_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create simple policies
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

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT ON public.comments TO anon;

-- Recreate notification function for new structure
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    thread_user_id UUID;
BEGIN
    -- Get post author
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    
    IF NEW.is_author_reply = TRUE THEN
        -- This is an author reply - notify the thread owner (commenter)
        IF NEW.thread_identifier LIKE 'user_%' THEN
            -- Extract user ID from thread identifier: 'user_UUID_post_UUID'
            BEGIN
                thread_user_id := CAST(split_part(split_part(NEW.thread_identifier, 'user_', 2), '_post_', 1) AS UUID);
                
                -- Only notify if the thread owner is not the post author
                IF thread_user_id != post_author_id AND thread_user_id IS NOT NULL THEN
                    INSERT INTO public.notifications (user_id, post_id, comment_id, type, message)
                    VALUES (
                        thread_user_id,
                        NEW.post_id,
                        NEW.id,
                        'reply',
                        'The author replied to your comment'
                    );
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- If UUID parsing fails, skip notification
                NULL;
            END;
        END IF;
    ELSE
        -- This is a reader comment - notify the post author
        IF NEW.user_id != post_author_id AND post_author_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, post_id, comment_id, type, message)
            VALUES (
                post_author_id,
                NEW.post_id,
                NEW.id,
                'comment',
                'Someone commented on your post'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS comment_notification_trigger ON public.comments;
CREATE TRIGGER comment_notification_trigger
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

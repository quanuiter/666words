-- Fix My Posts view and reply system

-- Ensure posts table has proper RLS
DROP POLICY IF EXISTS "Users can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;

CREATE POLICY "Everyone can view all posts" ON public.posts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- Fix comments to support the thread system properly
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS thread_identifier TEXT,
ADD COLUMN IF NOT EXISTS is_author_reply BOOLEAN DEFAULT FALSE;

-- Update the comment notification function
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
            -- Extract user ID from thread identifier
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS comment_notification_trigger ON public.comments;
CREATE TRIGGER comment_notification_trigger
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

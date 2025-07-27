-- Fix comment system to properly support thread-based conversations

-- Ensure comments table has correct structure
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS thread_identifier TEXT,
ADD COLUMN IF NOT EXISTS is_author_reply BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymous_id TEXT;

-- Update existing comments to have thread identifiers if they don't
UPDATE public.comments 
SET thread_identifier = CASE 
    WHEN user_id IS NOT NULL THEN 'user_' || user_id || '_post_' || post_id
    WHEN anonymous_id IS NOT NULL THEN 'anon_' || anonymous_id || '_post_' || post_id
    ELSE 'legacy_' || id || '_post_' || post_id
END
WHERE thread_identifier IS NULL;

-- Make thread_identifier NOT NULL after updating
ALTER TABLE public.comments ALTER COLUMN thread_identifier SET NOT NULL;

-- Create function to generate anonymous ID if needed
CREATE OR REPLACE FUNCTION generate_anonymous_id() 
RETURNS TEXT AS $$
BEGIN
    RETURN 'anon_' || encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update notification function to handle both comment types
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

-- Recreate trigger
DROP TRIGGER IF EXISTS comment_notification_trigger ON public.comments;
CREATE TRIGGER comment_notification_trigger
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION create_comment_notification();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_thread_identifier ON public.comments(thread_identifier);
CREATE INDEX IF NOT EXISTS idx_comments_is_author_reply ON public.comments(is_author_reply);
CREATE INDEX IF NOT EXISTS idx_comments_anonymous_id ON public.comments(anonymous_id);

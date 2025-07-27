-- Fix author reply logic and notification system

-- Update the notification function to properly handle author replies
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    thread_user_id UUID;
    notification_message TEXT;
BEGIN
    -- Get post author
    SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    
    IF NEW.is_author_reply = TRUE THEN
        -- This is an author reply - notify the thread owner (reader)
        -- Extract reader info from thread_identifier
        IF NEW.thread_identifier LIKE 'user_%' THEN
            -- Extract user ID from thread identifier: 'user_UUID_post_UUID'
            DECLARE
                thread_user_id UUID;
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
                        'The post author replied to your comment'
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

-- Add constraint to ensure author replies are only made by post authors
CREATE OR REPLACE FUNCTION check_author_reply()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
BEGIN
    IF NEW.is_author_reply = TRUE THEN
        -- Get post author
        SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
        
        -- Ensure only the post author can make author replies
        IF NEW.user_id != post_author_id THEN
            RAISE EXCEPTION 'Only the post author can make author replies';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check author reply permissions
DROP TRIGGER IF EXISTS check_author_reply_trigger ON public.comments;
CREATE TRIGGER check_author_reply_trigger
    BEFORE INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION check_author_reply();

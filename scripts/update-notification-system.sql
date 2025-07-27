-- Update notification system to work with thread-based comments

-- Update the notification creation function to work with new comment system
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    post_author_id UUID;
    parent_comment_user_id UUID;
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

-- Create a view for user's commented posts
CREATE OR REPLACE VIEW user_commented_posts AS
SELECT DISTINCT 
    p.id,
    p.title,
    p.content,
    p.created_at,
    p.word_count,
    p.language,
    p.user_id as post_author_id,
    c.user_id as commenter_id,
    c.anonymous_id as commenter_anonymous_id,
    MAX(c.created_at) as last_comment_at,
    COUNT(c.id) as comment_count
FROM public.posts p
INNER JOIN public.comments c ON p.id = c.post_id
WHERE c.is_author_reply = FALSE  -- Only count reader comments
GROUP BY p.id, p.title, p.content, p.created_at, p.word_count, p.language, p.user_id, c.user_id, c.anonymous_id
ORDER BY last_comment_at DESC;

-- Grant permissions
GRANT SELECT ON user_commented_posts TO authenticated, anon;

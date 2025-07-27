-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'reply')),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add parent_id column to comments table for replies
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to create notification when comment is added
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if commenter is not the post author
  IF NEW.user_id != (SELECT user_id FROM public.posts WHERE id = NEW.post_id) THEN
    INSERT INTO public.notifications (user_id, post_id, comment_id, type, message)
    SELECT 
      posts.user_id,
      NEW.post_id,
      NEW.id,
      CASE WHEN NEW.parent_id IS NULL THEN 'comment' ELSE 'reply' END,
      CASE WHEN NEW.parent_id IS NULL 
        THEN 'Someone commented on your post' 
        ELSE 'Someone replied to a comment on your post' 
      END
    FROM public.posts 
    WHERE posts.id = NEW.post_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment notifications
DROP TRIGGER IF EXISTS comment_notification_trigger ON public.comments;
CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- Update comment limit function to handle replies
CREATE OR REPLACE FUNCTION check_comment_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check direct comments limit (3 per user per post)
  IF NEW.parent_id IS NULL THEN
    IF (
      SELECT COUNT(*) 
      FROM public.comments 
      WHERE post_id = NEW.post_id 
      AND user_id = NEW.user_id
      AND parent_id IS NULL
    ) >= 3 THEN
      RAISE EXCEPTION 'Comment limit exceeded. Maximum 3 comments per post per user.';
    END IF;
  ELSE
    -- Check reply limit (3 per user per comment thread)
    IF (
      SELECT COUNT(*) 
      FROM public.comments 
      WHERE post_id = NEW.post_id 
      AND user_id = NEW.user_id
      AND parent_id = NEW.parent_id
    ) >= 3 THEN
      RAISE EXCEPTION 'Reply limit exceeded. Maximum 3 replies per comment thread per user.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

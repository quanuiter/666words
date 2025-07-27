"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Send, Clock, Eye, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Post {
  id: string
  title?: string
  content: string
  created_at: string
  word_count: number
  language?: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  parent_id?: string
  replies?: Comment[]
}

interface PostCardProps {
  post: Post
  showComments?: boolean
}

export function PostCard({ post, showComments = true }: PostCardProps) {
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [comment, setComment] = useState("")
  const [commentCount, setCommentCount] = useState(0)
  const [userCommentCount, setUserCommentCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [userReplyCounts, setUserReplyCounts] = useState<Record<string, number>>({})
  const [user, setUser] = useState<any>(null)
  const [expanded, setExpanded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkUserAndFetchCounts()
  }, [post.id])

  const checkUserAndFetchCounts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user && showComments) {
        await fetchCommentCounts(user.id)
      } else if (showComments) {
        // For anonymous users, just get total count
        const { count: totalCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true })
          .eq("post_id", post.id)
        setCommentCount(totalCount || 0)
      }
    } catch (err) {
      console.error("Failed to check user:", err)
    }
  }

  const fetchCommentCounts = async (userId: string) => {
    try {
      // Get total comment count (including replies)
      const { count: totalCount, error: totalError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id)

      if (totalError) {
        console.error("Error fetching total comments:", totalError)
        return
      }

      // Get user's direct comment count for this post
      const { count: userCount, error: userError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id)
        .eq("user_id", userId)
        .is("parent_id", null)

      if (userError) {
        console.error("Error fetching user comments:", userError)
        return
      }

      // Get user's reply counts for each comment thread
      const { data: userReplies, error: repliesError } = await supabase
        .from("comments")
        .select("parent_id")
        .eq("post_id", post.id)
        .eq("user_id", userId)
        .not("parent_id", "is", null)

      if (!repliesError && userReplies) {
        const replyCounts: Record<string, number> = {}
        userReplies.forEach((reply) => {
          if (reply.parent_id) {
            replyCounts[reply.parent_id] = (replyCounts[reply.parent_id] || 0) + 1
          }
        })
        setUserReplyCounts(replyCounts)
      }

      setCommentCount(totalCount || 0)
      setUserCommentCount(userCount || 0)
    } catch (err) {
      console.error("Failed to fetch comment counts:", err)
    }
  }

  const handleSubmitComment = async () => {
    if (!comment.trim() || !user) return

    try {
      setLoading(true)

      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        content: comment.trim(),
        user_id: user.id,
        parent_id: null,
      })

      if (error) {
        console.error("Error submitting comment:", error)
        alert("Failed to submit comment. Please try again.")
        return
      }

      // Create notification for post author
      await createNotification(post.id, null, "comment", comment.trim())

      setComment("")
      setShowCommentForm(false)
      fetchCommentCounts(user.id)
    } catch (err) {
      console.error("Failed to submit comment:", err)
      alert("Failed to submit comment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const createNotification = async (
    postId: string,
    commentId: string | null,
    type: "comment" | "reply",
    content: string,
  ) => {
    try {
      // Get post author
      const { data: postData } = await supabase.from("posts").select("user_id").eq("id", postId).single()

      if (postData && postData.user_id !== user?.id) {
        const message =
          type === "comment" ? "Someone commented on your post" : "Someone replied to a comment on your post"

        await supabase.from("notifications").insert({
          user_id: postData.user_id,
          post_id: postId,
          comment_id: commentId,
          type,
          message,
          read: false,
        })
      }
    } catch (err) {
      console.error("Failed to create notification:", err)
    }
  }

  const getLanguageDisplay = (lang?: string) => {
    switch (lang) {
      case "vi":
        return { flag: "🇻🇳", name: "VI" }
      case "en":
        return { flag: "🇺🇸", name: "EN" }
      default:
        return { flag: "🌍", name: "??" }
    }
  }

  const canComment = user && showComments && userCommentCount < 3
  const languageInfo = getLanguageDisplay(post.language)

  // Get preview text for card view
  const previewText = post.content.length > 150 ? post.content.substring(0, 150) + "..." : post.content

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg group h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-red-400 transition-colors">
            {post.title || "Untitled"}
          </h3>
          {post.language && (
            <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs ml-2 flex-shrink-0">
              {languageInfo.flag} {languageInfo.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
            <Eye className="w-3 h-3 mr-1" />
            {post.word_count}
          </Badge>
          {showComments && (
            <Badge variant="outline" className="border-gray-600 text-gray-400">
              <MessageCircle className="w-3 h-3 mr-1" />
              {commentCount}
            </Badge>
          )}
          <div className="flex items-center gap-1 text-gray-500 ml-auto">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex-1">
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">{expanded ? post.content : previewText}</p>
          {post.content.length > 150 && (
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="link"
              className="text-red-400 hover:text-red-300 p-0 h-auto font-normal text-xs mt-2"
            >
              {expanded ? "Show less" : "Read more"}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>

      {showComments && (
        <CardFooter className="pt-0">
          {!user ? (
            <div className="w-full text-center py-3 bg-gray-700/30 rounded-lg">
              <p className="text-gray-400 text-xs mb-2">Sign in to comment</p>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={() => (window.location.href = "/login")}
              >
                Sign In
              </Button>
            </div>
          ) : !showCommentForm ? (
            <Button
              onClick={() => setShowCommentForm(true)}
              disabled={!canComment}
              variant="outline"
              size="sm"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {canComment ? `Comment (${3 - userCommentCount} left)` : "Comment limit reached"}
            </Button>
          ) : (
            <div className="w-full space-y-3">
              <Textarea
                placeholder="Share your thoughts anonymously..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitComment}
                  disabled={loading || !comment.trim()}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white text-xs"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
                <Button
                  onClick={() => {
                    setShowCommentForm(false)
                    setComment("")
                  }}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  )
}

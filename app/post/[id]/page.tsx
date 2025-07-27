"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { commentThreadService, type CommentThread } from "@/lib/comment-threads"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, MessageCircle, Send, Clock, Eye, User, Reply, AlertTriangle, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Post {
  id: string
  title?: string
  content: string
  created_at: string
  word_count: number
  language?: string
  user_id: string
}

export default function PostPage() {
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [threads, setThreads] = useState<CommentThread[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [commenting, setCommenting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const supabase = createClient()

  useEffect(() => {
    if (postId) {
      fetchPostAndComments()
    }
  }, [postId])

  const fetchPostAndComments = async () => {
    try {
      setLoading(true)
      setError("")

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      // Fetch post
      const { data: postData, error: postError } = await supabase.from("posts").select("*").eq("id", postId).single()

      if (postError) {
        setError("Post not found")
        return
      }

      setPost(postData)

      // Fetch comment threads
      const commentThreads = await commentThreadService.getThreadsForPost(postId, user?.id)
      setThreads(commentThreads)
    } catch (err) {
      console.error("Failed to fetch post and comments:", err)
      setError("Failed to load post")
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return

    try {
      setCommenting(true)
      setError("")

      const result = await commentThreadService.addComment(postId, newComment.trim(), user.id)

      if (result.success) {
        setNewComment("")
        setSuccess("Comment added successfully!")
        await fetchPostAndComments()
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError("Failed to add comment. Please try again.")
      }
    } catch (err) {
      console.error("Failed to add comment:", err)
      setError("An unexpected error occurred.")
    } finally {
      setCommenting(false)
    }
  }

  const handleAddReply = async (threadId: string) => {
    if (!replyContent.trim() || !user || !post) return

    try {
      setCommenting(true)
      setError("")

      // Check if user is the post author
      const isAuthor = user.id === post.user_id

      if (isAuthor) {
        // Add author reply
        const success = await commentThreadService.addAuthorReply(postId, threadId, replyContent.trim(), user.id)

        if (success) {
          setReplyContent("")
          setReplyingTo(null)
          setSuccess("Reply added successfully!")
          await fetchPostAndComments()
          setTimeout(() => setSuccess(""), 3000)
        } else {
          setError("Failed to add reply. Please try again.")
        }
      } else {
        setError("Only the post author can reply to comments.")
      }
    } catch (err) {
      console.error("Failed to add reply:", err)
      setError("An unexpected error occurred.")
    } finally {
      setCommenting(false)
    }
  }

  const getLanguageDisplay = (lang?: string) => {
    switch (lang) {
      case "vi":
        return { flag: "🇻🇳", name: "Vietnamese" }
      case "en":
        return { flag: "🇺🇸", name: "English" }
      default:
        return { flag: "🌍", name: "Unknown" }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading post...</div>
      </div>
    )
  }

  if (error && !post) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-white mb-4">{error}</p>
            <Link href="/">
              <Button className="bg-red-600 hover:bg-red-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!post) return null

  const languageInfo = getLanguageDisplay(post.language)
  const isAuthor = user?.id === post.user_id
  const userCommentCount = threads.reduce((count, thread) => count + thread.userReplyCount, 0)
  const canComment = user && userCommentCount < 3

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Posts
          </Button>
        </Link>

        {/* Post content */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <CardTitle className="text-2xl font-bold text-white flex-1 pr-4">{post.title || "Untitled"}</CardTitle>
              {post.language && (
                <Badge variant="outline" className="border-gray-600 text-gray-400 flex-shrink-0">
                  {languageInfo.flag} {languageInfo.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{post.word_count} words</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{threads.length} conversations</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
              {isAuthor && (
                <Badge className="bg-red-600 text-white">
                  <User className="w-3 h-3 mr-1" />
                  Your Post
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          </CardContent>
        </Card>

        {/* Error/Success messages */}
        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-900/20 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">{success}</AlertDescription>
          </Alert>
        )}

        {/* Comment form */}
        {user && canComment && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">Add a Comment</CardTitle>
              <p className="text-sm text-gray-400">You can add {3 - userCommentCount} more comments to this post</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                rows={4}
              />
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">{newComment.length}/500 characters</div>
                <Button
                  onClick={handleAddComment}
                  disabled={commenting || !newComment.trim() || newComment.length > 500}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {commenting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Add Comment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!user && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400 mb-4">Sign in to join the conversation</p>
              <Link href="/login">
                <Button className="bg-red-600 hover:bg-red-700 text-white">Sign In to Comment</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {user && !canComment && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6 text-center">
              <p className="text-gray-400">You've reached the comment limit for this post (3 comments maximum)</p>
            </CardContent>
          </Card>
        )}

        {/* Comment threads */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">Comments ({threads.length})</h2>

          {threads.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No comments yet. Be the first to share your thoughts!</p>
              </CardContent>
            </Card>
          ) : (
            threads.map((thread) => (
              <Card key={thread.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {thread.comments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg ${
                          comment.is_author_reply ? "bg-red-900/20 border-l-4 border-red-600 ml-6" : "bg-gray-700/50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {comment.is_author_reply ? (
                              <Badge className="bg-red-600 text-white text-xs">
                                <User className="w-3 h-3 mr-1" />
                                Author
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                                <MessageCircle className="w-3 h-3 mr-1" />
                                Reader
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply form for authors */}
                  {isAuthor && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      {replyingTo === thread.id ? (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Reply to this comment..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleAddReply(thread.id)}
                              disabled={commenting || !replyContent.trim()}
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {commenting ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Replying...
                                </>
                              ) : (
                                <>
                                  <Reply className="w-3 h-3 mr-2" />
                                  Reply
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyContent("")
                              }}
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setReplyingTo(thread.id)}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          Reply as Author
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

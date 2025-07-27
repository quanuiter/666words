"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, Clock, Eye, ArrowRight, RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface CommentedPost {
  id: string
  title?: string
  content: string
  created_at: string
  word_count: number
  language?: string
  comment_count: number
  last_comment_at: string
  user_comment_count: number
}

interface CommentedPostsViewProps {
  userId?: string
  anonymousId?: string
}

export function CommentedPostsView({ userId, anonymousId }: CommentedPostsViewProps) {
  const [posts, setPosts] = useState<CommentedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchCommentedPosts()
  }, [userId, anonymousId])

  const fetchCommentedPosts = async () => {
    try {
      if (!userId && !anonymousId) {
        setLoading(false)
        return
      }

      // Try to use the view first
      let query = supabase.from("user_commented_posts").select("*").order("last_comment_at", { ascending: false })

      if (userId) {
        query = query.eq("user_id", userId)
      } else if (anonymousId) {
        query = query.eq("anonymous_id", anonymousId)
      }

      const { data: viewData, error: viewError } = await query

      if (viewError || !viewData) {
        console.log("View query failed, using fallback:", viewError)
        // Fallback to direct query
        await fetchCommentedPostsFallback()
        return
      }

      setPosts(viewData)
    } catch (err) {
      console.error("Failed to fetch commented posts:", err)
      await fetchCommentedPostsFallback()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchCommentedPostsFallback = async () => {
    try {
      // Direct query as fallback
      let commentsQuery = supabase
        .from("comments")
        .select(`
          post_id,
          created_at,
          posts!inner(
            id,
            title,
            content,
            created_at,
            word_count,
            language
          )
        `)
        .order("created_at", { ascending: false })

      if (userId) {
        commentsQuery = commentsQuery.eq("user_id", userId)
      } else if (anonymousId) {
        commentsQuery = commentsQuery.eq("anonymous_id", anonymousId)
      }

      const { data: commentsData, error: commentsError } = await commentsQuery

      if (commentsError) {
        console.error("Fallback query failed:", commentsError)
        return
      }

      if (commentsData) {
        // Group by post and get stats
        const postMap = new Map()

        for (const comment of commentsData) {
          const post = comment.posts
          const postId = post.id

          if (!postMap.has(postId)) {
            postMap.set(postId, {
              ...post,
              comment_count: 0,
              user_comment_count: 0,
              last_comment_at: comment.created_at,
            })
          }

          const existingPost = postMap.get(postId)
          existingPost.user_comment_count += 1
          if (comment.created_at > existingPost.last_comment_at) {
            existingPost.last_comment_at = comment.created_at
          }
        }

        // Get total comment counts for each post
        for (const [postId, post] of postMap.entries()) {
          const { count } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", postId)

          post.comment_count = count || 0
        }

        const postsArray = Array.from(postMap.values()).sort(
          (a, b) => new Date(b.last_comment_at).getTime() - new Date(a.last_comment_at).getTime(),
        )

        setPosts(postsArray)
      }
    } catch (err) {
      console.error("Fallback query failed:", err)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCommentedPosts()
  }

  const getLanguageDisplay = (lang?: string) => {
    switch (lang) {
      case "vi":
        return "🇻🇳"
      case "en":
        return "🇺🇸"
      default:
        return "🌍"
    }
  }

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="animate-pulse">Loading your commented posts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Posts You've Commented On</h2>
          <p className="text-gray-400 text-sm">
            {posts.length} {posts.length === 1 ? "post" : "posts"} with your comments
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No commented posts yet</p>
          <p className="text-sm mb-6">Start engaging with the community by commenting on posts</p>
          <Link href="/read">
            <Button className="bg-red-600 hover:bg-red-700 text-white">Browse Posts</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`}>
              <Card className="bg-gray-800 border-gray-700 hover:border-red-600/50 transition-all duration-200 hover:shadow-lg cursor-pointer group h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors flex-1 pr-2">
                      {post.title || "Untitled"}
                    </h3>
                    {post.language && (
                      <span className="text-sm flex-shrink-0">{getLanguageDisplay(post.language)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                      <Eye className="w-3 h-3 mr-1" />
                      {post.word_count}
                    </Badge>
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                      <MessageCircle className="w-3 h-3 mr-1" />
                      {post.comment_count}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                    {post.content.length > 120 ? post.content.substring(0, 120) + "..." : post.content}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        Last comment {formatDistanceToNow(new Date(post.last_comment_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">Your comments: {post.user_comment_count}</span>
                    <div className="flex items-center text-xs text-red-400 group-hover:text-red-300">
                      Continue conversation
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

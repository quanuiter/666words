"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { SimplePostCard } from "./simple-post-card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, PenTool, AlertTriangle } from "lucide-react"

interface Post {
  id: string
  title?: string
  content: string
  created_at: string
  word_count: number
  language?: string
}

interface MyPostsViewProps {
  userId?: string
}

export function MyPostsView({ userId }: MyPostsViewProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      fetchMyPosts()
    }
  }, [userId])

  const fetchMyPosts = async () => {
    if (!userId) return

    try {
      setError("")
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.error("Error fetching posts:", fetchError)
        setError("Failed to load your posts. Please try again.")
        return
      }

      if (data) {
        setPosts(data)
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err)
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMyPosts()
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId)

      if (error) {
        console.error("Error deleting post:", error)
        alert("Failed to delete post. Please try again.")
        return
      }

      // Remove the post from the local state
      setPosts((prev) => prev.filter((post) => post.id !== postId))
    } catch (err) {
      console.error("Failed to delete post:", err)
      alert("An unexpected error occurred.")
    }
  }

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="animate-pulse">Loading your posts...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <Alert className="bg-red-900/20 border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            {error}
            <Button
              variant="link"
              className="text-red-400 hover:text-red-300 p-0 h-auto ml-2"
              onClick={() => {
                setError("")
                handleRefresh()
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">My Posts</h2>
          <p className="text-gray-400">Manage your published posts ({posts.length} total)</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <PenTool className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No posts yet</h2>
          <p className="mb-6">Start sharing your thoughts with the world!</p>
          <Button className="bg-red-600 hover:bg-red-700 text-white">Write Your First Post</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <SimplePostCard key={post.id} post={post} showActions={true} onDelete={handleDeletePost} />
          ))}
        </div>
      )}
    </div>
  )
}

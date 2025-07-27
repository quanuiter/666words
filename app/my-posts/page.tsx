"use client"

import { useState, useEffect } from "react"
import { createClient, checkDatabaseSetup, testConnection } from "@/lib/supabase"
import { MyPostsView } from "@/components/my-posts-view"
import { DatabaseSetupCheck } from "@/components/database-setup-check"
import { useRouter } from "next/navigation"

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
  post_id: string
}

interface PostWithComments extends Post {
  comments: Comment[]
}

export default function MyPostsPage() {
  const [posts, setPosts] = useState<PostWithComments[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set())
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuthAndDatabase()
  }, [])

  const checkAuthAndDatabase = async () => {
    try {
      setError(null)

      // First test connection
      console.log("Testing connection...")
      const connTest = await testConnection(1)

      if (!connTest.success) {
        setError(`Connection failed: ${connTest.error}`)
        setLoading(false)
        return
      }

      // Then check database setup
      console.log("Checking database setup...")
      const dbStatus = await checkDatabaseSetup()
      const isDbReady = dbStatus.postsTableExists && dbStatus.commentsTableExists
      setDatabaseReady(isDbReady)

      if (!isDbReady) {
        setLoading(false)
        return
      }

      // Check authentication
      console.log("Checking authentication...")
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setUser(user)
      await fetchUserPosts(user.id)
    } catch (err) {
      console.error("Setup check failed:", err)
      setError(err instanceof Error ? err.message : "Failed to initialize page")
      setLoading(false)
    }
  }

  const fetchUserPosts = async (userId: string, retryCount = 0) => {
    try {
      setError(null)

      console.log(`Fetching user posts (attempt ${retryCount + 1})...`)

      // Fetch user's posts with timeout
      const postsPromise = supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      const { data: postsData, error: postsError } = await Promise.race([
        postsPromise,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Posts query timeout")), 10000)),
      ])

      if (postsError) {
        console.error("Error fetching posts:", postsError)

        if (retryCount < 2) {
          console.log(`Retrying posts fetch... attempt ${retryCount + 1}`)
          setTimeout(() => fetchUserPosts(userId, retryCount + 1), 2000)
          return
        }

        setError(`Failed to load posts: ${postsError.message}`)
        setLoading(false)
        return
      }

      if (!postsData) {
        setPosts([])
        setLoading(false)
        return
      }

      // Fetch comments for each post with timeout
      console.log(`Fetching comments for ${postsData.length} posts...`)
      const postsWithComments = await Promise.all(
        postsData.map(async (post) => {
          try {
            const commentsPromise = supabase
              .from("comments")
              .select("*")
              .eq("post_id", post.id)
              .order("created_at", { ascending: false })

            const { data: comments, error: commentsError } = await Promise.race([
              commentsPromise,
              new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Comments query timeout")), 5000)),
            ])

            if (commentsError) {
              console.error("Error fetching comments for post:", post.id, commentsError)
            }

            return {
              ...post,
              title: post.title || "Untitled",
              language: post.language || "en",
              comments: comments || [],
            }
          } catch (err) {
            console.error("Failed to fetch comments for post:", post.id, err)
            return {
              ...post,
              title: post.title || "Untitled",
              language: post.language || "en",
              comments: [],
            }
          }
        }),
      )

      setPosts(postsWithComments)
    } catch (err) {
      console.error("Failed to fetch user posts:", err)

      if (retryCount < 2) {
        console.log(`Retrying posts fetch due to error... attempt ${retryCount + 1}`)
        setTimeout(() => fetchUserPosts(userId, retryCount + 1), 2000)
        return
      }

      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    setRetrying(true)
    setLoading(true)
    await checkAuthAndDatabase()
    setRetrying(false)
  }

  const deletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId)

      if (error) {
        console.error("Error deleting post:", error)
        alert("Failed to delete post. Please try again.")
        return
      }

      setPosts(posts.filter((post) => post.id !== postId))
    } catch (err) {
      console.error("Failed to delete post:", err)
      alert("Failed to delete post. Please try again.")
    }
  }

  // Check if we're in demo mode
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (databaseReady === false) {
    return <DatabaseSetupCheck onSetupComplete={() => setDatabaseReady(true)} />
  }

  if (loading || databaseReady === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-gray-400 mb-2">Loading your posts...</div>
          <div className="text-sm text-gray-500">This may take a few moments</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <MyPostsView posts={posts} loading={loading} error={error} handleRetry={handleRetry} deletePost={deletePost} />
      </div>
    </div>
  )
}

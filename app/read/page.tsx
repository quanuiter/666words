"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { SimplePostCard } from "@/components/simple-post-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw, Globe } from "lucide-react"
import Link from "next/link"
import { DatabaseSetupCheck } from "@/components/database-setup-check"
import { checkDatabaseSetup } from "@/lib/supabase"

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  word_count: number
  language: string
}

export default function ReadPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const [databaseReady, setDatabaseReady] = useState(false)

  useEffect(() => {
    const checkDatabaseAndFetch = async () => {
      try {
        console.log("Checking database setup...")
        const dbStatus = await checkDatabaseSetup()
        const isDbReady = dbStatus.postsTableExists && dbStatus.commentsTableExists
        setDatabaseReady(isDbReady)

        if (isDbReady) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          setUser(user)

          await fetchPosts()

          const subscription = supabase
            .channel("public-posts")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
              const newPost = payload.new as Post
              if (languageFilter === "all" || newPost.language === languageFilter) {
                setPosts((current) => [newPost, ...current])
              }
            })
            .subscribe()

          return () => {
            subscription.unsubscribe()
          }
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error("Setup failed:", err)
        setLoading(false)
      }
    }

    checkDatabaseAndFetch()
  }, [languageFilter])

  const fetchPosts = async () => {
    try {
      console.log("Fetching posts...")

      let query = supabase.from("posts").select("*").order("created_at", { ascending: false })

      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter)
      }

      const { data, error } = await Promise.race([
        query,
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Posts query timeout")), 15000)),
      ])

      if (error) {
        console.error("Error fetching posts:", error)
        setPosts([])
        return
      }

      if (data) {
        const processedPosts = data.map((post: any) => ({
          ...post,
          title: post.title || "Untitled",
          language: post.language || "en",
        }))
        setPosts(processedPosts)
      } else {
        setPosts([])
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err)
      setPosts([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPosts()
  }

  const handleLanguageFilter = (lang: string) => {
    setLanguageFilter(lang)
    setLoading(true)
  }

  if (!databaseReady) {
    return <DatabaseSetupCheck onSetupComplete={() => setDatabaseReady(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Simple Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white">
                <span className="text-red-500">666</span> Words
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Simple Language Filter */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                <Button
                  variant={languageFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleLanguageFilter("all")}
                  className={`text-xs px-3 py-1 ${
                    languageFilter === "all"
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  All
                </Button>
                <Button
                  variant={languageFilter === "en" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleLanguageFilter("en")}
                  className={`text-xs px-3 py-1 ${
                    languageFilter === "en"
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  🇺🇸 EN
                </Button>
                <Button
                  variant={languageFilter === "vi" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleLanguageFilter("vi")}
                  className={`text-xs px-3 py-1 ${
                    languageFilter === "vi"
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  🇻🇳 VI
                </Button>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center text-gray-400 py-12">
            <div className="animate-pulse">Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-4">
              {languageFilter === "all"
                ? "No posts yet."
                : `No posts in ${languageFilter === "en" ? "English" : "Vietnamese"} yet.`}
            </p>
            <p className="mb-6">Be the first to share your thoughts.</p>
            {!user && (
              <Link href="/login">
                <Button className="bg-red-600 hover:bg-red-700 text-white">Join Community</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Posts Count */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500">
                {posts.length} {posts.length === 1 ? "post" : "posts"}
                {languageFilter !== "all" && (
                  <span className="ml-2">in {languageFilter === "en" ? "English" : "Vietnamese"}</span>
                )}
              </p>
            </div>

            {/* Posts Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {posts.map((post) => (
                <SimplePostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      {!user && (
        <footer className="border-t border-gray-800 mt-16">
          <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-gray-400 mb-4">Want to share your thoughts or comment?</p>
            <Link href="/login">
              <Button className="bg-red-600 hover:bg-red-700 text-white">Join 666 Words</Button>
            </Link>
          </div>
        </footer>
      )}
    </div>
  )
}

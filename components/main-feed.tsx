"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { PostCard } from "./post-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Globe, Filter } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Post {
  id: string
  title?: string
  content: string
  created_at: string
  word_count: number
  language?: string
}

export function MainFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
  }, [languageFilter])

  const fetchPosts = async () => {
    try {
      let query = supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(20)

      if (languageFilter !== "all") {
        query = query.eq("language", languageFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching posts:", error)
        return
      }

      if (data) {
        setPosts(data)
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchPosts()
  }

  const getLanguageDisplay = (lang: string) => {
    switch (lang) {
      case "vi":
        return { flag: "🇻🇳", name: "Vietnamese" }
      case "en":
        return { flag: "🇺🇸", name: "English" }
      case "all":
        return { flag: "🌍", name: "All Languages" }
      default:
        return { flag: "🌍", name: "Unknown" }
    }
  }

  const currentLanguage = getLanguageDisplay(languageFilter)

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="animate-pulse">Loading posts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Latest Posts</h2>
          <Badge variant="outline" className="border-gray-600 text-gray-400">
            {posts.length} posts
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
              >
                <Filter className="w-4 h-4 mr-2" />
                {currentLanguage.flag} {currentLanguage.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-800 border-gray-700">
              <DropdownMenuItem onClick={() => setLanguageFilter("all")} className="text-gray-300 hover:bg-gray-700">
                🌍 All Languages
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguageFilter("en")} className="text-gray-300 hover:bg-gray-700">
                🇺🇸 English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguageFilter("vi")} className="text-gray-300 hover:bg-gray-700">
                🇻🇳 Vietnamese
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No posts found</h3>
          <p>
            {languageFilter === "all"
              ? "Be the first to share your thoughts!"
              : `No posts in ${currentLanguage.name} yet.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showComments={true} />
          ))}
        </div>
      )}
    </div>
  )
}

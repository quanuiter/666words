"use client"

import { useState, useEffect } from "react"
import { createClient, checkDatabaseSetup } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { CreatePost } from "@/components/create-post"
import { MyPostsView } from "@/components/my-posts-view"
import { CommentedPostsView } from "@/components/commented-posts-view"
import { DatabaseSetupCheck } from "@/components/database-setup-check"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"
import { PenTool, LogOut, Eye, FileText, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [databaseReady, setDatabaseReady] = useState(false)
  const [currentView, setCurrentView] = useState<"create" | "posts" | "commented">("create")
  const [anonymousId, setAnonymousId] = useState<string>("")
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Generate or get anonymous ID for session
    let anonId = localStorage.getItem("anonymous_id")
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("anonymous_id", anonId)
    }
    setAnonymousId(anonId)

    checkDatabaseAndAuth()
  }, [])

  const checkDatabaseAndAuth = async () => {
    try {
      // First check if database is set up
      const dbStatus = await checkDatabaseSetup()
      const isDbReady = dbStatus.postsTableExists && dbStatus.commentsTableExists
      setDatabaseReady(isDbReady)

      if (isDbReady) {
        // Then check auth
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
        setError(null)
      }
    } catch (err) {
      setError("Failed to connect to database. Please check your Supabase configuration.")
      console.error("Supabase connection error:", err)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setCurrentView("create")
  }

  useEffect(() => {
    if (databaseReady && user) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [databaseReady, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!databaseReady) {
    return <DatabaseSetupCheck onSetupComplete={() => setDatabaseReady(true)} />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-red-900 via-gray-900 to-black"></div>
          <div
            className="absolute top-0 left-0 w-full h-full opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight">
                <span className="text-red-500">666</span> Words
              </h1>
              <div className="w-24 h-1 bg-red-600 mx-auto mb-6"></div>
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Where thoughts find their voice in the shadows of anonymity
              </p>
            </div>

            <div className="max-w-4xl mx-auto mb-12">
              <p className="text-gray-400 text-lg mb-8">
                Share your deepest thoughts, darkest secrets, and brightest ideas without judgment. No likes, no shares,
                no followers—just pure, unfiltered expression in 666 words or less.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/login">
                <Button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg font-semibold">
                  Enter the Void
                </Button>
              </Link>
              <Link href="/read">
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent px-8 py-3 text-lg"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Read Anonymous Souls
                </Button>
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PenTool className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Anonymous Writing</h3>
              <p className="text-gray-400">
                Share your thoughts completely anonymously. Only you can see comments on your posts.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">666 Word Limit</h3>
              <p className="text-gray-400">Express yourself concisely. Every word counts in this sacred space.</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Private Comments</h3>
              <p className="text-gray-400">
                Anyone can comment, but only you see comments on your posts. Complete privacy.
              </p>
            </div>
          </div>

          {/* Rules Section */}
          <div className="bg-gray-800/30 backdrop-blur border border-gray-700 rounded-lg p-8 mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">The Sacred Rules</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <p className="text-gray-300">Maximum 666 words per post - choose them wisely</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <p className="text-gray-300">Complete anonymity - no profiles, no usernames, no traces</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <p className="text-gray-300">Anyone can comment - maximum 3 comments per post</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">4</span>
                  </div>
                  <p className="text-gray-300">You can reply to any comment once</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">5</span>
                  </div>
                  <p className="text-gray-300">Only post authors see all comments on their posts</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">6</span>
                  </div>
                  <p className="text-gray-300">Commenters see their own comments and replies to them</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to bare your soul?</h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join thousands of anonymous voices sharing their truth in the digital darkness.
            </p>
            <Link href="/login">
              <Button className="bg-red-600 hover:bg-red-700 text-white px-12 py-4 text-xl font-semibold">
                Begin Your Journey
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Single Navigation Bar */}
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <h1 className="text-xl font-bold text-white">
                <span className="text-red-500">666</span> Words
              </h1>
            </Link>

            <div className="flex items-center gap-3">
              <Button
                variant={currentView === "create" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("create")}
                className={
                  currentView === "create" ? "bg-red-600 hover:bg-red-700 text-white" : "text-gray-300 hover:text-white"
                }
              >
                <PenTool className="w-4 h-4 mr-2" />
                Write
              </Button>

              <Button
                variant={currentView === "posts" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("posts")}
                className={
                  currentView === "posts" ? "bg-red-600 hover:bg-red-700 text-white" : "text-gray-300 hover:text-white"
                }
              >
                <FileText className="w-4 h-4 mr-2" />
                My Posts
              </Button>

              <Button
                variant={currentView === "commented" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("commented")}
                className={
                  currentView === "commented"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "text-gray-300 hover:text-white"
                }
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Commented
              </Button>

              <div className="w-px h-6 bg-gray-700"></div>

              <Link href="/read">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                  <Eye className="w-4 h-4 mr-2" />
                  Browse
                </Button>
              </Link>

              <NotificationBell userId={user?.id} />

              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-300 hover:text-red-400">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {currentView === "create" && <CreatePost onPostCreated={() => setCurrentView("posts")} />}
        {currentView === "posts" && <MyPostsView userId={user?.id} />}
        {currentView === "commented" && (
          <CommentedPostsView userId={user?.id} anonymousId={user ? undefined : anonymousId} />
        )}
      </main>
    </div>
  )
}
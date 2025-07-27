"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreatePost } from "./create-post"
import { MainFeed } from "./main-feed"
import { MyPostsView } from "./my-posts-view"
import { CommentedPostsView } from "./commented-posts-view"
import { NotificationBell } from "./notification-bell"
import { PenTool, BookOpen, MessageCircle, LogOut, UserIcon } from "lucide-react"

interface DashboardUser {
  id: string
  email: string
}

export function Dashboard() {
  const [user, setUser] = useState<DashboardUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("read")
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <p className="text-white mb-4">Please sign in to continue</p>
            <Button onClick={() => (window.location.href = "/login")} className="bg-red-600 hover:bg-red-700">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">666 Words</h1>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                <UserIcon className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell userId={user.id} />
              <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
            <TabsTrigger value="read" className="data-[state=active]:bg-red-600">
              <BookOpen className="w-4 h-4 mr-2" />
              Read
            </TabsTrigger>
            <TabsTrigger value="write" className="data-[state=active]:bg-red-600">
              <PenTool className="w-4 h-4 mr-2" />
              Write
            </TabsTrigger>
            <TabsTrigger value="my-posts" className="data-[state=active]:bg-red-600">
              <UserIcon className="w-4 h-4 mr-2" />
              My Posts
            </TabsTrigger>
            <TabsTrigger value="commented" className="data-[state=active]:bg-red-600">
              <MessageCircle className="w-4 h-4 mr-2" />
              Commented
            </TabsTrigger>
          </TabsList>

          <TabsContent value="read" className="space-y-6">
            <MainFeed />
          </TabsContent>

          <TabsContent value="write" className="space-y-6">
            <CreatePost />
          </TabsContent>

          <TabsContent value="my-posts" className="space-y-6">
            <MyPostsView userId={user.id} />
          </TabsContent>

          <TabsContent value="commented" className="space-y-6">
            <CommentedPostsView userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

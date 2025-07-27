"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, X, Check, Reply, Eye } from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  user_id: string
  post_id: string
  comment_id: string
  type: "comment" | "reply"
  message: string
  read: boolean
  created_at: string
  post_title?: string
  post_content?: string
  comment_content?: string
}

interface NotificationPanelProps {
  userId: string
  onClose: () => void
  onMarkAsRead: () => void
}

export function NotificationPanel({ userId, onClose, onMarkAsRead }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          posts!notifications_post_id_fkey(title, content),
          comments!notifications_comment_id_fkey(content)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("Error fetching notifications:", error)
        return
      }

      if (data) {
        const formattedNotifications = data.map((notif: any) => ({
          ...notif,
          post_title: notif.posts?.title || "Untitled",
          post_content: notif.posts?.content,
          comment_content: notif.comments?.content,
        }))
        setNotifications(formattedNotifications)
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      if (!error) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === notificationId ? { ...notif, read: true } : notif)),
        )
        onMarkAsRead()
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false)

      if (!error) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
        onMarkAsRead()
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err)
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 z-50">
      <Card className="bg-gray-800 border-gray-700 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-lg">Notifications</CardTitle>
            <div className="flex items-center gap-2">
              {notifications.some((n) => !n.read) && (
                <Button onClick={markAllAsRead} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-4">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll be notified when someone interacts with your posts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.read
                      ? "bg-gray-700/30 border-gray-700"
                      : "bg-red-900/20 border-red-800 hover:bg-red-900/30"
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {notification.type === "comment" ? (
                        <MessageCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <Reply className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium text-white">
                        {notification.type === "comment" ? "New Comment" : "New Reply"}
                      </span>
                      {!notification.read && <Badge className="bg-red-600 text-white text-xs">New</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 mb-2">{notification.message}</p>

                  {notification.post_title && (
                    <div className="bg-gray-700/50 rounded p-2 mb-2">
                      <p className="text-xs text-gray-400 mb-1">Your post:</p>
                      <p className="text-xs text-gray-300 font-medium line-clamp-1">{notification.post_title}</p>
                      {notification.post_content && (
                        <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                          {notification.post_content.length > 100
                            ? notification.post_content.substring(0, 100) + "..."
                            : notification.post_content}
                        </p>
                      )}
                    </div>
                  )}

                  {notification.comment_content && (
                    <div className="bg-gray-700/50 rounded p-2 mb-2">
                      <p className="text-xs text-gray-400 mb-1">
                        {notification.type === "comment" ? "Comment:" : "Reply:"}
                      </p>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {notification.comment_content.length > 100
                          ? notification.comment_content.substring(0, 100) + "..."
                          : notification.comment_content}
                      </p>
                    </div>
                  )}

                  <Link href={`/post/${notification.post_id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-gray-600 text-gray-300 hover:bg-gray-700 text-xs bg-transparent"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Post
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

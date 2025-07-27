"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { NotificationPanel } from "./notification-panel"

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchUnreadCount()

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false)

      if (!error) {
        setUnreadCount(count || 0)
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = () => {
    setUnreadCount(0)
  }

  return (
    <div className="relative">
      <Button
        onClick={() => setShowPanel(!showPanel)}
        variant="ghost"
        size="sm"
        className="relative text-gray-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-600 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center p-0">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {showPanel && (
        <NotificationPanel userId={userId} onClose={() => setShowPanel(false)} onMarkAsRead={handleMarkAsRead} />
      )}
    </div>
  )
}

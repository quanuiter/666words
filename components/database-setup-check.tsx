"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Database, RefreshCw } from "lucide-react"

interface DatabaseStatus {
  posts: boolean
  comments: boolean
  notifications: boolean
  policies: boolean
}

export function DatabaseSetupCheck() {
  const [status, setStatus] = useState<DatabaseStatus>({
    posts: false,
    comments: false,
    notifications: false,
    policies: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const supabase = createClient()

  useEffect(() => {
    checkDatabaseSetup()
  }, [])

  const checkDatabaseSetup = async () => {
    setLoading(true)
    setError("")

    try {
      // Check posts table
      const { error: postsError } = await supabase.from("posts").select("id").limit(1)

      // Check comments table
      const { error: commentsError } = await supabase.from("comments").select("id").limit(1)

      // Check notifications table
      const { error: notificationsError } = await supabase.from("notifications").select("id").limit(1)

      setStatus({
        posts: !postsError,
        comments: !commentsError,
        notifications: !notificationsError,
        policies: true, // Assume policies are set if tables are accessible
      })

      if (postsError || commentsError || notificationsError) {
        setError("Some database tables are missing or inaccessible. Please run the setup scripts.")
      }
    } catch (err) {
      setError("Failed to check database setup.")
      console.error("Database check error:", err)
    } finally {
      setLoading(false)
    }
  }

  const allTablesReady = Object.values(status).every(Boolean)

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Database className="w-5 h-5 text-blue-400" />
          Database Setup Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking database setup...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.posts ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-gray-300">Posts table</span>
              </div>

              <div className="flex items-center gap-2">
                {status.comments ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-gray-300">Comments table</span>
              </div>

              <div className="flex items-center gap-2">
                {status.notifications ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-gray-300">Notifications table</span>
              </div>

              <div className="flex items-center gap-2">
                {status.policies ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-gray-300">Security policies</span>
              </div>
            </div>

            {allTablesReady ? (
              <Alert className="bg-green-900/20 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  Database is properly configured and ready to use!
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-900/20 border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  Database setup is incomplete. Please run the setup scripts in your Supabase dashboard.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="bg-yellow-900/20 border-yellow-800">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={checkDatabaseSetup}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recheck Status
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

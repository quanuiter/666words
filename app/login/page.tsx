"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Eye } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DatabaseSetupCheck } from "@/components/database-setup-check"
import { checkDatabaseSetup } from "@/lib/supabase"
import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [checkingAuth, setCheckingAuth] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const [databaseReady, setDatabaseReady] = useState(false)

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      // First check if database is set up
      const dbStatus = await checkDatabaseSetup()
      const isDbReady = dbStatus.postsTableExists && dbStatus.commentsTableExists
      setDatabaseReady(isDbReady)

      if (isDbReady) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          router.push("/")
        }
      }
      setCheckingAuth(false)
    }

    checkUser()
  }, [router])

  // Check if we're in demo mode
  const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Checking authentication...</div>
      </div>
    )
  }

  if (!databaseReady) {
    return <DatabaseSetupCheck onSetupComplete={() => setDatabaseReady(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {isDemoMode && (
        <div className="bg-yellow-900/20 border-b border-yellow-800 px-4 py-2">
          <div className="container mx-auto">
            <p className="text-yellow-200 text-sm text-center">
              🚀 <strong>Demo Mode:</strong> This is a preview with mock data.
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-100 ml-1"
              >
                Set up Supabase
              </a>{" "}
              for full functionality.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">Sign In to 666 Words</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/read">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Eye className="w-4 h-4 mr-2" />
                  Browse Posts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <AuthForm />
        </div>
      </main>
    </div>
  )
}

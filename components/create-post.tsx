"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PenTool, Send, AlertCircle, CheckCircle, Type, Globe } from "lucide-react"

export function CreatePost() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [language, setLanguage] = useState("en")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const supabase = createClient()

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const isValidLength = wordCount > 0 && wordCount <= 666
  const remainingWords = 666 - wordCount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidLength) {
      setError(`Your post must be between 1 and 666 words. Current: ${wordCount} words.`)
      return
    }

    if (!title.trim()) {
      setError("Please add a title to your post.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to create a post.")
        return
      }

      const { error: insertError } = await supabase.from("posts").insert({
        title: title.trim(),
        content: content.trim(),
        word_count: wordCount,
        language,
        user_id: user.id,
      })

      if (insertError) {
        setError("Failed to create post. Please try again.")
        console.error("Insert error:", insertError)
        return
      }

      setSuccess("Post created successfully!")
      setTitle("")
      setContent("")
      setLanguage("en")
    } catch (err) {
      setError("An unexpected error occurred.")
      console.error("Create post error:", err)
    } finally {
      setLoading(false)
    }
  }

  const getLanguageDisplay = (lang: string) => {
    switch (lang) {
      case "vi":
        return { flag: "🇻🇳", name: "Vietnamese" }
      case "en":
        return { flag: "🇺🇸", name: "English" }
      default:
        return { flag: "🌍", name: "Unknown" }
    }
  }

  const selectedLanguage = getLanguageDisplay(language)

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <PenTool className="w-5 h-5 text-red-400" />
          Write Your 666 Words
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-gray-300 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Title
            </Label>
            <Input
              id="title"
              placeholder="Give your post a compelling title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              maxLength={100}
            />
            <div className="text-xs text-gray-500">{title.length}/100 characters</div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Language
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="en" className="text-gray-300 hover:bg-gray-700">
                  🇺🇸 English
                </SelectItem>
                <SelectItem value="vi" className="text-gray-300 hover:bg-gray-700">
                  🇻🇳 Vietnamese
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content Textarea */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-gray-300">
              Content
            </Label>
            <Textarea
              id="content"
              placeholder={`Write exactly 666 words in ${selectedLanguage.name}...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[300px] resize-none"
            />

            {/* Word Count Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isValidLength ? "default" : remainingWords > 0 ? "secondary" : "destructive"}
                  className={
                    isValidLength
                      ? "bg-green-600 text-white"
                      : remainingWords > 0
                        ? "bg-gray-600 text-gray-300"
                        : "bg-red-600 text-white"
                  }
                >
                  {wordCount} / 666 words
                </Badge>
                {isValidLength && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
              <div className="text-sm text-gray-400">
                {remainingWords > 0 ? (
                  <span>{remainingWords} words remaining</span>
                ) : remainingWords < 0 ? (
                  <span className="text-red-400">{Math.abs(remainingWords)} words over limit</span>
                ) : (
                  <span className="text-green-400">Perfect length!</span>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !isValidLength || !title.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publish Post
              </>
            )}
          </Button>
        </form>

        {/* Error/Success Messages */}
        {error && (
          <Alert className="bg-red-900/20 border-red-800">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-900/20 border-green-800">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-300">{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Clock, MessageCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Post {
  id: string
  title?: string
  content: string
  created_at: string
  word_count: number
  language?: string
}

interface PublicPostCardProps {
  post: Post
}

export function PublicPostCard({ post }: PublicPostCardProps) {
  const getLanguageDisplay = (lang?: string) => {
    switch (lang) {
      case "vi":
        return { flag: "🇻🇳", name: "VI" }
      case "en":
        return { flag: "🇺🇸", name: "EN" }
      default:
        return { flag: "🌍", name: "??" }
    }
  }

  const languageInfo = getLanguageDisplay(post.language)
  const previewText = post.content.length > 200 ? post.content.substring(0, 200) + "..." : post.content

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 hover:shadow-lg group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-red-400 transition-colors flex-1 pr-2">
            {post.title || "Untitled"}
          </h3>
          {post.language && (
            <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs flex-shrink-0">
              {languageInfo.flag} {languageInfo.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="bg-gray-700 text-gray-300">
            <Eye className="w-3 h-3 mr-1" />
            {post.word_count}
          </Badge>
          <div className="flex items-center gap-1 text-gray-500 ml-auto">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="prose prose-invert max-w-none mb-4">
          <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">{previewText}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Anonymous post</div>
          <Link href={`/post/${post.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Read & Comment
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

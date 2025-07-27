"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Clock, Eye } from "lucide-react"
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

interface SimplePostCardProps {
  post: Post
}

export function SimplePostCard({ post }: SimplePostCardProps) {
  const getLanguageDisplay = (lang?: string) => {
    switch (lang) {
      case "vi":
        return "🇻🇳"
      case "en":
        return "🇺🇸"
      default:
        return "🌍"
    }
  }

  // Simple preview - just first 100 characters
  const previewText = post.content.length > 100 ? post.content.substring(0, 100) + "..." : post.content

  return (
    <Link href={`/post/${post.id}`}>
      <Card className="bg-gray-800 border-gray-700 hover:border-red-600/50 transition-all duration-200 hover:shadow-lg cursor-pointer group h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors flex-1 pr-2">
              {post.title || "Untitled"}
            </h3>
            {post.language && <span className="text-sm flex-shrink-0">{getLanguageDisplay(post.language)}</span>}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{post.word_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{previewText}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

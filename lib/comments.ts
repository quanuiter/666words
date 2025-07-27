import { createClient } from "./supabase"

export interface Comment {
  id: string
  post_id: string
  user_id?: string
  anonymous_id?: string
  content: string
  created_at: string
  thread_identifier?: string
  is_author_reply: boolean
  parent_id?: string
}

export interface CommentThread {
  id: string
  comments: Comment[]
  userCanReply: boolean
  userReplyCount: number
}

export class CommentService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  async getCommentsForPost(postId: string, userId?: string): Promise<CommentThread[]> {
    try {
      // Get all comments for the post
      const { data: comments, error } = await this.supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching comments:", error)
        return []
      }

      if (!comments) return []

      // Group comments by thread
      const threads = new Map<string, Comment[]>()

      comments.forEach((comment) => {
        const threadId = comment.thread_identifier || `comment_${comment.id}`
        if (!threads.has(threadId)) {
          threads.set(threadId, [])
        }
        threads.get(threadId)!.push(comment)
      })

      // Convert to CommentThread objects
      const result: CommentThread[] = []

      for (const [threadId, threadComments] of threads) {
        const userComments = userId ? threadComments.filter((c) => c.user_id === userId && !c.is_author_reply) : []

        result.push({
          id: threadId,
          comments: threadComments,
          userCanReply: userId ? userComments.length < 3 : false,
          userReplyCount: userComments.length,
        })
      }

      return result.sort(
        (a, b) => new Date(a.comments[0].created_at).getTime() - new Date(b.comments[0].created_at).getTime(),
      )
    } catch (error) {
      console.error("Failed to fetch comments:", error)
      return []
    }
  }

  async addComment(postId: string, content: string, userId?: string, anonymousId?: string): Promise<boolean> {
    try {
      const threadIdentifier = userId ? `user_${userId}_post_${postId}` : `anon_${anonymousId}_post_${postId}`

      const { error } = await this.supabase.from("comments").insert({
        post_id: postId,
        content: content.trim(),
        user_id: userId || null,
        anonymous_id: anonymousId || null,
        thread_identifier: threadIdentifier,
        is_author_reply: false,
      })

      if (error) {
        console.error("Error adding comment:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Failed to add comment:", error)
      return false
    }
  }

  async addAuthorReply(postId: string, threadIdentifier: string, content: string, authorId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("comments").insert({
        post_id: postId,
        content: content.trim(),
        user_id: authorId,
        thread_identifier: threadIdentifier,
        is_author_reply: true,
      })

      if (error) {
        console.error("Error adding author reply:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Failed to add author reply:", error)
      return false
    }
  }

  async getUserCommentCount(postId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
        .eq("user_id", userId)
        .eq("is_author_reply", false)

      if (error) {
        console.error("Error getting user comment count:", error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error("Failed to get user comment count:", error)
      return 0
    }
  }

  async getTotalCommentCount(postId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)

      if (error) {
        console.error("Error getting total comment count:", error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error("Failed to get total comment count:", error)
      return 0
    }
  }
}

export const commentService = new CommentService()

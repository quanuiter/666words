import { createClient } from "./supabase"

export interface Comment {
  id: string
  post_id: string
  user_id?: string
  anonymous_id?: string
  content: string
  created_at: string
  thread_identifier: string
  is_author_reply: boolean
}

export interface CommentThread {
  id: string
  threadIdentifier: string
  comments: Comment[]
  userCanReply: boolean
  userReplyCount: number
  lastActivity: string
}

export class CommentThreadService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  async getThreadsForPost(postId: string, userId?: string): Promise<CommentThread[]> {
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

      if (!comments || comments.length === 0) return []

      // Group comments by thread identifier
      const threadMap = new Map<string, Comment[]>()

      comments.forEach((comment) => {
        const threadId = comment.thread_identifier
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, [])
        }
        threadMap.get(threadId)!.push(comment)
      })

      // Convert to CommentThread objects
      const threads: CommentThread[] = []

      for (const [threadId, threadComments] of threadMap) {
        // Count user's non-author-reply comments in this thread
        const userComments = userId ? threadComments.filter((c) => c.user_id === userId && !c.is_author_reply) : []

        // Get last activity time
        const lastActivity = threadComments[threadComments.length - 1].created_at

        threads.push({
          id: threadId,
          threadIdentifier: threadId,
          comments: threadComments,
          userCanReply: userId ? userComments.length < 3 : false,
          userReplyCount: userComments.length,
          lastActivity,
        })
      }

      // Sort threads by first comment time (oldest first)
      return threads.sort(
        (a, b) => new Date(a.comments[0].created_at).getTime() - new Date(b.comments[0].created_at).getTime(),
      )
    } catch (error) {
      console.error("Failed to fetch comment threads:", error)
      return []
    }
  }

  async addComment(
    postId: string,
    content: string,
    userId?: string,
    anonymousId?: string,
  ): Promise<{ success: boolean; threadId?: string }> {
    try {
      // Generate thread identifier
      const threadIdentifier = userId
        ? `user_${userId}_post_${postId}`
        : `anon_${anonymousId || this.generateAnonymousId()}_post_${postId}`

      const { data, error } = await this.supabase
        .from("comments")
        .insert({
          post_id: postId,
          content: content.trim(),
          user_id: userId || null,
          anonymous_id: anonymousId || null,
          thread_identifier: threadIdentifier,
          is_author_reply: false,
        })
        .select()
        .single()

      if (error) {
        console.error("Error adding comment:", error)
        return { success: false }
      }

      return { success: true, threadId: threadIdentifier }
    } catch (error) {
      console.error("Failed to add comment:", error)
      return { success: false }
    }
  }

  async addAuthorReply(postId: string, threadIdentifier: string, content: string, authorId: string): Promise<boolean> {
    try {
      // Verify the user is the post author
      const { data: post, error: postError } = await this.supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single()

      if (postError || !post || post.user_id !== authorId) {
        console.error("User is not the post author")
        return false
      }

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

  private generateAnonymousId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }
}

export const commentThreadService = new CommentThreadService()

import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// Helper function to create a promise with timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

// Helper function to check if tables exist with improved error handling
export async function checkDatabaseSetup() {
  try {
    const supabase = createClient()

    console.log("Checking database setup...")

    // Try to query posts table with longer timeout (10 seconds)
    console.log("Checking posts table...")
    const postsCheck = await withTimeout(supabase.from("posts").select("id").limit(1).maybeSingle(), 10000)

    // Try to query comments table with longer timeout (10 seconds)
    console.log("Checking comments table...")
    const commentsCheck = await withTimeout(supabase.from("comments").select("id").limit(1).maybeSingle(), 10000)

    const postsTableExists = !postsCheck.error
    const commentsTableExists = !commentsCheck.error

    console.log("Database setup check results:", {
      postsTableExists,
      commentsTableExists,
      postsError: postsCheck.error?.message,
      commentsError: commentsCheck.error?.message,
    })

    return {
      postsTableExists,
      commentsTableExists,
      errors: {
        posts: postsCheck.error?.message,
        comments: commentsCheck.error?.message,
      },
    }
  } catch (error) {
    console.error("Database setup check failed:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return {
      postsTableExists: false,
      commentsTableExists: false,
      errors: {
        connection: errorMessage,
        details: errorMessage.includes("timeout")
          ? "Database connection timed out. This might be due to network issues or Supabase being slow to respond."
          : "Failed to connect to database. Please verify your Supabase URL and API key.",
      },
    }
  }
}

// Helper function to test connection with retry logic
export async function testConnection(maxRetries = 2) {
  let lastError: any = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Connection test attempt ${attempt + 1}/${maxRetries + 1}`)

      const supabase = createClient()

      // Try a simple query with longer timeout (8 seconds)
      const result = await withTimeout(supabase.from("posts").select("count").limit(1), 8000)

      console.log("Connection test successful")
      return {
        success: true,
        error: null,
        attempt: attempt + 1,
      }
    } catch (error) {
      lastError = error
      console.error(`Connection test attempt ${attempt + 1} failed:`, error)

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 3000)
        console.log(`Waiting ${delay}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : "Connection failed",
    attempt: maxRetries + 1,
  }
}

// Helper function to check schema with fallback
export async function checkSchemaColumns() {
  try {
    const supabase = createClient()

    console.log("Checking database schema...")

    // Try to query new columns with timeout
    const schemaCheck = await withTimeout(supabase.from("posts").select("title, language").limit(1), 4000)

    const hasNewColumns = !schemaCheck.error || !schemaCheck.error.message.includes("column")

    console.log("Schema check result:", {
      hasNewColumns,
      error: schemaCheck.error?.message,
    })

    return {
      hasNewColumns,
      error: schemaCheck.error?.message,
    }
  } catch (error) {
    console.error("Schema check failed:", error)
    return {
      hasNewColumns: false,
      error: error instanceof Error ? error.message : "Schema check failed",
    }
  }
}

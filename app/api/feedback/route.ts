import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { mem0Service } from "@/lib/mem0-service"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipeId, feedback, reason } = await request.json()

    if (!recipeId || !feedback) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await mem0Service.addUserFeedback(userId, recipeId, feedback, reason)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving feedback:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }
}

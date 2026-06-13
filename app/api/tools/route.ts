import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ToolService, type ToolCall } from "@/lib/tool-service"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tool, parameters = {}, description = "" } = await request.json()

    if (!tool) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 })
    }

    const toolCall: ToolCall = {
      tool,
      parameters,
      description,
    }

    const result = await ToolService.executeTool(userId, toolCall)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in tools API:", error)
    return NextResponse.json({ error: "Failed to execute tool" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const availableTools = ToolService.getAvailableTools()

    return NextResponse.json({
      tools: availableTools,
      message: "Available tools for database access",
    })
  } catch (error) {
    console.error("Error fetching available tools:", error)
    return NextResponse.json({ error: "Failed to fetch available tools" }, { status: 500 })
  }
}

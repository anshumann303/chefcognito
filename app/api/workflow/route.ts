import type { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { workflowService } from "@/lib/workflow-service"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { message, sessionId, ingredients } = await request.json()

  if (!message) {
    return new Response("No message provided", { status: 400 })
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (step: string, progress: number) => {
        const data = JSON.stringify({ step, progress })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      // Execute workflow with progress updates
      workflowService
        .executeWorkflow(userId, sessionId, message, ingredients, sendEvent)
        .then((response) => {
          // Send final response
          const finalData = JSON.stringify({
            step: "Complete",
            progress: 100,
            response,
            done: true,
          })
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`))
          controller.close()
        })
        .catch((error) => {
          console.error("Workflow error:", error)
          const errorData = JSON.stringify({
            step: "Error",
            progress: 100,
            error: error.message,
            done: true,
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}

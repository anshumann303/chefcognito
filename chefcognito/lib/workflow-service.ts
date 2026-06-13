import { ChatOpenAI } from "@langchain/openai"
import { StateGraph, END, START } from "@langchain/langgraph"
import { type BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import { mem0Service } from "./mem0-service"
import { chatService } from "./chat-service"

interface WorkflowState {
  messages: BaseMessage[]
  userId: string
  sessionId: string
  currentStep: string
  progress: number
  ingredients?: any[]
  preferences?: any
  recipes?: any[]
  context?: any[]
  needsOlderContext?: boolean
  error?: string
}

export class RecipeWorkflowService {
  private llm: ChatOpenAI
  private workflow: StateGraph<WorkflowState>

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
      streaming: true,
    })

    this.workflow = this.createWorkflow()
  }

  private createWorkflow(): StateGraph<WorkflowState> {
    const workflow = new StateGraph<WorkflowState>({
      channels: {
        messages: [],
        userId: "",
        sessionId: "",
        currentStep: "",
        progress: 0,
        ingredients: [],
        preferences: null,
        recipes: [],
        context: [],
        needsOlderContext: false,
        error: null,
      },
    })

    // Define workflow nodes
    workflow.addNode("loadPreferences", this.loadPreferences.bind(this))
    workflow.addNode("loadContext", this.loadContext.bind(this))
    workflow.addNode("checkContextNeed", this.checkContextNeed.bind(this))
    workflow.addNode("loadOlderContext", this.loadOlderContext.bind(this))
    workflow.addNode("generateResponse", this.generateResponse.bind(this))
    workflow.addNode("saveResponse", this.saveResponse.bind(this))

    // Define workflow edges
    workflow.addEdge(START, "loadPreferences")
    workflow.addEdge("loadPreferences", "loadContext")
    workflow.addEdge("loadContext", "checkContextNeed")
    workflow.addConditionalEdges("checkContextNeed", this.shouldLoadOlderContext.bind(this), {
      loadOlder: "loadOlderContext",
      generate: "generateResponse",
    })
    workflow.addEdge("loadOlderContext", "generateResponse")
    workflow.addEdge("generateResponse", "saveResponse")
    workflow.addEdge("saveResponse", END)

    return workflow.compile()
  }

  async executeWorkflow(
    userId: string,
    sessionId: string,
    message: string,
    ingredients?: any[],
    onProgress?: (step: string, progress: number) => void,
  ): Promise<string> {
    const initialState: WorkflowState = {
      messages: [new HumanMessage(message)],
      userId,
      sessionId,
      currentStep: "Starting workflow",
      progress: 0,
      ingredients,
    }

    try {
      const result = await this.workflow.invoke(initialState, {
        callbacks: [
          {
            handleLLMStart: () => {
              onProgress?.("Generating AI response...", 80)
            },
            handleLLMEnd: () => {
              onProgress?.("Finalizing response...", 95)
            },
          },
        ],
      })

      return result.messages[result.messages.length - 1]?.content || "I apologize, but I couldn't generate a response."
    } catch (error) {
      console.error("Workflow execution error:", error)
      throw error
    }
  }

  private async loadPreferences(
    state: WorkflowState,
    onProgress?: (step: string, progress: number) => void,
  ): Promise<WorkflowState> {
    onProgress?.("Loading user preferences...", 10)

    try {
      const preferences = await mem0Service.getUserPreferences(state.userId)
      return {
        ...state,
        preferences,
        currentStep: "Preferences loaded",
        progress: 20,
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
      return {
        ...state,
        currentStep: "Preferences load failed",
        progress: 20,
      }
    }
  }

  private async loadContext(
    state: WorkflowState,
    onProgress?: (step: string, progress: number) => void,
  ): Promise<WorkflowState> {
    onProgress?.("Loading recent conversation...", 30)

    try {
      const context = await chatService.getRecentMessages(state.userId, state.sessionId, 2)
      return {
        ...state,
        context,
        currentStep: "Context loaded",
        progress: 40,
      }
    } catch (error) {
      console.error("Error loading context:", error)
      return {
        ...state,
        currentStep: "Context load failed",
        progress: 40,
      }
    }
  }

  private async checkContextNeed(
    state: WorkflowState,
    onProgress?: (step: string, progress: number) => void,
  ): Promise<WorkflowState> {
    onProgress?.("Analyzing context requirements...", 50)

    const userMessage = state.messages[0]?.content || ""
    const needsOlderContext =
      userMessage.toLowerCase().includes("yesterday") ||
      userMessage.toLowerCase().includes("earlier") ||
      userMessage.toLowerCase().includes("before") ||
      userMessage.toLowerCase().includes("previous")

    return {
      ...state,
      needsOlderContext,
      currentStep: "Context analysis complete",
      progress: 60,
    }
  }

  private shouldLoadOlderContext(state: WorkflowState): string {
    return state.needsOlderContext ? "loadOlder" : "generate"
  }

  private async loadOlderContext(
    state: WorkflowState,
    onProgress?: (step: string, progress: number) => void,
  ): Promise<WorkflowState> {
    onProgress?.("Fetching older conversation history...", 65)

    try {
      const cutoffDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      const olderContext = await chatService.getOlderMessages(state.userId, state.sessionId, cutoffDate, 20)

      const extendedContext = [...olderContext, ...(state.context || [])]

      return {
        ...state,
        context: extendedContext,
        currentStep: "Extended context loaded",
        progress: 70,
      }
    } catch (error) {
      console.error("Error loading older context:", error)
      return {
        ...state,
        currentStep: "Older context load failed",
        progress: 70,
      }
    }
  }

  private async generateResponse(
    state: WorkflowState,
    onProgress?: (step: string, progress: number) => void,
  ): Promise<WorkflowState> {
    onProgress?.("Generating personalized response...", 80)

    try {
      const systemPrompt = this.buildSystemPrompt(state)
      const contextMessages = this.buildContextMessages(state)

      const response = await this.llm.invoke([new HumanMessage(systemPrompt), ...contextMessages, ...state.messages])

      return {
        ...state,
        messages: [...state.messages, new AIMessage(response.content)],
        currentStep: "Response generated",
        progress: 90,
      }
    } catch (error) {
      console.error("Error generating response:", error)
      return {
        ...state,
        error: "Failed to generate response",
        currentStep: "Response generation failed",
        progress: 90,
      }
    }
  }

  private async saveResponse(
    state: WorkflowState,
    onProgress?: (step: string, progress: number) => void,
  ): Promise<WorkflowState> {
    onProgress?.("Saving conversation...", 95)

    try {
      const aiMessage = state.messages[state.messages.length - 1]
      if (aiMessage && aiMessage.content) {
        await chatService.saveMessage({
          userId: state.userId,
          sessionId: state.sessionId,
          role: "assistant",
          content: aiMessage.content.toString(),
          timestamp: new Date(),
          messageType: "general",
        })
      }

      return {
        ...state,
        currentStep: "Complete",
        progress: 100,
      }
    } catch (error) {
      console.error("Error saving response:", error)
      return {
        ...state,
        currentStep: "Save failed",
        progress: 100,
      }
    }
  }

  private buildSystemPrompt(state: WorkflowState): string {
    const preferences = state.preferences
    const hasIngredients = state.ingredients && state.ingredients.length > 0

    let prompt = `You are an expert AI cooking assistant. You help users with recipe suggestions, cooking advice, and culinary questions.

Current context:
- User ID: ${state.userId}
- Time: ${new Date().toLocaleTimeString()}
- Has ingredients detected: ${hasIngredients}
`

    if (preferences) {
      prompt += `
User preferences:
- Cooking skill: ${preferences.cookingSkillLevel || "not specified"}
- Dietary restrictions: ${preferences.dietaryRestrictions?.join(", ") || "none"}
- Allergies: ${preferences.allergies?.join(", ") || "none"}
- Liked ingredients: ${preferences.likedIngredients?.join(", ") || "none specified"}
- Disliked ingredients: ${preferences.dislikedIngredients?.join(", ") || "none specified"}
- Preferred cuisines: ${preferences.preferredCuisines?.join(", ") || "no preference"}
- Available equipment: ${preferences.availableEquipment?.join(", ") || "basic kitchen"}
- Max cooking time: ${preferences.maxCookingTime || 60} minutes
- Spice level: ${preferences.spiceLevel || "medium"}
`
    }

    if (hasIngredients) {
      prompt += `
Available ingredients:
${state.ingredients?.map((ing) => `- ${ing.name} (${ing.quantity})`).join("\n")}
`
    }

    prompt += `
Guidelines:
1. Always consider user preferences when making suggestions
2. Avoid ingredients the user is allergic to or dislikes
3. Suggest recipes appropriate for their skill level
4. Respect dietary restrictions
5. Use available equipment when possible
6. Keep cooking times within their preferred range
7. Be conversational and helpful
8. Ask clarifying questions when needed

Respond naturally and helpfully to the user's request.`

    return prompt
  }

  private buildContextMessages(state: WorkflowState): BaseMessage[] {
    if (!state.context || state.context.length === 0) {
      return []
    }

    return state.context.map((msg) => {
      return msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    })
  }
}

export const workflowService = new RecipeWorkflowService()

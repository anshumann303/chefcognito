import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chatService, type ChatMessage } from "@/lib/chat-service";
import { RecipeService } from "@/lib/recipe-service";
import { ToolService } from "@/lib/tool-service";
import { v4 as uuidv4 } from "uuid";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const {
			message,
			sessionId = uuidv4(),
			requestType = "general",
			currentRecipes = null,
			currentIngredients = null,
		} = await request.json();

		if (!message) {
			return NextResponse.json(
				{ error: "No message provided" },
				{ status: 400 }
			);
		}

		// Create or update session
		await chatService.createOrUpdateSession(userId, sessionId);

		// Check if we need to summarize the session
		const shouldSummarize = await chatService.shouldSummarizeSession(
			userId,
			sessionId
		);
		if (shouldSummarize) {
			const recentMessages = await chatService.getRecentMessages(
				userId,
				sessionId,
				24
			);
			const summary = await chatService.summarizeContext(recentMessages);
			await chatService.saveContextSummary(userId, sessionId, summary);
		}

		// Save user message
		const userMessage: Omit<ChatMessage, "_id"> = {
			userId,
			sessionId,
			role: "user",
			content: message,
			timestamp: new Date(),
			messageType: requestType,
			metadata: {
				ingredients: currentIngredients,
				recipes: currentRecipes,
			},
		};

		await chatService.saveMessage(userMessage);

		// Get recent context (last 2 hours)
		const recentMessages = await chatService.getRecentMessages(
			userId,
			sessionId,
			2
		);

		// Get session summary if available
		const sessionSummary = await chatService.getSessionSummary(
			userId,
			sessionId
		);

		// Get user's recent recipes for context
		const userRecipes = await RecipeService.getUserRecipes(userId, 5);

		// Determine if this is a recipe request or query
		const isRecipeRequest =
			requestType === "recipe_request" ||
			message.toLowerCase().includes("recipe");
		const isRecipeQuery =
			requestType === "recipe_query" ||
			recentMessages.some((m) => m.messageType === "recipe_request") ||
			message.toLowerCase().includes("recipe") ||
			(currentRecipes && currentRecipes.length > 0);

		// Build context for AI
		const contextMessages = recentMessages
			.filter((m) => m.role !== "system")
			.slice(-10) // Only last 10 messages to avoid token limits
			.map((m) => ({
				role: m.role,
				content: m.content,
			}));

		// Enhanced system prompt with comprehensive tool calling capabilities
		const systemPrompt = `
You are an AI cooking assistant for a recipe generation app. You help users with recipe-related questions and cooking advice.

Current context:
- User ID: ${userId}
- Session ID: ${sessionId}
- Time: ${new Date().toLocaleTimeString()}
- Request type: ${
			isRecipeRequest
				? "New recipe request"
				: isRecipeQuery
				? "Recipe query"
				: "General cooking question"
		}

${sessionSummary ? `Previous conversation summary: ${sessionSummary}` : ""}

${
	currentRecipes
		? `Current recipes on screen: ${JSON.stringify(
				currentRecipes.slice(0, 2)
		  )}`
		: ""
}

${
	currentIngredients
		? `Current ingredients detected: ${JSON.stringify(currentIngredients)}`
		: ""
}

${
	userRecipes.length > 0
		? `User's recent recipes: ${userRecipes
				.slice(0, 3)
				.map((r) => r.name)
				.join(", ")}`
		: ""
}

COMPREHENSIVE TOOL CALLING SYSTEM:
You have access to powerful database tools. When you need information not available in the current context, use tool calling:

Available Tools:
- get_chat_history: Access older conversation history
- get_user_recipes: Get user's saved recipes with filtering
- search_recipes: Search recipes by name/ingredients
- get_recipe_details: Get detailed recipe information
- get_user_preferences: Access dietary restrictions and preferences
- get_recent_ingredients: Get recently used ingredients
- get_cooking_history: Get cooking session history
- search_conversations: Search through conversation history

Tool Call Format:
{"type": "tool_call", "tool": "tool_name", "parameters": {"param1": "value1"}, "message": "Explanation of why you need this data"}

Examples:
- User asks about "yesterday's recipe": {"type": "tool_call", "tool": "get_cooking_history", "parameters": {"daysBack": 2}, "message": "Let me check your recent cooking history"}
- User asks about pasta recipes: {"type": "tool_call", "tool": "search_recipes", "parameters": {"query": "pasta"}, "message": "Let me search your pasta recipes"}
- User mentions dietary restrictions: {"type": "tool_call", "tool": "get_user_preferences", "parameters": {}, "message": "Let me check your dietary preferences"}

Guidelines:
1. NEW RECIPE REQUEST: {"type": "recipe_request", "message": "your response"}
2. RECIPE QUERY (about current/previous recipes): {"type": "recipe_query", "message": "your response"}
3. GENERAL COOKING: {"type": "general", "message": "your response"}
4. NEED MORE DATA: Use tool calling as shown above

5. Always be conversational and helpful
6. Reference current context when available
7. Use tools proactively when user mentions past recipes, preferences, or history
8. Ask clarifying questions when needed

Recent chat history (last 2 hours):
${contextMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}

Current user message: ${message}

Respond with JSON only.
`;

		// Call Gemini API
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
		const result = await model.generateContent(systemPrompt);
		const response = await result.response;
		const text = response.text();

		// Parse AI response
		let aiResponse;
		try {
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				aiResponse = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error("No JSON found in response");
			}
		} catch (parseError) {
			console.error("Error parsing AI response:", parseError);
			aiResponse = {
				type: "general",
				message:
					"I'm here to help with your cooking questions! What would you like to know?",
			};
		}

		// Enhanced tool calling with comprehensive database access
		if (aiResponse.type === "tool_call") {
			const toolResponse = await ToolService.executeTool(userId, {
				tool: aiResponse.tool,
				parameters: aiResponse.parameters || {},
				description: aiResponse.message || "",
			});

			// Re-run with tool response
			const enhancedPrompt =
				systemPrompt +
				`\n\nTool Response (${aiResponse.tool}):\nSuccess: ${
					toolResponse.success
				}\nData: ${JSON.stringify(toolResponse.data)}\nMessage: ${
					toolResponse.message
				}\n\nNow respond to the user's message with this additional context.`;

			const enhancedResult = await model.generateContent(enhancedPrompt);
			const enhancedResponse = await enhancedResult.response;
			const enhancedText = enhancedResponse.text();

			try {
				const enhancedJsonMatch = enhancedText.match(/\{[\s\S]*\}/);
				if (enhancedJsonMatch) {
					aiResponse = JSON.parse(enhancedJsonMatch[0]);
				}
			} catch (error) {
				console.error("Error parsing enhanced response:", error);
				aiResponse = {
					type: "general",
					message: toolResponse.success
						? "Based on the information I found, I can help you with your cooking questions. What would you like to know?"
						: "I had trouble accessing that information, but I'm still here to help with your cooking questions!",
				};
			}
		}

		// Save AI response
		const assistantMessage: Omit<ChatMessage, "_id"> = {
			userId,
			sessionId,
			role: "assistant",
			content: aiResponse.message,
			timestamp: new Date(),
			messageType: aiResponse.type,
			metadata: {
				contextRequested: aiResponse.type === "tool_call",
				recipes: currentRecipes,
				ingredients: currentIngredients,
			},
		};

		await chatService.saveMessage(assistantMessage);

		return NextResponse.json({
			message: aiResponse.message,
			type: aiResponse.type,
			sessionId,
		});
	} catch (error) {
		console.error("Error in chat API:", error);
		return NextResponse.json(
			{ error: "Failed to process chat message" },
			{ status: 500 }
		);
	}
}

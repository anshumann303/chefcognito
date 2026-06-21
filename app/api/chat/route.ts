import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { chatService, type ChatMessage } from "@/lib/chat-service";
import { RecipeService } from "@/lib/recipe-service";
import { ToolService } from "@/lib/tool-service";
import { v4 as uuidv4 } from "uuid";

function getGenAI() {
	const key = process.env.GEMINI_API_KEY;
	if (!key || key === "placeholder") throw new Error("GEMINI_API_KEY not configured");
	return new GoogleGenAI({ apiKey: key });
}

async function generateText(ai: GoogleGenAI, prompt: string): Promise<string> {
	const result = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: [{ role: "user", parts: [{ text: prompt }] }],
	});
	return result.text ?? "";
}

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const {
			message,
			sessionId = uuidv4(),
			requestType = "general",
			currentRecipes = null,
			currentIngredients = null,
		} = await request.json();

		if (!message) return NextResponse.json({ error: "No message provided" }, { status: 400 });

		await chatService.createOrUpdateSession(userId, sessionId);

		const shouldSummarize = await chatService.shouldSummarizeSession(userId, sessionId);
		if (shouldSummarize) {
			const recentMessages = await chatService.getRecentMessages(userId, sessionId, 24);
			const summary = await chatService.summarizeContext(recentMessages);
			await chatService.saveContextSummary(userId, sessionId, summary);
		}

		const userMessage: Omit<ChatMessage, "_id"> = {
			userId, sessionId, role: "user", content: message,
			timestamp: new Date(), messageType: requestType,
			metadata: { ingredients: currentIngredients, recipes: currentRecipes },
		};
		await chatService.saveMessage(userMessage);

		const recentMessages = await chatService.getRecentMessages(userId, sessionId, 2);
		const sessionSummary = await chatService.getSessionSummary(userId, sessionId);
		const userRecipes = await RecipeService.getUserRecipes(userId, 5);

		const isRecipeRequest = requestType === "recipe_request" || message.toLowerCase().includes("recipe");
		const isRecipeQuery = requestType === "recipe_query" ||
			recentMessages.some((m) => m.messageType === "recipe_request") ||
			message.toLowerCase().includes("recipe") ||
			(currentRecipes && currentRecipes.length > 0);

		const contextMessages = recentMessages
			.filter((m) => m.role !== "system")
			.slice(-10)
			.map((m) => `${m.role}: ${m.content}`)
			.join("\n");

		const systemPrompt = `You are an AI cooking assistant for a recipe generation app.

Current context:
- User ID: ${userId}
- Session ID: ${sessionId}
- Time: ${new Date().toLocaleTimeString()}
- Request type: ${isRecipeRequest ? "New recipe request" : isRecipeQuery ? "Recipe query" : "General cooking question"}
${sessionSummary ? `\nPrevious conversation summary: ${sessionSummary}` : ""}
${currentRecipes ? `\nCurrent recipes on screen: ${JSON.stringify(currentRecipes.slice(0, 2))}` : ""}
${currentIngredients ? `\nCurrent ingredients detected: ${JSON.stringify(currentIngredients)}` : ""}
${userRecipes.length > 0 ? `\nUser's recent recipes: ${userRecipes.slice(0, 3).map((r) => r.name).join(", ")}` : ""}

Guidelines:
1. NEW RECIPE REQUEST: {"type": "recipe_request", "message": "your response"}
2. RECIPE QUERY: {"type": "recipe_query", "message": "your response"}
3. GENERAL COOKING: {"type": "general", "message": "your response"}

Recent chat history:
${contextMessages}

Current user message: ${message}

Respond with JSON only.`;

		const ai = getGenAI();
		const text = await generateText(ai, systemPrompt);

		let aiResponse;
		try {
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			aiResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: "general", message: "I'm here to help with your cooking questions!" };
		} catch {
			aiResponse = { type: "general", message: "I'm here to help with your cooking questions!" };
		}

		if (aiResponse.type === "tool_call") {
			const toolResponse = await ToolService.executeTool(userId, {
				tool: aiResponse.tool,
				parameters: aiResponse.parameters || {},
				description: aiResponse.message || "",
			});

			const enhancedPrompt = systemPrompt +
				`\n\nTool Response (${aiResponse.tool}):\nSuccess: ${toolResponse.success}\nData: ${JSON.stringify(toolResponse.data)}\nMessage: ${toolResponse.message}\n\nNow respond to the user's message with this additional context.`;

			const enhancedText = await generateText(ai, enhancedPrompt);
			try {
				const match = enhancedText.match(/\{[\s\S]*\}/);
				if (match) aiResponse = JSON.parse(match[0]);
			} catch {
				aiResponse = { type: "general", message: toolResponse.success ? "Based on the information I found, I can help you!" : "I had trouble accessing that information, but I'm still here to help!" };
			}
		}

		const assistantMessage: Omit<ChatMessage, "_id"> = {
			userId, sessionId, role: "assistant", content: aiResponse.message,
			timestamp: new Date(), messageType: aiResponse.type,
			metadata: { contextRequested: aiResponse.type === "tool_call", recipes: currentRecipes, ingredients: currentIngredients },
		};
		await chatService.saveMessage(assistantMessage);

		return NextResponse.json({ message: aiResponse.message, type: aiResponse.type, sessionId });
	} catch (error: any) {
		console.error("Error in chat API:", error);
		return NextResponse.json(
			{ error: error?.message ?? "Failed to process chat message" },
			{ status: 500 }
		);
	}
}

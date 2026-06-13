import { chatService } from "./chat-service";
import { mem0Service } from "./mem0-service";
import { RecipeService } from "./recipe-service";
import { UserService } from "./user-service";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ToolCall {
	tool: string;
	parameters: Record<string, any>;
	description: string;
}

export interface ToolResponse {
	success: boolean;
	data: any;
	message: string;
}

export class ToolService {
	static async executeTool(
		userId: string,
		toolCall: ToolCall
	): Promise<ToolResponse> {
		try {
			switch (toolCall.tool) {
				case "get_chat_history":
					return await this.getChatHistory(
						userId,
						toolCall.parameters
					);

				case "get_user_recipes":
					return await this.getUserRecipes(
						userId,
						toolCall.parameters
					);

				case "search_recipes":
					return await this.searchRecipes(
						userId,
						toolCall.parameters
					);

				case "get_recipe_details":
					return await this.getRecipeDetails(
						userId,
						toolCall.parameters
					);

				case "get_user_preferences":
					return await this.getUserPreferences(
						userId,
						toolCall.parameters
					);

				case "get_recent_ingredients":
					return await this.getRecentIngredients(
						userId,
						toolCall.parameters
					);

				case "get_cooking_history":
					return await this.getCookingHistory(
						userId,
						toolCall.parameters
					);

				case "search_conversations":
					return await this.searchConversations(
						userId,
						toolCall.parameters
					);

				default:
					return {
						success: false,
						data: null,
						message: `Unknown tool: ${toolCall.tool}`,
					};
			}
		} catch (error) {
			console.error(`Error executing tool ${toolCall.tool}:`, error);
			return {
				success: false,
				data: null,
				message: `Failed to execute tool: ${toolCall.tool}`,
			};
		}
	}

	private static async getChatHistory(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { sessionId, daysBack = 7, limit = 50 } = params;
		const beforeDate = new Date(
			Date.now() - daysBack * 24 * 60 * 60 * 1000
		);

		const messages = await chatService.getOlderMessages(
			userId,
			sessionId,
			beforeDate,
			limit
		);

		return {
			success: true,
			data: messages.map((m) => ({
				role: m.role,
				content: m.content,
				timestamp: m.timestamp,
				messageType: m.messageType,
			})),
			message: `Retrieved ${messages.length} messages from the last ${daysBack} days`,
		};
	}

	private static async getUserRecipes(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { limit = 20, category, difficulty } = params;

		let recipes = await RecipeService.getUserRecipes(userId, limit);

		// Apply filters if provided
		if (category) {
			recipes = recipes.filter((r) => r.category === category);
		}
		if (difficulty) {
			recipes = recipes.filter((r) => r.difficulty === difficulty);
		}

		return {
			success: true,
			data: recipes.map((r) => ({
				name: r.name,
				description: r.description,
				difficulty: r.difficulty,
				cookingTime: r.cookingTime,
				category: r.category,
				createdAt: r.createdAt,
			})),
			message: `Retrieved ${recipes.length} recipes`,
		};
	}

	private static async searchRecipes(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { query, limit = 10 } = params;

		if (!query) {
			return {
				success: false,
				data: null,
				message: "Search query is required",
			};
		}

		const recipes = await RecipeService.searchRecipes(userId, query, limit);

		return {
			success: true,
			data: recipes.map((r) => ({
				name: r.name,
				description: r.description,
				ingredients: r.ingredients,
				difficulty: r.difficulty,
				cookingTime: r.cookingTime,
			})),
			message: `Found ${recipes.length} recipes matching "${query}"`,
		};
	}

	private static async getRecipeDetails(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { recipeName, sessionId } = params;

		if (sessionId) {
			const session = await RecipeService.getRecipeSession(
				userId,
				sessionId
			);
			if (session) {
				const allRecipes = [
					...session.basicRecipes,
					...session.advancedRecipes,
				];
				const recipe = allRecipes.find((r) =>
					r.name.toLowerCase().includes(recipeName.toLowerCase())
				);

				if (recipe) {
					return {
						success: true,
						data: recipe,
						message: `Retrieved details for recipe: ${recipe.name}`,
					};
				}
			}
		}

		// Search in all user recipes
		const recipes = await RecipeService.searchRecipes(
			userId,
			recipeName,
			5
		);
		const recipe = recipes.find((r) =>
			r.name.toLowerCase().includes(recipeName.toLowerCase())
		);

		if (recipe) {
			return {
				success: true,
				data: recipe,
				message: `Retrieved details for recipe: ${recipe.name}`,
			};
		}

		return {
			success: false,
			data: null,
			message: `Recipe "${recipeName}" not found`,
		};
	}

	private static async getUserPreferences(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		try {
			const prefrences = await mem0Service.getUserPreferences(userId);
			console.log("User preferences fetched:", prefrences);
			return {
				success: true,
				data: prefrences,
				message: "Retrieved user preferences",
			};
		} catch (error) {
			return {
				success: false,
				data: null,
				message: "Failed to retrieve user preferences",
			};
		}
	}

	private static async getRecentIngredients(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { limit = 10 } = params;

		const recentSessions = await RecipeService.getUserRecipeSessions(
			userId,
			limit
		);
		const ingredients = recentSessions.flatMap(
			(session) => session.sourceIngredients
		);

		// Get unique ingredients
		const uniqueIngredients = ingredients.reduce((acc, ingredient) => {
			const existing = acc.find(
				(i) => i.name.toLowerCase() === ingredient.name.toLowerCase()
			);
			if (!existing) {
				acc.push(ingredient);
			}
			return acc;
		}, [] as any[]);

		return {
			success: true,
			data: uniqueIngredients.slice(0, limit),
			message: `Retrieved ${uniqueIngredients.length} recent ingredients`,
		};
	}

	private static async getCookingHistory(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { daysBack = 30, limit = 20 } = params;

		const sessions = await RecipeService.getUserRecipeSessions(
			userId,
			limit
		);
		const cutoffDate = new Date(
			Date.now() - daysBack * 24 * 60 * 60 * 1000
		);

		const recentSessions = sessions.filter(
			(session) => session.createdAt >= cutoffDate
		);

		return {
			success: true,
			data: recentSessions.map((session) => ({
				sessionId: session.sessionId,
				createdAt: session.createdAt,
				ingredientsUsed: session.sourceIngredients.map((i) => i.name),
				recipesGenerated: [
					...session.basicRecipes.map((r) => r.name),
					...session.advancedRecipes.map((r) => r.name),
				],
			})),
			message: `Retrieved cooking history for the last ${daysBack} days`,
		};
	}

	private static async searchConversations(
		userId: string,
		params: any
	): Promise<ToolResponse> {
		const { query, daysBack = 30, limit = 10 } = params;

		if (!query) {
			return {
				success: false,
				data: null,
				message: "Search query is required",
			};
		}

		const sessions = await chatService.getUserSessions(userId, 50);
		const cutoffDate = new Date(
			Date.now() - daysBack * 24 * 60 * 60 * 1000
		);

		const recentSessions = sessions.filter(
			(session) => session.createdAt >= cutoffDate
		);

		// Search in session summaries and titles
		const matchingSessions = recentSessions.filter(
			(session) =>
				session.title.toLowerCase().includes(query.toLowerCase()) ||
				(session.summary &&
					session.summary.toLowerCase().includes(query.toLowerCase()))
		);

		return {
			success: true,
			data: matchingSessions.slice(0, limit).map((session) => ({
				sessionId: session.sessionId,
				title: session.title,
				summary: session.summary,
				createdAt: session.createdAt,
				messageCount: session.messageCount,
			})),
			message: `Found ${matchingSessions.length} conversations matching "${query}"`,
		};
	}

	static getAvailableTools(): Record<string, any> {
		return {
			get_chat_history: {
				description: "Retrieve chat history from a specific session",
				parameters: {
					sessionId: "string (required)",
					daysBack: "number (optional, default: 7)",
					limit: "number (optional, default: 50)",
				},
			},
			get_user_recipes: {
				description: "Get user's saved recipes with optional filtering",
				parameters: {
					limit: "number (optional, default: 20)",
					category: "string (optional: 'basic' or 'advanced')",
					difficulty:
						"string (optional: 'Beginner', 'Intermediate', 'Professional')",
				},
			},
			search_recipes: {
				description:
					"Search through user's recipes by name, description, or ingredients",
				parameters: {
					query: "string (required)",
					limit: "number (optional, default: 10)",
				},
			},
			get_recipe_details: {
				description: "Get detailed information about a specific recipe",
				parameters: {
					recipeName: "string (required)",
					sessionId: "string (optional)",
				},
			},
			get_user_preferences: {
				description:
					"Retrieve user's dietary preferences, allergies, and cooking preferences",
				parameters: {},
			},
			get_recent_ingredients: {
				description:
					"Get recently used ingredients from user's cooking sessions",
				parameters: {
					limit: "number (optional, default: 10)",
				},
			},
			get_cooking_history: {
				description:
					"Get user's cooking history and recipe generation sessions",
				parameters: {
					daysBack: "number (optional, default: 30)",
					limit: "number (optional, default: 20)",
				},
			},
			search_conversations: {
				description: "Search through user's conversation history",
				parameters: {
					query: "string (required)",
					daysBack: "number (optional, default: 30)",
					limit: "number (optional, default: 10)",
				},
			},
		};
	}
}

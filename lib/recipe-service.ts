import { connectToDatabase } from "./mongodb";
import type { ObjectId } from "mongodb";

export interface Recipe {
	_id?: ObjectId;
	userId: string;
	name: string;
	description: string;
	cookingTime: string;
	difficulty: "Beginner" | "Intermediate" | "Professional";
	servings: number;
	category: "basic" | "advanced";
	ingredients: Array<{
		item: string;
		amount: string;
		available: boolean;
		substitute?: string;
	}>;
	equipment: string[];
	steps: string[];
	tips: string[];
	nutritionHighlights: string[];
	sourceIngredients: Array<{
		name: string;
		quantity: string;
		confidence: number;
	}>;
	createdAt: Date;
	updatedAt: Date;
}

export interface RecipeSession {
	_id?: ObjectId;
	userId: string;
	sessionId: string;
	sourceIngredients: Array<{
		name: string;
		quantity: string;
		confidence: number;
	}>;
	basicRecipes: Recipe[];
	advancedRecipes: Recipe[];
	createdAt: Date;
}

export class RecipeService {
	private static async getCollection(collectionName: string) {
		await connectToDatabase();
		const db = (await import("./mongodb")).getDatabase();
		if (!db) {
			throw new Error("Failed to get database instance");
		}
		return db.collection(collectionName);
	}

	static async storeRecipeSession(
		userId: string,
		sessionId: string,
		sourceIngredients: any[],
		basicRecipes: any[],
		advancedRecipes: any[]
	): Promise<string> {
		try {
			const collection = await this.getCollection("recipe_sessions");

			// Create recipe objects with metadata
			const processRecipes = (
				recipes: any[],
				category: "basic" | "advanced"
			): Recipe[] => {
				return recipes.map((recipe) => ({
					...recipe,
					userId,
					category,
					sourceIngredients,
					createdAt: new Date(),
					updatedAt: new Date(),
				}));
			};

			const processedBasicRecipes = processRecipes(basicRecipes, "basic");
			const processedAdvancedRecipes = processRecipes(
				advancedRecipes,
				"advanced"
			);

			const recipeSession: RecipeSession = {
				userId,
				sessionId,
				sourceIngredients,
				basicRecipes: processedBasicRecipes,
				advancedRecipes: processedAdvancedRecipes,
				createdAt: new Date(),
			};

			const result = await collection.insertOne(recipeSession);

			// Also store individual recipes for easier querying
			const allRecipes = [
				...processedBasicRecipes,
				...processedAdvancedRecipes,
			];
			if (allRecipes.length > 0) {
				const recipesCollection = await this.getCollection("recipes");
				await recipesCollection.insertMany(allRecipes);
			}

			return result.insertedId.toString();
		} catch (error) {
			console.error("Error storing recipe session:", error);
			throw new Error("Failed to store recipe session");
		}
	}

	static async getUserRecipes(userId: string, limit = 20): Promise<Recipe[]> {
		try {
			const collection = await this.getCollection("recipes");
			const recipes = await collection
				.find({ userId })
				.sort({ createdAt: -1 })
				.limit(limit)
				.toArray();

			return recipes as Recipe[];
		} catch (error) {
			console.error("Error fetching user recipes:", error);
			throw new Error("Failed to fetch user recipes");
		}
	}

	static async getRecipeSession(
		userId: string,
		sessionId: string
	): Promise<RecipeSession | null> {
		try {
			const collection = await this.getCollection("recipe_sessions");
			const session = await collection.findOne({ userId, sessionId });
			return session as RecipeSession | null;
		} catch (error) {
			console.error("Error fetching recipe session:", error);
			throw new Error("Failed to fetch recipe session");
		}
	}

	static async getUserRecipeSessions(
		userId: string,
		limit = 10
	): Promise<RecipeSession[]> {
		try {
			const collection = await this.getCollection("recipe_sessions");
			const sessions = await collection
				.find({ userId })
				.sort({ createdAt: -1 })
				.limit(limit)
				.toArray();

			return sessions as RecipeSession[];
		} catch (error) {
			console.error("Error fetching user recipe sessions:", error);
			throw new Error("Failed to fetch user recipe sessions");
		}
	}

	static async searchRecipes(
		userId: string,
		query: string,
		limit = 10
	): Promise<Recipe[]> {
		try {
			const collection = await this.getCollection("recipes");
			const recipes = await collection
				.find({
					userId,
					$or: [
						{ name: { $regex: query, $options: "i" } },
						{ description: { $regex: query, $options: "i" } },
						{
							"ingredients.item": {
								$regex: query,
								$options: "i",
							},
						},
					],
				})
				.sort({ createdAt: -1 })
				.limit(limit)
				.toArray();

			return recipes as Recipe[];
		} catch (error) {
			console.error("Error searching recipes:", error);
			throw new Error("Failed to search recipes");
		}
	}
}

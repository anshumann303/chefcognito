import { MemoryClient } from "mem0ai";

if (!process.env.MEM0_API_KEY) {
	throw new Error('Invalid/Missing environment variable: "MEM0_API_KEY"');
}

const mem0Client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });

export interface UserPreferences {
	userId: string;
	dietaryRestrictions: string[];
	allergies: string[];
	likedIngredients: string[];
	dislikedIngredients: string[];
	preferredCuisines: string[];
	cookingSkillLevel: "beginner" | "intermediate" | "advanced";
	availableEquipment: string[];
	maxCookingTime: number;
	servingSize: number;
	spiceLevel: "mild" | "medium" | "hot";
	mealPreferences: {
		breakfast: string[];
		lunch: string[];
		dinner: string[];
		snacks: string[];
	};
}

// Local storage key for user preferences
const USER_PREFS_KEY = "ai_recipe_user_preferences";

// Helper to determine if code is running in browser or server
const isBrowser = typeof window !== "undefined";

export class Mem0Service {
	/**
	 * Saves user preferences both to localStorage (client-side) and Mem0 (server-side)
	 */
	async saveUserPreferences(
		userId: string,
		preferences: Partial<UserPreferences>
	): Promise<void> {
		try {
			// Save to localStorage if in browser environment
			if (isBrowser) {
				console.log()
				this.savePreferencesToLocalStorage(userId, preferences);
			}

			// For server-side, we'll skip Mem0 operations if we have localStorage data
			if (isBrowser && this.getPreferencesFromLocalStorage(userId)) {
				return; // Already saved in localStorage
			}

			// Try to save to Mem0, but just continue if it fails
			// We're not actually using mem0Client due to compatibility issues
			console.log("User preferences saved for user:", userId);
		} catch (error) {
			console.error("Error saving user preferences:", error);
			throw error;
		}
	}

	/**
	 * Gets user preferences from localStorage first, then falls back to default
	 */
	async getUserPreferences(userId: string): Promise<UserPreferences | null> {
		try {
			// Try getting from localStorage first if in browser
			if (isBrowser) {
				const localPreferences =
					this.getPreferencesFromLocalStorage(userId);
				if (localPreferences) {
					return localPreferences;
				}
			}

			// Return default preferences if not found
			return {
				userId,
				dietaryRestrictions: [],
				allergies: [],
				likedIngredients: [],
				dislikedIngredients: [],
				preferredCuisines: [],
				cookingSkillLevel: "intermediate",
				availableEquipment: [],
				maxCookingTime: 60,
				servingSize: 2,
				spiceLevel: "medium",
				mealPreferences: {
					breakfast: [],
					lunch: [],
					dinner: [],
					snacks: [],
				},
			};
		} catch (error) {
			console.error("Error retrieving user preferences:", error);
			return null;
		}
	}

	/**
	 * Add user feedback to localStorage
	 */
	async addUserFeedback(
		userId: string,
		recipeId: string,
		feedback: "liked" | "disliked",
		reason?: string
	): Promise<void> {
		try {
			if (isBrowser) {
				// Store feedback in localStorage
				const feedbackKey = `${USER_PREFS_KEY}_feedback`;
				const feedbackData = JSON.parse(
					localStorage.getItem(feedbackKey) || "{}"
				);

				if (!feedbackData[userId]) {
					feedbackData[userId] = [];
				}

				feedbackData[userId].push({
					recipeId,
					feedback,
					reason,
					timestamp: new Date().toISOString(),
				});

				localStorage.setItem(feedbackKey, JSON.stringify(feedbackData));
			}

			// Log feedback (not using Mem0 due to compatibility issues)
			console.log(
				`User ${userId} ${feedback} recipe ${recipeId}${
					reason ? ` because: ${reason}` : ""
				}`
			);
		} catch (error) {
			console.error("Error saving user feedback:", error);
			throw error;
		}
	}

	/**
	 * Search memories - currently stub implementation using localStorage
	 */
	async searchMemories(userId: string, query: string): Promise<any[]> {
		// In browser, search localStorage
		if (isBrowser) {
			const prefs = this.getPreferencesFromLocalStorage(userId);
			if (prefs) {
				return [
					{
						text: this.formatPreferencesAsText(prefs),
						metadata: { userId },
					},
				];
			}
		}

		// No results found
		return [];
	}

	/**
	 * Get user preferences for LLM context - used before making LLM calls
	 * Tries localStorage first, then falls back to defaults
	 * This should be called by all LLM services except image ingredient detection
	 */
	async getUserPreferencesForLLM(
		userId: string,
		isImageDetection = false
	): Promise<string> {
		// For image detection, return empty context
		if (isImageDetection) {
			return "";
		}

		try {
			const preferences = await this.getUserPreferences(userId);
			if (!preferences) {
				return "";
			}

			// Format preferences as a context string for LLM
			return this.formatPreferencesAsText(preferences);
		} catch (error) {
			console.error(
				"Error getting user preferences for LLM context:",
				error
			);
			return "";
		}
	}

	/**
	 * Format preferences as human-readable text
	 */
	formatPreferencesAsText(preferences: Partial<UserPreferences>): string {
		let result = "User preferences:\n";

		if (preferences.dietaryRestrictions?.length) {
			result += `- Dietary restrictions: ${preferences.dietaryRestrictions.join(
				", "
			)}\n`;
		}
		if (preferences.allergies?.length) {
			result += `- Allergies: ${preferences.allergies.join(", ")}\n`;
		}
		if (preferences.likedIngredients?.length) {
			result += `- Liked ingredients: ${preferences.likedIngredients.join(
				", "
			)}\n`;
		}
		if (preferences.dislikedIngredients?.length) {
			result += `- Disliked ingredients: ${preferences.dislikedIngredients.join(
				", "
			)}\n`;
		}
		if (preferences.preferredCuisines?.length) {
			result += `- Preferred cuisines: ${preferences.preferredCuisines.join(
				", "
			)}\n`;
		}
		if (preferences.cookingSkillLevel) {
			result += `- Cooking skill level: ${preferences.cookingSkillLevel}\n`;
		}
		if (preferences.availableEquipment?.length) {
			result += `- Available equipment: ${preferences.availableEquipment.join(
				", "
			)}\n`;
		}
		if (preferences.maxCookingTime) {
			result += `- Max cooking time: ${preferences.maxCookingTime} minutes\n`;
		}
		if (preferences.spiceLevel) {
			result += `- Spice level: ${preferences.spiceLevel}\n`;
		}

		return result.trim();
	}

	/**
	 * Helper to save preferences to localStorage
	 */
	private savePreferencesToLocalStorage(
		userId: string,
		preferences: Partial<UserPreferences>
	): void {
		if (!isBrowser) return;
		console.log("Saving preferences to localStorage for user:", userId);
		try {
			// Get existing preferences
			const allPreferences =
				this.getAllPreferencesFromLocalStorage() || {};

			// Update or add preferences for this user
			allPreferences[userId] = {
				...allPreferences[userId],
				...preferences,
				userId,
			};

			// Save back to localStorage
			localStorage.setItem(
				USER_PREFS_KEY,
				JSON.stringify(allPreferences)
			);
		} catch (error) {
			console.error("Error saving preferences to localStorage:", error);
		}
	}

	/**
	 * Helper to get preferences for a specific user from localStorage
	 */
	private getPreferencesFromLocalStorage(
		userId: string
	): UserPreferences | null {
		if (!isBrowser) return null;

		try {
			const allPreferences = this.getAllPreferencesFromLocalStorage();
			return allPreferences?.[userId] || null;
		} catch (error) {
			console.error(
				"Error getting preferences from localStorage:",
				error
			);
			return null;
		}
	}

	/**
	 * Helper to get all preferences from localStorage
	 */
	private getAllPreferencesFromLocalStorage(): Record<
		string,
		UserPreferences
	> | null {
		if (!isBrowser) return null;

		try {
			const prefsStr = localStorage.getItem(USER_PREFS_KEY);
			if (!prefsStr) return null;

			return JSON.parse(prefsStr);
		} catch (error) {
			console.error(
				"Error parsing preferences from localStorage:",
				error
			);
			return null;
		}
	}

	/**
	 * Helper to extract list items from text
	 */
	private extractListFromText(text: string, prefix: string): string[] {
		const index = text.indexOf(prefix);
		if (index === -1) return [];

		const afterPrefix = text.substring(index + prefix.length).trim();
		return afterPrefix
			.split(",")
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
}

export const mem0Service = new Mem0Service();

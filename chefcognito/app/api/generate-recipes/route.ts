import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecipeService } from "@/lib/recipe-service";
import { v4 as uuidv4 } from "uuid";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface DetectedIngredient {
	name: string;
	quantity: string;
	confidence: number;
}

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

		const { ingredients } = await request.json();

		if (!ingredients || !Array.isArray(ingredients)) {
			return NextResponse.json(
				{ error: "No ingredients provided" },
				{ status: 400 }
			);
		}

		// Get current time for meal context
		const now = new Date();
		const currentHour = now.getHours();
		let mealType = "snack";
		if (currentHour >= 6 && currentHour < 11) mealType = "breakfast";
		else if (currentHour >= 11 && currentHour < 16) mealType = "lunch";
		else if (currentHour >= 16 && currentHour < 22) mealType = "dinner";

		// Prepare comprehensive prompt for recipe generation
		const ingredientsList = ingredients
			.map((ing: DetectedIngredient) => `${ing.name} (${ing.quantity})`)
			.join(", ");

		const prompt = `
You are an expert chef and recipe creator. Based on the detected ingredients and current context, suggest recipes that can be made.

Available Ingredients: ${ingredientsList}
Current Time: ${now.toLocaleTimeString()}
Suggested Meal Type: ${mealType}
Local Time Context: Consider this is likely for ${mealType} preparation

Please provide recipe suggestions in the following JSON structure:
{
  "basicRecipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description of the dish",
      "cookingTime": "30 minutes",
      "difficulty": "Beginner|Intermediate|Professional",
      "servings": 2,
      "ingredients": [
        {
          "item": "ingredient name",
          "amount": "quantity needed",
          "available": true
        }
      ],
      "equipment": ["basic equipment needed"],
      "steps": [
        "Step 1: Detailed cooking instruction",
        "Step 2: Next step with specific details"
      ],
      "tips": ["Helpful cooking tips"],
      "nutritionHighlights": ["Key nutritional benefits"]
    }
  ],
  "advancedRecipes": [
    {
      "name": "Advanced Recipe Name",
      "description": "Brief description",
      "cookingTime": "45 minutes",
      "difficulty": "Intermediate|Professional",
      "servings": 2,
      "ingredients": [
        {
          "item": "ingredient name",
          "amount": "quantity needed",
          "available": false,
          "substitute": "possible substitute if not available"
        }
      ],
      "equipment": ["specialized equipment needed"],
      "steps": [
        "Detailed professional cooking steps"
      ],
      "tips": ["Advanced cooking techniques"],
      "nutritionHighlights": ["Nutritional information"]
    }
  ]
}

Guidelines:
- **Basic Recipes**: Use common household spices (salt, pepper, oil, garlic) and basic equipment (stove, pan, pot)
- **Advanced Recipes**: May require specialized spices, equipment (toaster, blender, special pans), or advanced techniques
- Provide 2-3 recipes in each category
- Focus on recipes appropriate for the current meal type: ${mealType}
- Mark ingredients as "available": true if they match detected ingredients, false if additional items needed
- Include realistic cooking times and clear difficulty levels
- Steps should be unambiguous and easy to follow
- Consider ingredient quantities and don't suggest recipes requiring much more than what's available

Return only the JSON response, no additional text.
`;

		// Call Gemini API
		const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();

		// Parse JSON response
		let parsedResponse;
		try {
			// Clean the response text to extract JSON
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				parsedResponse = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error("No JSON found in response");
			}
		} catch (parseError) {
			console.error("Error parsing Gemini response:", parseError);
			console.error("Raw response:", text);

			// Fallback response
			parsedResponse = {
				basicRecipes: [
					{
						name: "Simple Stir Fry",
						description:
							"Quick and easy stir fry with available ingredients",
						cookingTime: "15 minutes",
						difficulty: "Beginner",
						servings: 2,
						ingredients: ingredients.map(
							(ing: DetectedIngredient) => ({
								item: ing.name,
								amount: ing.quantity,
								available: true,
							})
						),
						equipment: ["Pan", "Stove"],
						steps: [
							"Heat oil in a pan over medium heat",
							"Add ingredients and stir fry for 10-12 minutes",
							"Season with salt and pepper to taste",
							"Serve hot",
						],
						tips: [
							"Keep ingredients moving in the pan for even cooking",
						],
						nutritionHighlights: [
							"Fresh vegetables provide vitamins and fiber",
						],
					},
				],
				advancedRecipes: [],
			};
		}

		try {
			const sessionId = uuidv4();
			await RecipeService.storeRecipeSession(
				userId,
				sessionId,
				ingredients,
				parsedResponse.basicRecipes || [],
				parsedResponse.advancedRecipes || []
			);

			// Add sessionId to response for future reference
			parsedResponse.sessionId = sessionId;
		} catch (dbError) {
			console.error("Error storing recipes in database:", dbError);
			// Continue with response even if storage fails
		}

		return NextResponse.json(parsedResponse);
	} catch (error) {
		console.error("Error in generate-recipes API:", error);
		return NextResponse.json(
			{ error: "Failed to generate recipes" },
			{ status: 500 }
		);
	}
}

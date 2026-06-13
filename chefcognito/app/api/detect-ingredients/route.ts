import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
	const { userId } = await auth();
	if (!userId) {
		return new Response("Unauthorized", { status: 401 });
	}

	const formData = await request.formData();
	const image = formData.get("image") as File;

	if (!image) {
		return new Response("No image provided", { status: 400 });
	}

	// Set up Server-Sent Events for ingredient detection
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			const sendEvent = (step: string, progress: number) => {
				const data = JSON.stringify({ step, progress });
				controller.enqueue(encoder.encode(`data: ${data}\n\n`));
			};

			const processImage = async () => {
				try {
					sendEvent("Preparing image for analysis...", 10);

					// Convert image to base64
					const bytes = await image.arrayBuffer();
					const buffer = Buffer.from(bytes);
					const base64Image = buffer.toString("base64");

					sendEvent("Uploading to AI service...", 30);

					// Get current time for meal context
					const currentHour = new Date().getHours();
					let mealType = "snack";
					if (currentHour >= 6 && currentHour < 11)
						mealType = "breakfast";
					else if (currentHour >= 11 && currentHour < 16)
						mealType = "lunch";
					else if (currentHour >= 16 && currentHour < 22)
						mealType = "dinner";

					sendEvent("Analyzing ingredients with AI...", 60);

					// Prepare Gemini prompt
					const prompt = `
You are an expert food ingredient detection AI. Analyze this image and identify all visible food ingredients with their estimated quantities.

Current context:
- Time: ${new Date().toLocaleTimeString()}
- Likely meal type: ${mealType}

Please provide a JSON response with the following structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "estimated quantity (e.g., '2 medium', '1 cup', '3 pieces')",
      "confidence": 0.95
    }
  ]
}

Guidelines:
- Only identify actual food ingredients, not utensils or containers
- Provide realistic quantity estimates based on visual assessment
- Use confidence scores between 0.0 and 1.0
- Include common ingredients that might not be fully visible but are likely present
- Focus on ingredients that can be used for cooking

Return only the JSON response, no additional text.
`;

					sendEvent("Processing AI response...", 80);

					// Call Gemini API
					const model = genAI.getGenerativeModel({
						model: "gemini-2.5-flash",
					});

					const result = await model.generateContent([
						prompt,
						{
							inlineData: {
								data: base64Image,
								mimeType: image.type,
							},
						},
					]);

					const response = await result.response;
					const text = response.text();

					sendEvent("Finalizing results...", 95);

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
						console.error(
							"Error parsing Gemini response:",
							parseError
						);
						console.error("Raw response:", text);

						// Fallback response
						parsedResponse = {
							ingredients: [
								{
									name: "mixed ingredients",
									quantity: "various amounts",
									confidence: 0.5,
								},
							],
						};
					}

					// Send final response
					const finalData = JSON.stringify({
						step: "Complete",
						progress: 100,
						ingredients: parsedResponse.ingredients,
						done: true,
					});
					controller.enqueue(
						encoder.encode(`data: ${finalData}\n\n`)
					);
					controller.close();
				} catch (error) {
					console.error("Error in ingredient detection:", error);
					const errorData = JSON.stringify({
						step: "Error",
						progress: 100,
						error: "Failed to process image",
						done: true,
					});
					controller.enqueue(
						encoder.encode(`data: ${errorData}\n\n`)
					);
					controller.close();
				}
			};

			processImage();
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

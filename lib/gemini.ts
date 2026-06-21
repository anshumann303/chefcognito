// Shared Gemini client using the new @google/genai SDK
// which supports both AIzaSy... and AQ.... key formats
import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
	if (!_ai) {
		const key = process.env.GEMINI_API_KEY;
		if (!key || key === "placeholder") {
			throw new Error(
				"GEMINI_API_KEY is not configured. Add it to .env.local and restart the server."
			);
		}
		_ai = new GoogleGenAI({ apiKey: key });
	}
	return _ai;
}

export async function generateContent(prompt: string): Promise<string> {
	const ai = getAI();
	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: prompt,
	});
	return response.text ?? "";
}

export async function generateContentWithImage(
	prompt: string,
	base64Image: string,
	mimeType: string
): Promise<string> {
	const ai = getAI();
	const response = await ai.models.generateContent({
		model: "gemini-2.5-flash",
		contents: [
			{ text: prompt },
			{ inlineData: { data: base64Image, mimeType } },
		],
	});
	return response.text ?? "";
}

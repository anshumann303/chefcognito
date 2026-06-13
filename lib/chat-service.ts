import { connectToDatabase } from "./mongodb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ObjectId } from "mongodb";

// Initialize Gemini AI for summarization
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ChatMessage {
	_id?: ObjectId;
	userId: string;
	sessionId: string;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	messageType: "recipe_request" | "recipe_query" | "general" | "system";
	metadata?: {
		ingredients?: any[];
		recipes?: any[];
		recipeId?: string;
		contextRequested?: boolean;
		recipeSessionId?: string;
	};
}

export interface ChatSession {
	_id?: ObjectId;
	userId: string;
	sessionId: string;
	title: string;
	createdAt: Date;
	updatedAt: Date;
	summary?: string;
	messageCount: number;
	lastSummarizedAt?: Date;
}

export class ChatService {
	private static async getCollection(collectionName: string) {
		await connectToDatabase();
		const db = (await import("./mongodb")).getDatabase();
		if (!db) {
			throw new Error("Failed to get database instance");
		}
		return db.collection(collectionName);
	}

	static async saveMessage(
		message: Omit<ChatMessage, "_id">
	): Promise<ChatMessage> {
		try {
			const collection = await this.getCollection("messages");

			const result = await collection.insertOne({
				...message,
				timestamp: new Date(),
			});

			// Update session message count
			await this.updateSessionMessageCount(
				message.userId,
				message.sessionId
			);

			return {
				...message,
				_id: result.insertedId,
				timestamp: new Date(),
			};
		} catch (error) {
			console.error("Error saving message:", error);
			throw new Error("Failed to save message to database");
		}
	}

	static async getRecentMessages(
		userId: string,
		sessionId: string,
		hoursBack = 2
	): Promise<ChatMessage[]> {
		try {
			const collection = await this.getCollection("messages");
			const cutoffTime = new Date(
				Date.now() - hoursBack * 60 * 60 * 1000
			);

			const messages = await collection
				.find({
					userId,
					sessionId,
					timestamp: { $gte: cutoffTime },
				})
				.sort({ timestamp: 1 })
				.toArray();

			return messages as ChatMessage[];
		} catch (error) {
			console.error("Error fetching recent messages:", error);
			return [];
		}
	}

	static async getOlderMessages(
		userId: string,
		sessionId: string,
		beforeDate: Date,
		limit = 50
	): Promise<ChatMessage[]> {
		try {
			const collection = await this.getCollection("messages");

			const messages = await collection
				.find({
					userId,
					sessionId,
					timestamp: { $lt: beforeDate },
				})
				.sort({ timestamp: -1 })
				.limit(limit)
				.toArray();

			return (messages as ChatMessage[]).reverse();
		} catch (error) {
			console.error("Error fetching older messages:", error);
			return [];
		}
	}

	static async createOrUpdateSession(
		userId: string,
		sessionId: string,
		title?: string
	): Promise<ChatSession> {
		try {
			const collection = await this.getCollection("sessions");
			const existingSession = await collection.findOne({
				userId,
				sessionId,
			});

			if (existingSession) {
				await collection.updateOne(
					{ userId, sessionId },
					{ $set: { updatedAt: new Date() } }
				);
				return existingSession as ChatSession;
			}

			const newSession: Omit<ChatSession, "_id"> = {
				userId,
				sessionId,
				title: title || "New Recipe Chat",
				createdAt: new Date(),
				updatedAt: new Date(),
				messageCount: 0,
			};

			const result = await collection.insertOne(newSession);
			return { ...newSession, _id: result.insertedId };
		} catch (error) {
			console.error("Error creating/updating session:", error);
			throw new Error("Failed to create or update session");
		}
	}

	static async updateSessionMessageCount(
		userId: string,
		sessionId: string
	): Promise<void> {
		try {
			const collection = await this.getCollection("sessions");
			await collection.updateOne(
				{ userId, sessionId },
				{
					$inc: { messageCount: 1 },
					$set: { updatedAt: new Date() },
				}
			);
		} catch (error) {
			console.error("Error updating session message count:", error);
		}
	}

	static async shouldSummarizeSession(
		userId: string,
		sessionId: string
	): Promise<boolean> {
		try {
			const collection = await this.getCollection("sessions");
			const session = (await collection.findOne({
				userId,
				sessionId,
			})) as ChatSession;

			if (!session) return false;

			// Check if we have more than 5 messages and haven't summarized recently
			const recentMessages = await this.getRecentMessages(
				userId,
				sessionId,
				24
			); // Last 24 hours
			const unsummarizedMessages = session.lastSummarizedAt
				? recentMessages.filter(
						(m) => m.timestamp > session.lastSummarizedAt!
				  )
				: recentMessages;

			return unsummarizedMessages.length > 5;
		} catch (error) {
			console.error(
				"Error checking if session should be summarized:",
				error
			);
			return false;
		}
	}

	static async summarizeContext(messages: ChatMessage[]): Promise<string> {
		try {
			if (messages.length === 0) return "No conversation history";

			const conversationText = messages
				.map((m) => `${m.role}: ${m.content}`)
				.join("\n");

			const prompt = `
Summarize this cooking/recipe conversation concisely. Focus on:
- Key recipes discussed or requested
- Important ingredients mentioned
- Cooking questions and answers
- User preferences or dietary restrictions
- Any specific cooking techniques discussed

Conversation:
${conversationText}

Provide a concise summary in 2-3 sentences that captures the main topics and context.
`;

			const model = genAI.getGenerativeModel({
				model: "gemini-2.5-flash",
			});
			const result = await model.generateContent(prompt);
			const response = await result.response;
			const summary = response.text().trim();

			return (
				summary ||
				`Session with ${messages.length} messages about cooking and recipes`
			);
		} catch (error) {
			console.error("Error summarizing context:", error);
			const recipeRequests = messages.filter(
				(m) => m.messageType === "recipe_request"
			).length;
			const queries = messages.filter(
				(m) => m.messageType === "recipe_query"
			).length;
			return `Session summary: ${recipeRequests} recipe requests, ${queries} follow-up queries. Last activity: ${messages[
				messages.length - 1
			]?.timestamp.toISOString()}`;
		}
	}

	static async saveContextSummary(
		userId: string,
		sessionId: string,
		summary: string
	): Promise<void> {
		try {
			const collection = await this.getCollection("sessions");
			await collection.updateOne(
				{ userId, sessionId },
				{
					$set: {
						summary,
						updatedAt: new Date(),
						lastSummarizedAt: new Date(),
					},
				}
			);
		} catch (error) {
			console.error("Error saving context summary:", error);
			throw new Error("Failed to save context summary");
		}
	}

	static async getSessionSummary(
		userId: string,
		sessionId: string
	): Promise<string | null> {
		try {
			const collection = await this.getCollection("sessions");
			const session = (await collection.findOne({
				userId,
				sessionId,
			})) as ChatSession;
			return session?.summary || null;
		} catch (error) {
			console.error("Error fetching session summary:", error);
			return null;
		}
	}

	static async getUserSessions(
		userId: string,
		limit = 10
	): Promise<ChatSession[]> {
		try {
			const collection = await this.getCollection("sessions");
			const sessions = await collection
				.find({ userId })
				.sort({ updatedAt: -1 })
				.limit(limit)
				.toArray();

			return sessions as ChatSession[];
		} catch (error) {
			console.error("Error fetching user sessions:", error);
			return [];
		}
	}
}

export const chatService = ChatService;

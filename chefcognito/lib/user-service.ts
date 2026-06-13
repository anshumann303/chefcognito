import { connectToDatabase, getDatabase } from "./mongodb";
import type { ObjectId } from "mongodb";

export interface User {
	_id?: ObjectId;
	clerkId: string;
	email: string;
	firstName?: string;
	lastName?: string;
	imageUrl?: string;
	createdAt: Date;
	updatedAt: Date;
	preferences?: {
		dietaryRestrictions: string[];
		allergies: string[];
		dislikedIngredients: string[];
		preferredCuisines: string[];
		cookingSkillLevel: string;
		availableEquipment: string[];
	};
}

export class UserService {
	private db: any;
	private isInitialized = false;

	constructor() {
		this.initDb();
	}

	private async initDb() {
		try {
			if (!this.isInitialized) {
				await connectToDatabase();
				this.db = getDatabase();
				if (!this.db) {
					throw new Error("Failed to get database instance");
				}
				this.isInitialized = true;
				console.log("User service database initialized successfully");
			}
		} catch (error) {
			console.error("Failed to initialize user service database:", error);
			this.isInitialized = false;
		}
	}

	private async ensureConnection() {
		if (!this.isInitialized || !this.db) {
			await this.initDb();
		}
		if (!this.db) {
			throw new Error("Database connection not available");
		}
	}

	async createOrUpdateUser(userData: {
		clerkId: string;
		email: string;
		firstName?: string;
		lastName?: string;
		imageUrl?: string;
	}): Promise<User> {
		try {
			await this.ensureConnection();

			const existingUser = await this.db
				.collection("users")
				.findOne({ clerkId: userData.clerkId });

			if (existingUser) {
				// Update existing user
				await this.db.collection("users").updateOne(
					{ clerkId: userData.clerkId },
					{
						$set: {
							...userData,
							updatedAt: new Date(),
						},
					}
				);
				return { ...existingUser, ...userData, updatedAt: new Date() };
			}

			// Create new user
			const newUser: Omit<User, "_id"> = {
				...userData,
				createdAt: new Date(),
				updatedAt: new Date(),
				preferences: {
					dietaryRestrictions: [],
					allergies: [],
					dislikedIngredients: [],
					preferredCuisines: [],
					cookingSkillLevel: "beginner",
					availableEquipment: [],
				},
			};

			const result = await this.db.collection("users").insertOne(newUser);
			return { ...newUser, _id: result.insertedId };
		} catch (error) {
			console.error("Error creating/updating user:", error);
			throw new Error("Failed to create or update user");
		}
	}

	async getUserByClerkId(clerkId: string): Promise<User | null> {
		try {
			await this.ensureConnection();

			const user = await this.db.collection("users").findOne({ clerkId });
			return user;
		} catch (error) {
			console.error("Error fetching user:", error);
			return null;
		}
	}

	async updateUserPreferences(
		clerkId: string,
		preferences: Partial<User["preferences"]>
	): Promise<void> {
		try {
			await this.ensureConnection();

			await this.db.collection("users").updateOne(
				{ clerkId },
				{
					$set: {
						preferences: preferences,
						updatedAt: new Date(),
					},
				}
			);
		} catch (error) {
			console.error("Error updating user preferences:", error);
			throw new Error("Failed to update user preferences");
		}
	}
}

export const userService = new UserService();

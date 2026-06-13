import mongoose from "mongoose";

if (!process.env.MONGODB_URI) {
	throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
}

declare global {
	var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
	global.mongoose = cached;
}

export async function connectToDatabase() {
	if (cached.conn) {
		return cached.conn;
	}

	if (!cached.promise) {
		const opts = {
			bufferCommands: false,
			maxPoolSize: 10,
			minPoolSize: 5,
			serverSelectionTimeoutMS: 10000,
			socketTimeoutMS: 45000,
			family: 4, // Force IPv4
		};

		cached.promise = mongoose
			.connect(MONGODB_URI, opts)
			.then((mongoose) => {
				console.log("✅ MongoDB connected successfully via Mongoose");
				return mongoose;
			})
			.catch((error) => {
				console.error("❌ MongoDB connection error:", error);
				cached.promise = null; // Reset promise on error
				throw error;
			});
	}

	try {
		cached.conn = await cached.promise;
	} catch (e) {
		cached.promise = null;
		throw e;
	}

	return cached.conn;
}

// Helper function to get the database instance
export function getDatabase() {
	if (!cached.conn) {
		throw new Error(
			"Database not connected. Call connectToDatabase() first."
		);
	}
	return cached.conn.connection.db;
}

// Connection status check
export function isConnected(): boolean {
	return mongoose.connection.readyState === 1;
}

// Graceful disconnect
export async function disconnectDatabase() {
	if (cached.conn) {
		await cached.conn.disconnect();
		cached.conn = null;
		cached.promise = null;
		console.log("MongoDB disconnected");
	}
}

export default mongoose;

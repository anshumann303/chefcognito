import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { mem0Service } from "@/lib/mem0-service";

export async function GET(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const preferences = await mem0Service.getUserPreferences(userId);
		return NextResponse.json({ preferences });
	} catch (error) {
		console.error("Error fetching preferences:", error);
		return NextResponse.json(
			{ error: "Failed to fetch preferences" },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}
		console.log("Call came here...");
		const preferences = await request.json();
		await mem0Service.saveUserPreferences(userId, preferences);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error saving preferences:", error);
		return NextResponse.json(
			{ error: "Failed to save preferences" },
			{ status: 500 }
		);
	}
}

"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import {
	Camera,
	ChefHat,
	Sparkles,
	MessageCircle,
	RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ImageUpload } from "@/components/image-upload";
import { IngredientsDisplay } from "@/components/ingredients-display";
import { RecipeSuggestions } from "@/components/recipe-suggestions";
import { CollapsibleChat } from "@/components/collapsible-chat";
import { PreferencesDialog } from "@/components/preferences-dialog";
import { UserSync } from "@/components/user-sync";
import {
	DynamicLayoutProvider,
	useLayout,
} from "@/components/dynamic-layout-provider";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function HomePage() {
	const router = useRouter();
	return (
		<DynamicLayoutProvider>
			<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
				<UserSync />

				{/* Header */}
				<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="container mx-auto px-4 py-4 flex items-center justify-between">
						<div
							className="flex items-center gap-2 cursor-pointer"
							onClick={() => router.push("/")}
						>
							<ChefHat className="h-8 w-8 text-primary" />
							<h1 className="text-2xl font-bold">ChefCognito</h1>
						</div>
						<div className="flex items-center gap-4">
							<SignedIn>
								<PreferencesDialog />
							</SignedIn>
							<ThemeToggle />
							<SignedIn>
								<UserButton afterSignOutUrl="/" />
							</SignedIn>
							<SignedOut>
								<SignInButton mode="modal">
									<Button variant="outline">Sign In</Button>
								</SignInButton>
							</SignedOut>
						</div>
					</div>
				</header>

				{/* Main Content */}
				<main className="container mx-auto px-4 py-12">
					<SignedOut>
						<div className="max-w-4xl mx-auto text-center space-y-8">
							<div className="space-y-4">
								<h2 className="text-4xl font-bold tracking-tight sm:text-6xl">
									Transform Your Ingredients Into{" "}
									<span className="text-primary">
										Delicious Recipes
									</span>
								</h2>
								<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
									Simply snap a photo of your available
									ingredients and let our AI suggest amazing
									recipes you can make right now.
								</p>
							</div>

							<div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
								<Card>
									<CardHeader>
										<Camera className="h-12 w-12 text-primary mx-auto" />
										<CardTitle>Snap a Photo</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription>
											Take a picture of your available
											ingredients and let AI detect what
											you have.
										</CardDescription>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<Sparkles className="h-12 w-12 text-primary mx-auto" />
										<CardTitle>AI Analysis</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription>
											Our AI identifies ingredients,
											estimates quantities, and considers
											your preferences.
										</CardDescription>
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<ChefHat className="h-12 w-12 text-primary mx-auto" />
										<CardTitle>Get Recipes</CardTitle>
									</CardHeader>
									<CardContent>
										<CardDescription>
											Receive personalized recipe
											suggestions from basic to advanced
											cooking levels.
										</CardDescription>
									</CardContent>
								</Card>
							</div>

							<SignInButton mode="modal">
								<Button size="lg" className="text-lg px-8 py-6">
									Get Started - Sign In
								</Button>
							</SignInButton>
						</div>
					</SignedOut>

					<SignedIn>
						<RecipeGeneratorApp />
					</SignedIn>
				</main>
			</div>
		</DynamicLayoutProvider>
	);
}

function RecipeGeneratorApp() {
	const { layoutState, setCurrentStep, resetLayout } = useLayout();
	const [detectedIngredients, setDetectedIngredients] = useState<any[]>([]);
	const [generatedRecipes, setGeneratedRecipes] = useState<any[]>([]);

	const handleIngredientsDetected = (ingredients: any[]) => {
		setDetectedIngredients(ingredients);
		setCurrentStep("ingredients");
	};

	const handleIngredientsChange = (ingredients: any[]) => {
		setDetectedIngredients(ingredients);
	};

	const handleRecipesGenerated = (recipes: any[]) => {
		setGeneratedRecipes(recipes);
		setCurrentStep("recipes");
	};

	const handleRecipeRequest = (message: string) => {
		console.log("Recipe request from chat:", message);
	};

	const handleReset = () => {
		setDetectedIngredients([]);
		setGeneratedRecipes([]);
		resetLayout();
	};

	return (
		<div className="max-w-7xl mx-auto space-y-8">
			<div className="text-center space-y-4">
				<div className="flex items-center justify-center gap-4">
					<h2 className="text-3xl font-bold">Welcome Back!</h2>
					{layoutState.currentStep !== "upload" && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleReset}
							className="gap-2 bg-transparent"
						>
							<RotateCcw className="h-4 w-4" />
							Start Over
						</Button>
					)}
				</div>
				<p className="text-muted-foreground">
					{layoutState.currentStep === "upload" &&
						"Upload ingredients to get started with AI-powered recipe suggestions"}
					{layoutState.currentStep === "ingredients" &&
						"Review and edit your detected ingredients, then generate recipes"}
					{layoutState.currentStep === "recipes" &&
						"Explore your personalized recipes and chat with our AI assistant"}
				</p>
			</div>

			{/* Dynamic Layout based on current step */}
			<div
				className={cn(
					"transition-all duration-700 ease-in-out",
					layoutState.focusMode === "upload" &&
						"grid place-items-center",
					layoutState.focusMode === "ingredients" &&
						"grid lg:grid-cols-2 gap-8",
					layoutState.focusMode === "recipes" &&
						"grid xl:grid-cols-3 gap-8",
					layoutState.focusMode === "balanced" &&
						"grid xl:grid-cols-3 gap-8"
				)}
			>
				{/* Image Upload Section */}
				{layoutState.showUpload && (
					<div
						className={cn(
							"transition-all duration-500 ease-in-out",
							layoutState.focusMode === "upload" &&
								"w-full max-w-2xl",
							layoutState.focusMode === "ingredients" &&
								"space-y-6",
							layoutState.focusMode === "recipes" && "hidden"
						)}
					>
						<div
							className={cn(
								layoutState.focusMode === "upload" &&
									"scale-100",
								layoutState.focusMode === "ingredients" &&
									"scale-90 opacity-75"
							)}
						>
							<ImageUpload
								onIngredientsDetected={
									handleIngredientsDetected
								}
							/>
						</div>
					</div>
				)}

				{/* Ingredients Section */}
				{layoutState.showIngredients &&
					detectedIngredients.length > 0 && (
						<div
							className={cn(
								"transition-all duration-500 ease-in-out",
								layoutState.focusMode === "ingredients" &&
									"space-y-6",
								layoutState.focusMode === "recipes" && "hidden"
							)}
						>
							<IngredientsDisplay
								ingredients={detectedIngredients}
								onIngredientsChange={handleIngredientsChange}
							/>
						</div>
					)}

				{/* Recipe Suggestions Section */}
				{detectedIngredients.length > 0 && (
					<div
						className={cn(
							"transition-all duration-500 ease-in-out",
							layoutState.focusMode === "recipes" &&
								"xl:col-span-2"
						)}
					>
						<RecipeSuggestions
							ingredients={detectedIngredients}
							onRecipesGenerated={handleRecipesGenerated}
						/>
					</div>
				)}

				{/* Chat Interface */}
				{!layoutState.isChatMinimized && (
					<div
						className={cn(
							"transition-all duration-500 ease-in-out",
							layoutState.focusMode === "recipes" &&
								"xl:col-span-1"
						)}
					>
						<CollapsibleChat
							onRecipeRequest={handleRecipeRequest}
							currentRecipes={generatedRecipes}
							currentIngredients={detectedIngredients}
						/>
					</div>
				)}
			</div>

			{/* Collapsible Chat for minimized state */}
			{layoutState.isChatMinimized && (
				<CollapsibleChat
					onRecipeRequest={handleRecipeRequest}
					currentRecipes={generatedRecipes}
					currentIngredients={detectedIngredients}
				/>
			)}

			{/* Mobile Layout - Always stacked */}
			<div className="xl:hidden space-y-8">
				{layoutState.showRecipes && (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageCircle className="h-5 w-5 text-primary" />
								AI Cooking Assistant
							</CardTitle>
							<CardDescription>
								Ask questions about recipes, cooking techniques,
								or ingredient substitutions
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="h-[400px]">
								<CollapsibleChat
									onRecipeRequest={handleRecipeRequest}
									currentRecipes={generatedRecipes}
									currentIngredients={detectedIngredients}
								/>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}

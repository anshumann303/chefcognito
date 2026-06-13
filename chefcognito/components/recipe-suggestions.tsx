"use client"
import { useState, useMemo } from "react"
import { Clock, Users, ChefHat, CheckCircle, AlertCircle, Lightbulb, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { RecipeFilters, type FilterOptions } from "@/components/recipe-filters"

interface Recipe {
  name: string
  description: string
  cookingTime: string
  difficulty: "Beginner" | "Intermediate" | "Professional"
  servings: number
  ingredients: Array<{
    item: string
    amount: string
    available: boolean
    substitute?: string
  }>
  equipment: string[]
  steps: string[]
  tips: string[]
  nutritionHighlights: string[]
  category: "basic" | "advanced"
}

interface RecipeSuggestionsProps {
  ingredients: Array<{
    name: string
    quantity: string
    confidence: number
  }>
  onRecipesGenerated?: (recipes: any[]) => void
}

export function RecipeSuggestions({ ingredients, onRecipesGenerated }: RecipeSuggestionsProps) {
  const [recipes, setRecipes] = useState<{ basicRecipes: Recipe[]; advancedRecipes: Recipe[] } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: "",
    difficulty: [],
    maxCookingTime: 120,
    availableIngredientsOnly: false,
    recipeType: "all",
    sortBy: "relevance",
    spicesRequired: [],
  })
  const { toast } = useToast()

  const generateRecipes = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate recipes")
      }

      const data = await response.json()
      setRecipes(data)

      const allRecipes = [...data.basicRecipes, ...data.advancedRecipes]
      if (onRecipesGenerated) {
        onRecipesGenerated(allRecipes)
      }

      toast({
        title: "Recipes generated!",
        description: `Found ${data.basicRecipes.length + data.advancedRecipes.length} recipe suggestions for you.`,
      })
    } catch (error) {
      console.error("Error generating recipes:", error)
      toast({
        title: "Error generating recipes",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const filteredRecipes = useMemo(() => {
    if (!recipes) return { basicRecipes: [], advancedRecipes: [] }

    const filterRecipe = (recipe: Recipe) => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesSearch =
          recipe.name.toLowerCase().includes(query) ||
          recipe.description.toLowerCase().includes(query) ||
          recipe.ingredients.some((ing) => ing.item.toLowerCase().includes(query))
        if (!matchesSearch) return false
      }

      // Difficulty filter
      if (filters.difficulty.length > 0 && !filters.difficulty.includes(recipe.difficulty)) {
        return false
      }

      // Cooking time filter
      const cookingMinutes = Number.parseInt(recipe.cookingTime.match(/\d+/)?.[0] || "0")
      if (cookingMinutes > filters.maxCookingTime) {
        return false
      }

      // Available ingredients only filter
      if (filters.availableIngredientsOnly) {
        const hasUnavailableIngredients = recipe.ingredients.some((ing) => !ing.available)
        if (hasUnavailableIngredients) return false
      }

      return true
    }

    const sortRecipes = (recipeList: Recipe[]) => {
      return [...recipeList].sort((a, b) => {
        switch (filters.sortBy) {
          case "time":
            const aTime = Number.parseInt(a.cookingTime.match(/\d+/)?.[0] || "0")
            const bTime = Number.parseInt(b.cookingTime.match(/\d+/)?.[0] || "0")
            return aTime - bTime
          case "difficulty":
            const difficultyOrder = { Beginner: 1, Intermediate: 2, Professional: 3 }
            return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
          case "ingredients":
            const aAvailable = a.ingredients.filter((ing) => ing.available).length
            const bAvailable = b.ingredients.filter((ing) => ing.available).length
            return bAvailable - aAvailable
          default:
            return 0
        }
      })
    }

    let filteredBasic = recipes.basicRecipes.filter(filterRecipe)
    let filteredAdvanced = recipes.advancedRecipes.filter(filterRecipe)

    // Apply recipe type filter
    if (filters.recipeType === "basic") {
      filteredAdvanced = []
    } else if (filters.recipeType === "advanced") {
      filteredBasic = []
    }

    return {
      basicRecipes: sortRecipes(filteredBasic),
      advancedRecipes: sortRecipes(filteredAdvanced),
    }
  }, [recipes, filters])

  const allFilteredRecipes = useMemo(() => {
    return [
      ...filteredRecipes.basicRecipes.map((recipe) => ({ ...recipe, category: "basic" as const })),
      ...filteredRecipes.advancedRecipes.map((recipe) => ({ ...recipe, category: "advanced" as const })),
    ]
  }, [filteredRecipes])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500"
      case "Intermediate":
        return "bg-yellow-500"
      case "Professional":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const availableSpices = useMemo(() => {
    if (!recipes) return []
    const allIngredients = [
      ...recipes.basicRecipes.flatMap((r) => r.ingredients),
      ...recipes.advancedRecipes.flatMap((r) => r.ingredients),
    ]
    const spices = allIngredients
      .map((ing) => ing.item.toLowerCase())
      .filter((item) =>
        ["salt", "pepper", "garlic", "onion", "cumin", "paprika", "oregano", "basil", "thyme"].includes(item),
      )
    return [...new Set(spices)]
  }, [recipes])

  const RecipeCard = ({ recipe }: { recipe: Recipe }) => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{recipe.name}</CardTitle>
            <CardDescription>{recipe.description}</CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getDifficultyColor(recipe.difficulty)}>{recipe.difficulty}</Badge>
            <Badge variant="outline" className="text-xs">
              {recipe.category === "basic" ? "Basic" : "Advanced"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {recipe.cookingTime}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {recipe.servings} servings
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ingredients */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Ingredients
          </h4>
          <div className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="flex-1">
                  {ingredient.amount} {ingredient.item}
                </span>
                {ingredient.available ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    {ingredient.substitute && (
                      <span className="text-xs text-muted-foreground">or {ingredient.substitute}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Equipment */}
        <div>
          <h4 className="font-semibold mb-3">Equipment Needed</h4>
          <div className="flex flex-wrap gap-2">
            {recipe.equipment.map((item, index) => (
              <Badge key={index} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Cooking Steps */}
        <div>
          <h4 className="font-semibold mb-3">Cooking Steps</h4>
          <ol className="space-y-3">
            {recipe.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {recipe.tips.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Pro Tips
              </h4>
              <ul className="space-y-2">
                {recipe.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Nutrition */}
        {recipe.nutritionHighlights.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3">Nutrition Highlights</h4>
              <div className="flex flex-wrap gap-2">
                {recipe.nutritionHighlights.map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Recipe Generator
          </CardTitle>
          <CardDescription>
            {recipes
              ? "Generate new recipes or explore your current suggestions below"
              : "Generate personalized recipes based on your detected ingredients"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={generateRecipes}
            disabled={isGenerating}
            size="lg"
            className="text-lg px-8 py-6 min-w-[200px]"
          >
            {isGenerating ? "Generating Recipes..." : recipes ? "Generate New Recipes" : "Generate Recipe Suggestions"}
          </Button>
        </CardContent>
      </Card>

      {recipes && (
        <>
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Your Recipe Suggestions</h3>
            <p className="text-muted-foreground">Found {allFilteredRecipes.length} recipes based on your ingredients</p>
          </div>

          <RecipeFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableSpices={availableSpices}
            totalRecipes={recipes.basicRecipes.length + recipes.advancedRecipes.length}
            filteredCount={allFilteredRecipes.length}
          />

          {allFilteredRecipes.length > 0 ? (
            <Tabs defaultValue="recipe-0" className="w-full">
              <TabsList
                className="grid w-full gap-1 h-auto p-1"
                style={{ gridTemplateColumns: `repeat(${Math.min(allFilteredRecipes.length, 4)}, 1fr)` }}
              >
                {allFilteredRecipes.slice(0, 4).map((recipe, index) => (
                  <TabsTrigger
                    key={index}
                    value={`recipe-${index}`}
                    className="flex flex-col items-center gap-1 p-3 h-auto text-xs"
                  >
                    <span className="font-medium truncate max-w-[120px]">{recipe.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={recipe.category === "basic" ? "secondary" : "default"}
                        className="text-xs px-1 py-0"
                      >
                        {recipe.category === "basic" ? "Basic" : "Advanced"}
                      </Badge>
                      <span className="text-muted-foreground">{recipe.cookingTime}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {allFilteredRecipes.slice(0, 4).map((recipe, index) => (
                <TabsContent key={index} value={`recipe-${index}`} className="mt-6">
                  <RecipeCard recipe={recipe} />
                </TabsContent>
              ))}

              {/* Show remaining recipes if more than 4 */}
              {allFilteredRecipes.length > 4 && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-3">Additional Recipes ({allFilteredRecipes.length - 4})</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {allFilteredRecipes.slice(4).map((recipe, index) => (
                      <Card key={index + 4} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">{recipe.name}</h5>
                          <Badge variant={recipe.category === "basic" ? "secondary" : "default"} className="text-xs">
                            {recipe.category === "basic" ? "Basic" : "Advanced"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{recipe.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {recipe.cookingTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {recipe.servings} servings
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </Tabs>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No recipes match your current filters.</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters({
                      searchQuery: "",
                      difficulty: [],
                      maxCookingTime: 120,
                      availableIngredientsOnly: false,
                      recipeType: "all",
                      sortBy: "relevance",
                      spicesRequired: [],
                    })
                  }
                  className="mt-4"
                >
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

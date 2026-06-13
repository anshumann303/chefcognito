"use client"
import { useState, useEffect } from "react"
import { Settings, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import type { UserPreferences } from "@/lib/mem0-service"

const COMMON_DIETARY_RESTRICTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Low-Carb",
  "Low-Sodium",
  "Halal",
  "Kosher",
]

const COMMON_ALLERGIES = ["Nuts", "Peanuts", "Shellfish", "Fish", "Eggs", "Dairy", "Soy", "Wheat", "Sesame"]

const CUISINES = [
  "Italian",
  "Mexican",
  "Chinese",
  "Indian",
  "Thai",
  "Japanese",
  "Mediterranean",
  "French",
  "American",
  "Korean",
  "Vietnamese",
  "Greek",
]

const EQUIPMENT = [
  "Oven",
  "Stovetop",
  "Microwave",
  "Air Fryer",
  "Slow Cooker",
  "Pressure Cooker",
  "Blender",
  "Food Processor",
  "Stand Mixer",
  "Grill",
  "Toaster",
  "Rice Cooker",
]

export function PreferencesDialog() {
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({
    dietaryRestrictions: [],
    allergies: [],
    likedIngredients: [],
    dislikedIngredients: [],
    preferredCuisines: [],
    availableEquipment: [],
    cookingSkillLevel: "beginner",
    maxCookingTime: 60,
    servingSize: 2,
    spiceLevel: "medium",
  })
  const [newIngredient, setNewIngredient] = useState("")
  const [ingredientType, setIngredientType] = useState<"liked" | "disliked">("liked")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadPreferences()
    }
  }, [open])

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/preferences")
      const data = await response.json()
      if (data.preferences) {
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error("Error loading preferences:", error)
    }
  }

  const savePreferences = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      toast({
        title: "Preferences saved!",
        description: "Your cooking preferences have been updated.",
      })
      setOpen(false)
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast({
        title: "Error saving preferences",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleArrayItem = (array: string[], item: string, key: keyof UserPreferences) => {
    const newArray = array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
    setPreferences({ ...preferences, [key]: newArray })
  }

  const addIngredient = () => {
    if (!newIngredient.trim()) return

    const key = ingredientType === "liked" ? "likedIngredients" : "dislikedIngredients"
    const currentArray = (preferences[key] as string[]) || []

    if (!currentArray.includes(newIngredient.trim())) {
      setPreferences({
        ...preferences,
        [key]: [...currentArray, newIngredient.trim()],
      })
    }

    setNewIngredient("")
  }

  const removeIngredient = (ingredient: string, key: keyof UserPreferences) => {
    const currentArray = (preferences[key] as string[]) || []
    setPreferences({
      ...preferences,
      [key]: currentArray.filter((item) => item !== ingredient),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cooking Preferences</DialogTitle>
          <DialogDescription>
            Customize your recipe suggestions by setting your dietary preferences, skill level, and available equipment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cooking Skill Level</Label>
              <Select
                value={preferences.cookingSkillLevel}
                onValueChange={(value) => setPreferences({ ...preferences, cookingSkillLevel: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Spice Level</Label>
              <Select
                value={preferences.spiceLevel}
                onValueChange={(value) => setPreferences({ ...preferences, spiceLevel: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mild">Mild</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Cooking Time (minutes)</Label>
              <Input
                type="number"
                value={preferences.maxCookingTime || 60}
                onChange={(e) =>
                  setPreferences({ ...preferences, maxCookingTime: Number.parseInt(e.target.value) || 60 })
                }
                min="5"
                max="240"
              />
            </div>

            <div className="space-y-2">
              <Label>Default Serving Size</Label>
              <Input
                type="number"
                value={preferences.servingSize || 2}
                onChange={(e) => setPreferences({ ...preferences, servingSize: Number.parseInt(e.target.value) || 2 })}
                min="1"
                max="12"
              />
            </div>
          </div>

          <Separator />

          {/* Dietary Restrictions */}
          <div className="space-y-3">
            <Label>Dietary Restrictions</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_DIETARY_RESTRICTIONS.map((restriction) => (
                <Button
                  key={restriction}
                  variant={preferences.dietaryRestrictions?.includes(restriction) ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    toggleArrayItem(preferences.dietaryRestrictions || [], restriction, "dietaryRestrictions")
                  }
                >
                  {restriction}
                </Button>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-3">
            <Label>Allergies</Label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map((allergy) => (
                <Button
                  key={allergy}
                  variant={preferences.allergies?.includes(allergy) ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayItem(preferences.allergies || [], allergy, "allergies")}
                >
                  {allergy}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Preferred Cuisines */}
          <div className="space-y-3">
            <Label>Preferred Cuisines</Label>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((cuisine) => (
                <Button
                  key={cuisine}
                  variant={preferences.preferredCuisines?.includes(cuisine) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayItem(preferences.preferredCuisines || [], cuisine, "preferredCuisines")}
                >
                  {cuisine}
                </Button>
              ))}
            </div>
          </div>

          {/* Available Equipment */}
          <div className="space-y-3">
            <Label>Available Equipment</Label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((equipment) => (
                <Button
                  key={equipment}
                  variant={preferences.availableEquipment?.includes(equipment) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayItem(preferences.availableEquipment || [], equipment, "availableEquipment")}
                >
                  {equipment}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Ingredient Preferences */}
          <div className="space-y-4">
            <Label>Ingredient Preferences</Label>
            <div className="flex gap-2">
              <Select value={ingredientType} onValueChange={(value) => setIngredientType(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="liked">Like</SelectItem>
                  <SelectItem value="disliked">Dislike</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Add ingredient..."
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addIngredient()}
              />
              <Button onClick={addIngredient} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Liked Ingredients */}
            {preferences.likedIngredients && preferences.likedIngredients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-green-600">Liked Ingredients</Label>
                <div className="flex flex-wrap gap-2">
                  {preferences.likedIngredients.map((ingredient) => (
                    <Badge key={ingredient} variant="secondary" className="flex items-center gap-1">
                      {ingredient}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeIngredient(ingredient, "likedIngredients")}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Disliked Ingredients */}
            {preferences.dislikedIngredients && preferences.dislikedIngredients.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-red-600">Disliked Ingredients</Label>
                <div className="flex flex-wrap gap-2">
                  {preferences.dislikedIngredients.map((ingredient) => (
                    <Badge key={ingredient} variant="destructive" className="flex items-center gap-1">
                      {ingredient}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeIngredient(ingredient, "dislikedIngredients")}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={savePreferences} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

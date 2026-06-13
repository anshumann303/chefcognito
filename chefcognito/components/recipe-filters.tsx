"use client"
import { useState } from "react"
import { Filter, Search, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export interface FilterOptions {
  searchQuery: string
  difficulty: string[]
  maxCookingTime: number
  availableIngredientsOnly: boolean
  recipeType: "all" | "basic" | "advanced"
  sortBy: "relevance" | "time" | "difficulty" | "ingredients"
  spicesRequired: string[]
}

interface RecipeFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  availableSpices?: string[]
  totalRecipes: number
  filteredCount: number
}

export function RecipeFilters({
  filters,
  onFiltersChange,
  availableSpices = [],
  totalRecipes,
  filteredCount,
}: RecipeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const toggleDifficulty = (difficulty: string) => {
    const newDifficulties = filters.difficulty.includes(difficulty)
      ? filters.difficulty.filter((d) => d !== difficulty)
      : [...filters.difficulty, difficulty]
    updateFilter("difficulty", newDifficulties)
  }

  const toggleSpice = (spice: string) => {
    const newSpices = filters.spicesRequired.includes(spice)
      ? filters.spicesRequired.filter((s) => s !== spice)
      : [...filters.spicesRequired, spice]
    updateFilter("spicesRequired", newSpices)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: "",
      difficulty: [],
      maxCookingTime: 120,
      availableIngredientsOnly: false,
      recipeType: "all",
      sortBy: "relevance",
      spicesRequired: [],
    })
  }

  const activeFiltersCount =
    filters.difficulty.length +
    (filters.availableIngredientsOnly ? 1 : 0) +
    (filters.maxCookingTime < 120 ? 1 : 0) +
    (filters.recipeType !== "all" ? 1 : 0) +
    filters.spicesRequired.length +
    (filters.searchQuery ? 1 : 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredCount} of {totalRecipes} recipes
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Less" : "More"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Recipes</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name, ingredient, or cuisine..."
              value={filters.searchQuery}
              onChange={(e) => updateFilter("searchQuery", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.recipeType === "basic" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("recipeType", filters.recipeType === "basic" ? "all" : "basic")}
          >
            Basic Only
          </Button>
          <Button
            variant={filters.recipeType === "advanced" ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("recipeType", filters.recipeType === "advanced" ? "all" : "advanced")}
          >
            Advanced Only
          </Button>
          <Button
            variant={filters.availableIngredientsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter("availableIngredientsOnly", !filters.availableIngredientsOnly)}
          >
            Available Ingredients Only
          </Button>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="time">Cooking Time</SelectItem>
              <SelectItem value="difficulty">Difficulty</SelectItem>
              <SelectItem value="ingredients">Ingredient Match</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isExpanded && (
          <>
            <Separator />

            {/* Difficulty */}
            <div className="space-y-3">
              <Label>Difficulty Level</Label>
              <div className="space-y-2">
                {["Beginner", "Intermediate", "Professional"].map((difficulty) => (
                  <div key={difficulty} className="flex items-center space-x-2">
                    <Checkbox
                      id={difficulty}
                      checked={filters.difficulty.includes(difficulty)}
                      onCheckedChange={() => toggleDifficulty(difficulty)}
                    />
                    <Label htmlFor={difficulty} className="text-sm font-normal">
                      {difficulty}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Cooking Time */}
            <div className="space-y-3">
              <Label>Maximum Cooking Time</Label>
              <div className="space-y-2">
                <Slider
                  value={[filters.maxCookingTime]}
                  onValueChange={([value]) => updateFilter("maxCookingTime", value)}
                  max={120}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>5 min</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {filters.maxCookingTime} min
                  </span>
                  <span>2 hours</span>
                </div>
              </div>
            </div>

            {/* Spices */}
            {availableSpices.length > 0 && (
              <div className="space-y-3">
                <Label>Required Spices</Label>
                <div className="flex flex-wrap gap-2">
                  {availableSpices.map((spice) => (
                    <Button
                      key={spice}
                      variant={filters.spicesRequired.includes(spice) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSpice(spice)}
                      className="text-xs"
                    >
                      {spice}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Active Filters</Label>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.searchQuery && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: {filters.searchQuery}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("searchQuery", "")} />
                  </Badge>
                )}
                {filters.difficulty.map((diff) => (
                  <Badge key={diff} variant="secondary" className="flex items-center gap-1">
                    {diff}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleDifficulty(diff)} />
                  </Badge>
                ))}
                {filters.availableIngredientsOnly && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Available Only
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => updateFilter("availableIngredientsOnly", false)}
                    />
                  </Badge>
                )}
                {filters.maxCookingTime < 120 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    ≤ {filters.maxCookingTime} min
                    <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("maxCookingTime", 120)} />
                  </Badge>
                )}
                {filters.recipeType !== "all" && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.recipeType}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("recipeType", "all")} />
                  </Badge>
                )}
                {filters.spicesRequired.map((spice) => (
                  <Badge key={spice} variant="secondary" className="flex items-center gap-1">
                    {spice}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => toggleSpice(spice)} />
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

"use client"
import { Badge } from "@/components/ui/badge"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CheckCircle, Plus, X, Edit2, Check } from "lucide-react"
import { useState } from "react"

interface DetectedIngredient {
  name: string
  quantity: string
  confidence: number
}

interface IngredientsDisplayProps {
  ingredients: DetectedIngredient[]
  onIngredientsChange?: (ingredients: DetectedIngredient[]) => void
}

export function IngredientsDisplay({ ingredients, onIngredientsChange }: IngredientsDisplayProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editQuantity, setEditQuantity] = useState("")
  const [newIngredientName, setNewIngredientName] = useState("")
  const [newIngredientQuantity, setNewIngredientQuantity] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  if (ingredients.length === 0) return null

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditName(ingredients[index].name)
    setEditQuantity(ingredients[index].quantity)
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null && onIngredientsChange) {
      const updatedIngredients = [...ingredients]
      updatedIngredients[editingIndex] = {
        ...updatedIngredients[editingIndex],
        name: editName.trim(),
        quantity: editQuantity.trim(),
      }
      onIngredientsChange(updatedIngredients)
    }
    setEditingIndex(null)
    setEditName("")
    setEditQuantity("")
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditName("")
    setEditQuantity("")
  }

  const handleRemove = (index: number) => {
    if (onIngredientsChange) {
      const updatedIngredients = ingredients.filter((_, i) => i !== index)
      onIngredientsChange(updatedIngredients)
    }
  }

  const handleAddIngredient = () => {
    if (newIngredientName.trim() && newIngredientQuantity.trim() && onIngredientsChange) {
      const newIngredient: DetectedIngredient = {
        name: newIngredientName.trim(),
        quantity: newIngredientQuantity.trim(),
        confidence: 1.0, // Manual additions are 100% confident
      }
      onIngredientsChange([...ingredients, newIngredient])
      setNewIngredientName("")
      setNewIngredientQuantity("")
      setShowAddForm(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Your Ingredients ({ingredients.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Ingredient
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <h4 className="font-medium text-sm">Add New Ingredient</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Ingredient name"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddIngredient)}
              />
              <Input
                placeholder="Quantity (e.g., 2 cups)"
                value={newIngredientQuantity}
                onChange={(e) => setNewIngredientQuantity(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleAddIngredient)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddIngredient}
                disabled={!newIngredientName.trim() || !newIngredientQuantity.trim()}
              >
                <Check className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg group">
              {editingIndex === index ? (
                // Edit mode
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSaveEdit)}
                    className="h-8"
                  />
                  <Input
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSaveEdit)}
                    className="h-8"
                  />
                </div>
              ) : (
                // Display mode
                <div className="flex-1">
                  <h4 className="font-medium capitalize">{ingredient.name}</h4>
                  <p className="text-sm text-muted-foreground">{ingredient.quantity}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingIndex === index ? (
                  // Edit mode buttons
                  <>
                    <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                ) : (
                  // Display mode buttons
                  <>
                    <Badge variant={ingredient.confidence > 0.8 ? "default" : "secondary"} className="text-xs">
                      {Math.round(ingredient.confidence * 100)}%
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(index)}
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(index)}
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {ingredients.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground text-center">
              Click edit to modify ingredients or add new ones manually
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

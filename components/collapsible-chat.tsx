"use client"

import { useState } from "react"
import { MessageCircle, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatInterface } from "@/components/chat-interface"
import { useLayout } from "@/components/dynamic-layout-provider"
import { cn } from "@/lib/utils"

interface CollapsibleChatProps {
  onRecipeRequest: (message: string) => void
  currentRecipes?: any[]
  currentIngredients?: any[]
}

export function CollapsibleChat({ onRecipeRequest, currentRecipes, currentIngredients }: CollapsibleChatProps) {
  const { layoutState, toggleChatMinimized } = useLayout()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
    if (!isExpanded) {
      toggleChatMinimized()
    }
  }

  // Minimized chat button
  if (layoutState.isChatMinimized && !isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleToggleExpanded}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  // Full chat interface
  return (
    <div
      className={cn(
        "transition-all duration-500 ease-in-out",
        layoutState.focusMode === "recipes" ? "xl:col-span-1" : "xl:col-span-1",
        isExpanded && layoutState.isChatMinimized ? "fixed bottom-6 right-6 z-50 w-full max-w-md max-h-[80vh]" : "",
      )}
    >
      <Card className={cn("h-full", isExpanded && layoutState.isChatMinimized ? "h-[80vh]" : "min-h-[600px]")}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>Assistant</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isExpanded && layoutState.isChatMinimized && (
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
              {!layoutState.isChatMinimized && (
                <Button variant="ghost" size="sm" onClick={toggleChatMinimized}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Ask questions about recipes, cooking techniques, or ingredient substitutions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 h-full">
          <div
            className={cn(
              "h-[calc(100%-120px)]",
              isExpanded && layoutState.isChatMinimized ? "h-[calc(80vh-200px)]" : "",
            )}
          >
            <ChatInterface
              onRecipeRequest={onRecipeRequest}
              currentRecipes={currentRecipes}
              currentIngredients={currentIngredients}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

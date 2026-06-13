"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type WorkflowStep = "upload" | "ingredients" | "recipes" | "chat"

export interface LayoutState {
  currentStep: WorkflowStep
  isChatMinimized: boolean
  showIngredients: boolean
  showUpload: boolean
  showRecipes: boolean
  focusMode: "upload" | "ingredients" | "recipes" | "balanced"
}

interface LayoutContextType {
  layoutState: LayoutState
  setCurrentStep: (step: WorkflowStep) => void
  toggleChatMinimized: () => void
  setFocusMode: (mode: LayoutState["focusMode"]) => void
  resetLayout: () => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function DynamicLayoutProvider({ children }: { children: ReactNode }) {
  const [layoutState, setLayoutState] = useState<LayoutState>({
    currentStep: "upload",
    isChatMinimized: true,
    showIngredients: false,
    showUpload: true,
    showRecipes: false,
    focusMode: "upload",
  })

  const setCurrentStep = (step: WorkflowStep) => {
    setLayoutState((prev) => {
      const newState = { ...prev, currentStep: step }

      // Update layout based on workflow step
      switch (step) {
        case "upload":
          return {
            ...newState,
            isChatMinimized: true,
            showIngredients: false,
            showUpload: true,
            showRecipes: false,
            focusMode: "upload",
          }

        case "ingredients":
          return {
            ...newState,
            isChatMinimized: true,
            showIngredients: true,
            showUpload: true, // Keep visible but minimized
            showRecipes: false,
            focusMode: "ingredients",
          }

        case "recipes":
          return {
            ...newState,
            isChatMinimized: false,
            showIngredients: false, // Hide ingredients when recipes are shown
            showUpload: false, // Hide upload when recipes are shown
            showRecipes: true,
            focusMode: "recipes",
          }

        case "chat":
          return {
            ...newState,
            isChatMinimized: false,
            focusMode: "balanced",
          }

        default:
          return newState
      }
    })
  }

  const toggleChatMinimized = () => {
    setLayoutState((prev) => ({
      ...prev,
      isChatMinimized: !prev.isChatMinimized,
    }))
  }

  const setFocusMode = (mode: LayoutState["focusMode"]) => {
    setLayoutState((prev) => ({
      ...prev,
      focusMode: mode,
    }))
  }

  const resetLayout = () => {
    setLayoutState({
      currentStep: "upload",
      isChatMinimized: true,
      showIngredients: false,
      showUpload: true,
      showRecipes: false,
      focusMode: "upload",
    })
  }

  return (
    <LayoutContext.Provider
      value={{
        layoutState,
        setCurrentStep,
        toggleChatMinimized,
        setFocusMode,
        resetLayout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}

export function useLayout() {
  const context = useContext(LayoutContext)
  if (context === undefined) {
    throw new Error("useLayout must be used within a DynamicLayoutProvider")
  }
  return context
}

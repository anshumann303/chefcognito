"use client"
import { useState, useRef, useEffect } from "react"
import type React from "react"

import { Send, Bot, User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  type?: "recipe_request" | "recipe_query" | "general"
}

interface ChatInterfaceProps {
  sessionId?: string
  onRecipeRequest?: (message: string) => void
  currentRecipes?: any[]
  currentIngredients?: any[]
}

export function ChatInterface({
  sessionId: initialSessionId,
  onRecipeRequest,
  currentRecipes = [],
  currentIngredients = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(initialSessionId || uuidv4())
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Add welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm your AI cooking assistant. I can help you with recipe questions, cooking tips, ingredient substitutions, and personalized suggestions based on your current recipes and ingredients. What would you like to know?",
        timestamp: new Date(),
        type: "general",
      },
    ])
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const messageContent = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
          requestType: "general",
          currentRecipes: currentRecipes.length > 0 ? currentRecipes : null,
          currentIngredients: currentIngredients.length > 0 ? currentIngredients : null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const data = await response.json()

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        type: data.type || "general",
      }

      setMessages((prev) => [...prev, assistantMessage])

      if ((data.type === "recipe_request" || messageContent.toLowerCase().includes("recipe")) && onRecipeRequest) {
        onRecipeRequest(messageContent)
      }
    } catch (error) {
      console.error("Error sending message:", error)

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: "I'm sorry, I encountered an error processing your message. Please try again.",
        timestamp: new Date(),
        type: "general",
      }
      setMessages((prev) => [...prev, errorMessage])

      toast({
        title: "Error sending message",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="flex-shrink-0">
                  {message.role === "user" ? (
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div
                  className={`rounded-lg p-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted text-foreground rounded-lg p-3 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              currentRecipes.length > 0
                ? "Ask about your recipes, cooking tips, or ingredients..."
                : "Ask me about recipes, cooking tips, or ingredients..."
            }
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {(currentRecipes.length > 0 || currentIngredients.length > 0) && (
          <div className="mt-2 text-xs text-muted-foreground">
            Context: {currentIngredients.length > 0 && `${currentIngredients.length} ingredients`}
            {currentRecipes.length > 0 && currentIngredients.length > 0 && ", "}
            {currentRecipes.length > 0 && `${currentRecipes.length} recipes`}
          </div>
        )}
      </div>
    </div>
  )
}

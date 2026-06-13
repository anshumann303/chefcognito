"use client"
import { useState, useCallback, useRef } from "react"
import type React from "react"

import { Camera, Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface DetectedIngredient {
  name: string
  quantity: string
  confidence: number
}

interface ImageUploadProps {
  onIngredientsDetected: (ingredients: DetectedIngredient[]) => void
}

export function ImageUpload({ onIngredientsDetected }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((file) => file.type.startsWith("image/"))

      if (imageFile) {
        processImage(imageFile)
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, etc.)",
          variant: "destructive",
        })
      }
    },
    [toast],
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }, [])

  const processImage = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setStatusMessage("Starting...")

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload with SSE
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("/api/detect-ingredients", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to process image")
      }

      const reader2 = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader2) {
        while (true) {
          const { done, value } = await reader2.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))

                setStatusMessage(data.step)
                setUploadProgress(data.progress)

                if (data.done) {
                  if (data.ingredients) {
                    onIngredientsDetected(data.ingredients)
                    toast({
                      title: "Ingredients detected!",
                      description: `Found ${data.ingredients.length} ingredients in your photo.`,
                    })
                  } else if (data.error) {
                    throw new Error(data.error)
                  }
                }
              } catch (parseError) {
                console.error("Error parsing SSE data:", parseError)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing image:", error)
      toast({
        title: "Error processing image",
        description: "Please try again with a different image.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setStatusMessage("")
      }, 2000)
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {selectedImage ? (
          <div className="space-y-4">
            <div className="relative">
              <Image
                src={selectedImage || "/placeholder.svg"}
                alt="Uploaded ingredients"
                width={400}
                height={300}
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={clearImage}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">{statusMessage}</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Ingredient Photo</h3>
            <p className="text-muted-foreground mb-4">Drag and drop an image or click to browse</p>
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              Choose Photo
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

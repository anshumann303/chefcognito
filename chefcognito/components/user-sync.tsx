"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect } from "react"

export function UserSync() {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && user) {
        try {
          await fetch("/api/users/sync", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: user.primaryEmailAddress?.emailAddress,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
            }),
          })
        } catch (error) {
          console.error("Failed to sync user:", error)
        }
      }
    }

    syncUser()
  }, [user, isLoaded])

  return null
}

"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle({ variant = "outline", size = "icon" }: { variant?: "outline" | "ghost", size?: "default" | "sm" | "lg" | "icon" }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className="w-9 h-9 opacity-0"
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={toggleTheme}
      className="w-9 h-9 transition-colors duration-200 border-zinc-700 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 focus:ring-0"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
} 
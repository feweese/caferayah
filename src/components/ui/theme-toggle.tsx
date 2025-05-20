"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Moon, Sun, Monitor } from "lucide-react"

export function ThemeToggle({ variant = "outline", size = "icon" }: { variant?: "outline" | "ghost", size?: "default" | "sm" | "lg" | "icon" }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect only runs on the client, so we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className="w-9 h-9 transition-colors duration-200 border-zinc-700 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 focus:ring-0"
          aria-label="Toggle theme"
        >
          {theme === "light" && <Sun className="h-4 w-4" />}
          {theme === "dark" && <Moon className="h-4 w-4" />}
          {(theme === "system" || !theme) && <Monitor className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
        align="end"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer flex items-center"
        >
          <Sun className="mr-2 h-4 w-4 text-amber-500" />
          <span>Light</span>
          {theme === "light" && (
            <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-1.5 py-0.5 rounded-sm">
              Active
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer flex items-center"
        >
          <Moon className="mr-2 h-4 w-4 text-blue-500" />
          <span>Dark</span>
          {theme === "dark" && (
            <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-1.5 py-0.5 rounded-sm">
              Active
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 cursor-pointer flex items-center"
        >
          <Monitor className="mr-2 h-4 w-4 text-gray-500" />
          <span>System</span>
          {(theme === "system" || !theme) && (
            <span className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-1.5 py-0.5 rounded-sm">
              Active
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 
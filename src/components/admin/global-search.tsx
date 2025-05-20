"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { 
  Search, 
  Package, 
  User, 
  ShoppingBag, 
  Star, 
  Loader2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Command as CommandIcon,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { useAdminSearch, SearchResult } from "@/hooks/use-admin-search";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results,
    isLoading,
    error
  } = useAdminSearch({
    enabled: open,
    limit: 10,
    debounceTime: 100
  });

  // Debug log for search state
  useEffect(() => {
    if (open) {
      console.log("Search query:", searchQuery);
      console.log("Results:", results);
      console.log("Is loading:", isLoading);
      console.log("Error:", error);
    }
  }, [searchQuery, results, isLoading, error, open]);

  // Load recent searches from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin-recent-searches");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.slice(0, 4));
          }
        } catch (e) {
          console.error("Failed to parse recent searches:", e);
        }
      }
    }
  }, []);

  // Save recent searches to local storage
  const saveSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    
    setRecentSearches((prev) => {
      const updated = [query, ...prev.filter((item) => item !== query)].slice(0, 4);
      if (typeof window !== "undefined") {
        localStorage.setItem("admin-recent-searches", JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [open, setSearchQuery]);

  // Add keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      
      if (open && e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Handle navigation
  const handleSelect = useCallback((url: string, query: string) => {
    saveSearch(query);
    onOpenChange(false);
    router.push(url);
  }, [router, onOpenChange, saveSearch]);

  // Handle special keys: Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleSelect(results[0].url, searchQuery);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, searchQuery, handleSelect]);

  // For direct tracking of search state
  const hasSearchResults = results && results.length > 0;
  const showEmptyState = !isLoading && searchQuery && !hasSearchResults && !error;

  if (!open) return null;

  // Function to render result icon
  const renderResultIcon = (result: SearchResult) => {
    if (result.type === "product") {
      return result.image ? (
        <div className="relative h-8 w-8 overflow-hidden rounded-md">
          <Image
            src={result.image}
            alt={result.title}
            fill
            className="object-cover bg-white"
          />
        </div>
      ) : <Package className="h-5 w-5 text-blue-500" />;
    }
    
    if (result.type === "user") {
      return result.image ? (
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={result.image}
            alt={result.title}
          />
          <AvatarFallback className="bg-green-500/10 text-green-500">
            {result.title.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : <User className="h-5 w-5 text-green-500" />;
    }
    
    if (result.type === "order") {
      return <ShoppingBag className="h-5 w-5 text-amber-500" />;
    }
    
    if (result.type === "review") {
      return <Star className="h-5 w-5 text-purple-500" />;
    }
    
    return <Package className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/80 backdrop-blur-sm pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        className="overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in zoom-in-90 fade-in-0 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => {
                console.log("Input value changed:", e.target.value);
                setSearchQuery(e.target.value);
              }}
              className="flex h-12 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Search across products, users, orders..."
            />
            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
            {searchQuery.length > 0 && !isLoading && (
              <button 
                onClick={() => setSearchQuery("")}
                className="ml-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto overflow-x-hidden overscroll-contain p-2">
            {/* Keyboard shortcut info */}
            {!searchQuery && !isLoading && (
              <div className="mt-0 mb-2 px-2 text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>Search admin sections or filter by type: <span className="font-mono">@product</span>, <span className="font-mono">@user</span>, <span className="font-mono">@order</span></span>
                </div>
                <div className="hidden sm:flex items-center gap-1">
                  <span>Press</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <CommandIcon className="h-3 w-3" />
                  </kbd>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    K
                  </kbd>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="py-6 text-center">
                <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Error: {error}</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                  }}
                  className="mt-4 text-xs text-primary hover:underline"
                >
                  Clear search and try again
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Searching admin panel...</p>
              </div>
            )}

            {/* Recent searches */}
            {!isLoading && !searchQuery && recentSearches.length > 0 && (
              <div>
                <h4 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Recent Searches</h4>
                {recentSearches.map((query) => (
                  <button
                    key={query}
                    onClick={() => setSearchQuery(query)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent"
                  >
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span>{query}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Navigation */}
            {!isLoading && !searchQuery && (
              <div>
                <h4 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Quick Navigation</h4>
                <button
                  onClick={() => handleSelect("/admin", "Dashboard")}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <CommandIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Dashboard</span>
                    <span className="text-xs text-muted-foreground">Overview and quick stats</span>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect("/admin/products", "Products")}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                    <Package className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Products</span>
                    <span className="text-xs text-muted-foreground">Manage your product inventory</span>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect("/admin/orders", "Orders")}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                    <ShoppingBag className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Orders</span>
                    <span className="text-xs text-muted-foreground">Manage customer orders</span>
                  </div>
                </button>
                <button
                  onClick={() => handleSelect("/admin/users", "Users")}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-accent"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                    <User className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Users</span>
                    <span className="text-xs text-muted-foreground">Manage user accounts</span>
                  </div>
                </button>
              </div>
            )}

            {/* Search Results */}
            {hasSearchResults && (
              <div>
                <h4 className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Search Results</h4>
                <div className="space-y-1">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result.url, searchQuery)}
                      className="flex w-full items-center gap-4 px-4 py-2 text-sm rounded-md cursor-pointer hover:bg-accent"
                    >
                      {/* Icon by type */}
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                        result.type === "product" ? "bg-blue-500/10" : 
                        result.type === "user" ? "bg-green-500/10" : 
                        result.type === "order" ? "bg-amber-500/10" : 
                        "bg-purple-500/10"
                      )}>
                        {renderResultIcon(result)}
                      </div>

                      {/* Content */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium truncate">{result.title}</span>
                          {result.status && result.type !== "product" && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                              {result.status}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{result.description}</span>
                        
                        {/* Badges */}
                        {result.badges && result.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.badges.map((badge, index) => (
                              badge && (
                                <Badge 
                                  key={index} 
                                  variant="outline"
                                  className="text-[10px] px-1 py-0 h-auto bg-zinc-100/50 text-zinc-800 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-200 dark:border-zinc-700"
                                >
                                  {badge.text}
                                </Badge>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Action indicator */}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {showEmptyState && (
              <div className="py-6 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-30" />
                <h3 className="text-lg font-medium">No results found</h3>
                <p className="text-sm text-muted-foreground">
                  Try a different search term or check your spelling
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Press</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                ↵
              </kbd>
              <span>to select</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Press</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                ESC
              </kbd>
              <span>to close</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
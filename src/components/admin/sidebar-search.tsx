"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAdminSearch, SearchResult } from "@/hooks/use-admin-search";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

export function SidebarSearch() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const {
    query,
    setQuery,
    results,
    isLoading,
  } = useAdminSearch({
    enabled: isExpanded,
    limit: 5
  });

  // Handle opening the search
  const openSearch = () => {
    setIsExpanded(true);
    setShowResults(true);
  };

  // Handle closing the search
  const closeSearch = () => {
    setIsExpanded(false);
    setShowResults(false);
    setQuery("");
  };

  // Navigate to a result
  const navigateTo = (result: SearchResult) => {
    setShowResults(false);
    setIsExpanded(false);
    setQuery("");
    router.push(result.url);
  };

  // Get the appropriate icon for a result type
  const getResultTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <span className="bg-blue-100 text-blue-600 h-2 w-2 rounded-full"></span>;
      case "user":
        return <span className="bg-green-100 text-green-600 h-2 w-2 rounded-full"></span>;
      case "order":
        return <span className="bg-amber-100 text-amber-600 h-2 w-2 rounded-full"></span>;
      case "review":
        return <span className="bg-purple-100 text-purple-600 h-2 w-2 rounded-full"></span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative mb-2 px-3">
      {/* Collapsed state */}
      {!isExpanded ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={openSearch}
        >
          <Search className="h-4 w-4 mr-2" />
          <span>Quick Search</span>
        </Button>
      ) : (
        /* Expanded state */
        <div className="bg-zinc-800 rounded-md p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 bg-zinc-900 border-zinc-700 text-sm focus-visible:ring-primary/40"
              placeholder="Search..."
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-white"
              onClick={closeSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Results dropdown */}
          {showResults && (
            <div className="absolute left-0 right-0 mt-1 px-3 z-50">
              <div className="bg-zinc-900 border border-zinc-700 rounded-md shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-3 text-center text-zinc-400 text-xs">
                    Searching...
                  </div>
                ) : results.length > 0 ? (
                  <div className="py-1">
                    {results.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-800 flex items-center gap-2 text-sm text-zinc-300"
                        onClick={() => navigateTo(result)}
                      >
                        {getResultTypeIcon(result.type)}
                        <div className="flex-1 truncate">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-xs text-zinc-500 truncate">{result.description}</div>
                        </div>
                        <ArrowRight className="h-3 w-3 text-zinc-500" />
                      </button>
                    ))}
                    <div className="px-3 py-1.5 text-xs text-center border-t border-zinc-800 text-zinc-500">
                      Press Cmd+K for full search
                    </div>
                  </div>
                ) : query.length > 1 ? (
                  <div className="p-3 text-center text-zinc-400 text-xs">
                    No results found
                  </div>
                ) : (
                  <div className="p-3 text-center text-zinc-400 text-xs">
                    Type to search
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
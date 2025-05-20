import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export type SearchResultType = 'product' | 'user' | 'order' | 'review' | 'all';

export type SearchResult = {
  id: string;
  type: "product" | "user" | "order" | "review";
  title: string;
  description: string;
  url: string;
  image?: string | null;
  status?: string;
  statusColor?: string;
  badges?: Array<{ text: string; color: string } | null>;
};

interface UseAdminSearchProps {
  initialQuery?: string;
  type?: SearchResultType;
  limit?: number;
  enabled?: boolean;
  debounceTime?: number;
}

export function useAdminSearch({
  initialQuery = '',
  type = 'all',
  limit = 10,
  enabled = true,
  debounceTime = 150,
}: UseAdminSearchProps = {}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, debounceTime);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !enabled) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}&type=${type}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [type, limit, enabled]);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search,
  };
} 
"use client";

/**
 * Search Input Component
 * 
 * Provides a search input with suggestions for discovering public templates.
 * Supports debounced search and keyboard navigation.
 * 
 * Requirements: 8.1, 8.2
 */

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2 } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
  type: "query" | "category" | "tag";
  value: string;
  label: string;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  suggestions = [],
  onSuggestionSelect,
  isLoading = false,
  placeholder = "Search templates...",
  className = "",
}: SearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
    setShowSuggestions(newValue.trim().length > 0);
  }, [onChange]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      const suggestion = suggestions[selectedIndex];
      if (suggestion) onSuggestionSelect?.(suggestion);
    } else {
      onSearch(value);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [value, onSearch, suggestions, selectedIndex, onSuggestionSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch(value);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          const suggestion = suggestions[selectedIndex];
          if (suggestion) onSuggestionSelect?.(suggestion);
          setShowSuggestions(false);
          setSelectedIndex(-1);
        } else {
          onSearch(value);
          setShowSuggestions(false);
        }
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, onSuggestionSelect, onSearch, value]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, [onSuggestionSelect]);

  const handleClear = useCallback(() => {
    onChange("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSuggestionBadge = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "category":
        return (
          <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
            Category
          </span>
        );
      case "tag":
        return (
          <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
            Tag
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
          </div>
          <Input
            ref={inputRef}
            id="search-input"
            name="search"
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => value.trim() && setShowSuggestions(true)}
            placeholder={placeholder}
            className="pl-14 pr-28 h-14 text-base rounded-xl border-2 focus:border-primary/50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {value && !isLoading && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" className="h-9 rounded-xl">
              Search
            </Button>
          </div>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-2 bg-card/95 backdrop-blur-md border-2 rounded-xl shadow-xl overflow-hidden"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.value}`}
              type="button"
              className={cn(
                "w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors",
                index === selectedIndex ? "bg-primary/10" : "hover:bg-muted"
              )}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="flex items-center gap-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                {suggestion.label}
              </span>
              {getSuggestionBadge(suggestion.type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

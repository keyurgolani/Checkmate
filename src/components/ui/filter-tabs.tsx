"use client";

/**
 * Filter Tabs Component
 * 
 * Consistent filter tabs with pill design and counts.
 * Follows the dashboard's design language.
 */

import { cn } from "@/lib/utils";

interface FilterTab<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

export function FilterTabs<T extends string>({ 
  tabs, 
  activeTab, 
  onTabChange,
  className 
}: FilterTabsProps<T>) {
  return (
    <div className={cn(
      "flex items-center gap-1 bg-muted/50 rounded-xl p-1 backdrop-blur-sm overflow-x-auto",
      className
    )}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
            activeTab === tab.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={activeTab === tab.value}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              activeTab === tab.value
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

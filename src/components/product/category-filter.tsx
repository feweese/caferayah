"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProductCategory } from "@/types/types";
import { cn } from "@/lib/utils";

const categories = [
  { value: undefined, label: "All Products" },
  { value: ProductCategory.COFFEE, label: "Coffee" },
  { value: ProductCategory.BARISTA_DRINKS, label: "Barista Drinks" },
  { value: ProductCategory.MILK_TEA, label: "Milk Tea" },
  { value: ProductCategory.MILK_SERIES, label: "Milk Series" },
  { value: ProductCategory.MATCHA_SERIES, label: "Matcha Series" },
  { value: ProductCategory.SODA_SERIES, label: "Soda Series" },
];

interface CategoryFilterProps {
  selectedCategory?: ProductCategory;
}

export function CategoryFilter({ selectedCategory }: CategoryFilterProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap justify-center gap-2 w-full max-w-4xl mx-auto">
      <div className="w-full bg-card rounded-xl shadow-sm border p-4 mb-2">
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 flex-nowrap min-w-max mx-auto justify-center">
            {categories.map((category) => {
              const isActive = 
                (category.value === undefined && !selectedCategory) || 
                category.value === selectedCategory;
              
              const href = category.value
                ? `${pathname}?category=${category.value}`
                : pathname;

              return (
                <Link
                  key={category.label}
                  href={href}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-md whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                      : "bg-muted hover:bg-primary/10 text-muted-foreground"
                  )}
                >
                  {category.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 
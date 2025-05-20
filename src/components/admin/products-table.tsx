"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Star, StarOff, Search, Filter, Package, ShoppingBag, Tag, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

// Featured toggle button component
function FeaturedToggle({ product }) {
  const [isFeatured, setIsFeatured] = useState(product.featured);
  const [isLoading, setIsLoading] = useState(false);
  
  const toggleFeatured = async () => {
    setIsLoading(true);
    try {
      const newFeaturedState = !isFeatured;
      
      const response = await fetch(`/api/admin/products/${product.id}/featured?featured=${newFeaturedState}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update featured status');
      }
      
      setIsFeatured(newFeaturedState);
      toast(newFeaturedState 
        ? "Product featured" 
        : "Product unfeatured", {
        description: newFeaturedState 
          ? `${product.name} will now appear in featured products` 
          : `${product.name} removed from featured products`,
      });
    } catch (error) {
      console.error(error);
      toast("Error", {
        description: "Failed to update featured status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={toggleFeatured}
      disabled={isLoading}
      variant="ghost" 
      size="sm"
      className={isFeatured 
        ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors" 
        : "text-muted-foreground hover:bg-slate-50 transition-colors"}
    >
      {isFeatured ? (
        <>
          <Star className="h-4 w-4 mr-1" fill="currentColor" />
          Featured
        </>
      ) : (
        <>
          <StarOff className="h-4 w-4 mr-1" />
          Not Featured
        </>
      )}
    </Button>
  );
}

export function ProductsTable({ products }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filteredProducts, setFilteredProducts] = useState(products);
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isFiltering, setIsFiltering] = useState(false);

  // Extract unique categories for the filter
  const categories = Array.from(
    new Set(products.map((product) => product.formattedCategory))
  ).sort();

  // Handle sorting
  const handleSort = (field) => {
    const newDirection = 
      field === sortField && sortDirection === "asc" ? "desc" : "asc";
    
    setSortField(field);
    setSortDirection(newDirection);
  };

  // Apply filters and sorting whenever dependencies change
  useEffect(() => {
    setIsFiltering(true);
    
    const filterTimeout = setTimeout(() => {
      let result = [...products];

      // Apply search filter
      if (searchTerm) {
        const lowercasedSearch = searchTerm.toLowerCase();
        result = result.filter(
          (product) => product.name.toLowerCase().includes(lowercasedSearch)
        );
      }

      // Apply category filter
      if (categoryFilter && categoryFilter !== 'all') {
        result = result.filter(
          (product) => product.formattedCategory === categoryFilter
        );
      }

      // Apply sorting
      result.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortField) {
          case "name":
            valueA = a.name;
            valueB = b.name;
            break;
          case "price":
            valueA = a.basePrice;
            valueB = b.basePrice;
            break;
          case "added":
            valueA = new Date(a.createdAt);
            valueB = new Date(b.createdAt);
            break;
          default:
            valueA = a.name;
            valueB = b.name;
        }

        if (sortDirection === "asc") {
          return valueA > valueB ? 1 : -1;
        } else {
          return valueA < valueB ? 1 : -1;
        }
      });

      setFilteredProducts(result);
      setIsFiltering(false);
    }, 200); // Small delay for better UX

    return () => clearTimeout(filterTimeout);
  }, [products, searchTerm, categoryFilter, sortField, sortDirection]);

  const filterSection = (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Search input */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-xs">
          Search Products
        </Label>
        <Input
          id="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name..."
          className="max-w-sm"
        />
      </div>

      {/* Category filter */}
      <div className="space-y-2">
        <Label htmlFor="category" className="text-xs">
          Filter by Category
        </Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product count display */}
      <div className="space-y-2 flex flex-col justify-end">
        <div className="text-xs text-muted-foreground">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters and controls */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center">
          <Filter className="h-4 w-4 mr-2" />
          Product Filters
        </h3>
        
        {filterSection}
      </div>

      {/* Products table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      Name
                      {sortField === "name" && (
                        <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""} transition-transform`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center">
                      Price
                      {sortField === "price" && (
                        <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""} transition-transform`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort("added")}
                  >
                    <div className="flex items-center">
                      Added
                      {sortField === "added" && (
                        <ArrowUpDown className={`ml-1 h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""} transition-transform`} />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFiltering ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin mr-2">
                          <svg 
                            className="h-5 w-5 text-primary" 
                            xmlns="http://www.w3.org/2000/svg" 
                            fill="none" 
                            viewBox="0 0 24 24"
                          >
                            <circle 
                              className="opacity-25" 
                              cx="12" 
                              cy="12" 
                              r="10" 
                              stroke="currentColor" 
                              strokeWidth="4"
                            ></circle>
                            <path 
                              className="opacity-75" 
                              fill="currentColor" 
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                        <span className="text-sm text-muted-foreground">Filtering products...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md overflow-hidden border bg-muted/50 flex-shrink-0 flex items-center justify-center">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center">
                            {product.featured && (
                              <Star className="h-4 w-4 text-amber-500 mr-1.5" fill="currentColor" />
                            )}
                            <span className={!product.inStock ? "text-muted-foreground" : ""}>
                              {product.name}
                            </span>
                            {!product.inStock && (
                              <Badge variant="outline" className="ml-2 text-xs bg-red-50 text-red-700 border-red-200">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {product.formattedCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">₱{product.basePrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(product.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <FeaturedToggle product={product} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Link href={`/admin/products/${product.id}`}>
                            <Button variant="outline" size="sm" className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                              <Package className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                          </Link>
                          <Link href={`/menu/${product.id}`} target="_blank">
                            <Button variant="ghost" size="sm" className="hover:bg-green-50 hover:text-green-600 transition-colors">
                              <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No products found</p>
            <div className="mt-4">
              <Link href="/admin/products/new">
                <Button>Add Your First Product</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
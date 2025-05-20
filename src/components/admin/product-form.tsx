"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductCategory, Temperature, Size } from "@/generated/prisma";
import { Loader2, Plus, X, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

// Define the product schema
const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  category: z.enum(["COFFEE", "BARISTA_DRINKS", "MILK_TEA", "MILK_SERIES", "MATCHA_SERIES", "SODA_SERIES"]),
  basePrice: z.coerce.number().min(1, { message: "Base price must be at least 1" }),
  images: z.array(z.string()).default([]),
  temperatures: z.array(z.enum(["HOT", "ICED", "BOTH"])),
  sizes: z.array(z.enum(["SIXTEEN_OZ", "TWENTY_TWO_OZ"])),
  featured: z.boolean().default(false),
  // Addons are handled separately
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Addon {
  id?: string;
  name: string;
  price: number;
}

interface SizePrice {
  size: Size;
  price: number;
  label: string;
}

// Define the props for the component
interface ProductFormProps {
  product?: {
    id: string;
    name: string;
    description: string;
    category: string;
    basePrice: number;
    images: string[];
    temperatures: string[];
    sizes: string[];
    featured?: boolean;
    addons: Array<{
      id: string;
      name: string;
      price: number;
    }>;
    sizePrices?: Record<string, number>;
  };
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addons, setAddons] = useState<Addon[]>(
    product?.addons?.length ? product.addons : []
  );
  const [newAddon, setNewAddon] = useState<Addon>({ name: "", price: 0 });
  const [productImages, setProductImages] = useState<string[]>(
    product?.images?.length ? product.images : []
  );
  const [imageLoading, setImageLoading] = useState(false);
  
  // State for size-specific prices
  const [sizePrices, setSizePrices] = useState<Record<string, number>>(() => {
    // Initialize with the product's size prices if available
    if (product?.sizePrices) {
      console.log("Initializing with product size prices:", product.sizePrices);
      // Make sure to convert any potential string values to numbers
      const initialSizePrices: Record<string, number> = {};
      Object.entries(product.sizePrices).forEach(([size, price]) => {
        initialSizePrices[size] = Number(price);
        console.log(`  - Initialized ${size} price: ${initialSizePrices[size]}`);
      });
      return initialSizePrices;
    } else if (product) {
      // If product exists but no sizePrices, initialize with basePrice for 16oz
      return {
        SIXTEEN_OZ: product.basePrice
      };
    }
    
    // Otherwise start with an empty object
    console.log("No product size prices found, starting with empty object");
    return {};
  });
  
  // Debug function to trace size price state
  useEffect(() => {
    console.log("Size prices updated:", sizePrices);
    // Log each specific size price for clarity
    Object.entries(sizePrices).forEach(([size, price]) => {
      console.log(`  - ${size} price: ${price}`);
    });
  }, [sizePrices]);
  
  // Initialize form state
  const [isFirstRender, setIsFirstRender] = useState(true);

  // Initial form load - log the product data to ensure it's correct
  useEffect(() => {
    if (product && isFirstRender) {
      console.log("Loading existing product data:", product);
      console.log("Product sizePrices:", product.sizePrices);
      setIsFirstRender(false);
    }
  }, [product, isFirstRender]);
  
  // Initialize the form with default values or existing product data
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category as ProductCategory,
      basePrice: product.basePrice,
      images: product.images,
      temperatures: product.temperatures as Temperature[],
      sizes: product.sizes as Size[],
      featured: product.featured || false,
    } : {
      name: "",
      description: "",
      category: "COFFEE" as ProductCategory,
      basePrice: 100,
      images: [],
      temperatures: ["ICED" as Temperature],
      sizes: ["SIXTEEN_OZ" as Size],
      featured: false,
    },
  });
  
  // Update temperature selection when "BOTH" is selected/deselected
  useEffect(() => {
    const temperatures = form.watch("temperatures");
    
    if (temperatures.includes("BOTH")) {
      // If "BOTH" is selected, make sure both "HOT" and "ICED" are selected
      if (!temperatures.includes("HOT") || !temperatures.includes("ICED")) {
        const updatedTemperatures = [...temperatures];
        if (!temperatures.includes("HOT")) updatedTemperatures.push("HOT");
        if (!temperatures.includes("ICED")) updatedTemperatures.push("ICED");
        form.setValue("temperatures", updatedTemperatures as Temperature[]);
      }
    } else if (temperatures.includes("HOT") && temperatures.includes("ICED")) {
      // If both "HOT" and "ICED" are selected, add "BOTH"
      form.setValue("temperatures", [...temperatures, "BOTH"] as Temperature[]);
    }
  }, [form.watch("temperatures")]);
  
  // Update 16oz price when base price changes
  useEffect(() => {
    const basePrice = form.watch("basePrice");
    
    // Always set SIXTEEN_OZ price to match base price
    setSizePrices(prevSizePrices => ({
      ...prevSizePrices,
      SIXTEEN_OZ: basePrice
    }));
    
  }, [form.watch("basePrice")]);
  
  // Initialize size prices when sizes change
  useEffect(() => {
    const selectedSizes = form.watch("sizes");
    const basePrice = form.watch("basePrice");
    
    console.log("Sizes changed. Current sizes:", selectedSizes);
    console.log("Current sizePrices:", sizePrices);
    
    // Create a new size prices object
    const newSizePrices = { ...sizePrices };
    
    // Always ensure 16oz is set to base price
    newSizePrices.SIXTEEN_OZ = basePrice;
    
    // Add missing sizes (only initialize if they don't exist yet)
    selectedSizes.forEach(size => {
      if (size === "TWENTY_TWO_OZ" && newSizePrices[size] === undefined) {
        // Default price for 22oz as 120% of base price, but only if not already set
        newSizePrices[size] = Math.round(basePrice * 1.2);
        console.log(`Initializing new TWENTY_TWO_OZ price: ${newSizePrices[size]}`);
      }
    });
    
    // Remove sizes that are no longer selected
    Object.keys(newSizePrices).forEach(size => {
      if (!selectedSizes.includes(size as Size)) {
        delete newSizePrices[size];
        console.log(`Removing price for deselected size: ${size}`);
      }
    });
    
    setSizePrices(newSizePrices);
  }, [form.watch("sizes")]);
  
  // Handle manual change of size prices
  const handleSizePriceChange = (size: string, value: string) => {
    console.log(`Manually updating size ${size} price to: ${value}`);
    
    // Parse the value to ensure it's stored as a number
    const numericValue = value === '' ? 0 : Number(value);
    
    // Create a new sizePrices object with the updated price
    const updatedSizePrices = {
      ...sizePrices,
      [size]: numericValue,
    };
    
    // Update the state with the new object
    setSizePrices(updatedSizePrices);
    console.log('Updated size prices after manual change:', updatedSizePrices);
  };
  
  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // Check file size before uploading
    const file = e.target.files[0];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSizeBytes) {
      const fileSizeMB = Math.round((file.size / (1024 * 1024)) * 100) / 100;
      toast("File too large", {
        description: `Maximum file size is 10MB. Your file is ${fileSizeMB}MB.`,
        variant: "destructive",
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    setImageLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log(`Starting upload for file: ${file.name} (${file.type}, ${Math.round(file.size/1024)}KB)`);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type for FormData
          // Browser will set the correct multipart/form-data with boundary
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      
      console.log(`Upload response status: ${response.status}`);
      
      // Check if response is OK
      if (!response.ok) {
        let errorMessage = 'Failed to upload image';
        let errorData = null;
        
        try {
          // Try to parse error message from JSON response
          const responseText = await response.text();
          console.log(`Error response text: ${responseText}`);
          
          try {
            errorData = JSON.parse(responseText);
            errorMessage = errorData.details || errorData.error || errorMessage;
            console.error("Upload error:", errorData);
          } catch (jsonError) {
            console.error("Response is not valid JSON:", responseText);
            errorMessage = `Server error: ${response.status} - ${responseText.substring(0, 100)}`;
          }
        } catch (parseError) {
          console.error('Failed to read response:', parseError);
          errorMessage = `Server error: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      let data;
      try {
        const responseText = await response.text();
        console.log(`Success response text: ${responseText}`);
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (!data.url) {
        console.error('Response data:', data);
        throw new Error('No image URL returned from server');
      }
      
      const imageUrl = data.url;
      console.log(`Image uploaded successfully, URL: ${imageUrl}`);
      
      // Add the new image URL to the list
      const updatedImages = [...productImages, imageUrl];
      setProductImages(updatedImages);
      form.setValue('images', updatedImages);
      
      toast('Image uploaded', {
        description: 'Image has been successfully uploaded',
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast('Upload failed', {
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setImageLoading(false);
    }
  };
  
  // Remove image
  const handleRemoveImage = (index: number) => {
    const updatedImages = [...productImages];
    updatedImages.splice(index, 1);
    setProductImages(updatedImages);
    form.setValue('images', updatedImages);
  };
  
  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true);
    console.log("Form submission started with data:", data);
    console.log("Current size prices before submission:", sizePrices);
    
    try {
      // Sanitize addons to ensure prices are numbers
      const sanitizedAddons = addons.map(addon => ({
        ...addon,
        price: Number(addon.price) || 0
      }));

      // Prepare final size prices object - use the exact values from state
      const finalSizePrices: Record<string, number> = {};
      
      // Process only the selected sizes
      data.sizes.forEach(size => {
        if (size === "SIXTEEN_OZ") {
          // Always use base price for 16oz
          finalSizePrices[size] = Number(data.basePrice) || 0;
        } else if (size === "TWENTY_TWO_OZ") {
          // For 22oz, use the price from sizePrices state
          // If not set (which shouldn't happen), fall back to 120% of base price
          if (sizePrices[size] !== undefined) {
            finalSizePrices[size] = Number(sizePrices[size]);
          } else {
            finalSizePrices[size] = Math.round((Number(data.basePrice) * 1.2) * 100) / 100;
          }
        }
      });
      
      console.log("Final size prices for submission:", finalSizePrices);

      // Prepare temperatures array
      const temperatures = [] as Temperature[];
      if (data.temperatures.includes("HOT")) temperatures.push("HOT");
      if (data.temperatures.includes("ICED")) temperatures.push("ICED");

      // Prepare sizes array
      const sizes = [] as Size[];
      if (data.sizes.includes("SIXTEEN_OZ")) sizes.push("SIXTEEN_OZ");
      if (data.sizes.includes("TWENTY_TWO_OZ")) sizes.push("TWENTY_TWO_OZ");

      const productData = {
        ...data,
        temperatures,
        sizes,
        sizePricing: finalSizePrices,
        addons: sanitizedAddons,
        images: productImages,
        inStock: true,
      };
      
      console.log("Submitting product data:", JSON.stringify(productData, null, 2));
      
      const url = data.id 
        ? `/api/admin/products/${data.id}` 
        : '/api/admin/products';
      
      const response = await fetch(url, {
        method: data.id ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });
      
      // Log the raw response before parsing
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server response:", errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to save product');
      }
      
      // Get the response data
      const responseData = await response.json();
      console.log("Server response data:", responseData);
      
      toast(data.id ? "Product updated" : "Product created", {
        description: data.id 
          ? `${data.name} has been updated successfully.` 
          : `${data.name} has been added to your catalog.`,
      });
      
      // Redirect back to products list after successful submission
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      console.error('Error saving product:', error);
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Temperature options
  const temperatureOptions = [
    { value: "HOT", label: "Hot" },
    { value: "ICED", label: "Iced" },
    { value: "BOTH", label: "Both" }
  ];

  // Size options
  const sizeOptions = [
    { value: "SIXTEEN_OZ", label: "16oz" },
    { value: "TWENTY_TWO_OZ", label: "22oz" }
  ];
  
  // Add a new addon
  const handleAddAddon = () => {
    if (newAddon.name.trim() === "" || newAddon.price <= 0) {
      toast("Invalid addon", {
        description: "Addon name and price are required",
        variant: "destructive",
      });
      return;
    }
    
    setAddons([...addons, { ...newAddon }]);
    setNewAddon({ name: "", price: 0 });
  };
  
  // Remove an addon
  const handleRemoveAddon = (index: number) => {
    const newAddons = [...addons];
    newAddons.splice(index, 1);
    setAddons(newAddons);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Category field */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="COFFEE">Coffee</SelectItem>
                    <SelectItem value="BARISTA_DRINKS">Barista Drinks</SelectItem>
                    <SelectItem value="MILK_TEA">Milk Tea</SelectItem>
                    <SelectItem value="MILK_SERIES">Milk Series</SelectItem>
                    <SelectItem value="MATCHA_SERIES">Matcha Series</SelectItem>
                    <SelectItem value="SODA_SERIES">Soda Series</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Description field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter product description" 
                  className="min-h-[100px]" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Product Images */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Product Images</h3>
            <p className="text-sm text-muted-foreground">
              Upload images for this product (PNG, JPG, or WEBP format)
            </p>
          </div>
          
          {/* Display current images */}
          {productImages.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
              {productImages.map((imageUrl, index) => (
                <div key={index} className="relative group rounded-md overflow-hidden border aspect-square">
                  <Image
                    src={imageUrl}
                    alt={`Product image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Image upload button */}
          <div className="border rounded-lg p-4 flex flex-col items-center justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div className="mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              className="mb-2"
            >
              {imageLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {imageLoading ? "Uploading..." : "Upload Image"}
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Upload high-quality images to showcase your product. Recommended size: 800x800px.
              <br />
              Max file size: 10MB. Supported formats: PNG, JPG, WEBP.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {/* Base Price field */}
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price (₱)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    step="1" 
                    placeholder="Enter base price" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  This is the default price for the smallest size (16oz)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Temperatures selection */}
        <FormField
          control={form.control}
          name="temperatures"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available Temperatures</FormLabel>
              <div className="flex flex-wrap gap-2">
                {temperatureOptions.map((option) => (
                  <div key={option.value} className="flex items-center">
                    <Checkbox
                      id={`temp-${option.value}`}
                      checked={field.value?.includes(option.value as Temperature)}
                      onCheckedChange={(checked) => {
                        if (option.value === "BOTH") {
                          // If "BOTH" is being selected, add "HOT" and "ICED" as well
                          if (checked) {
                            field.onChange([...new Set([...field.value, "HOT", "ICED", "BOTH"])] as Temperature[]);
                          } else {
                            // If "BOTH" is being deselected, only remove "BOTH"
                            field.onChange(
                              field.value?.filter(
                                (value) => value !== "BOTH"
                              )
                            );
                          }
                        } else {
                          // For "HOT" or "ICED" selection
                          if (checked) {
                            // Add the selected temperature
                            const newValues = [...field.value, option.value as Temperature];
                            // If both HOT and ICED are now selected, add BOTH as well
                            if (newValues.includes("HOT") && newValues.includes("ICED") && !newValues.includes("BOTH")) {
                              newValues.push("BOTH" as Temperature);
                            }
                            field.onChange(newValues);
                          } else {
                            // Remove the deselected temperature and BOTH if present
                            field.onChange(
                              field.value?.filter(
                                (value) => value !== option.value && (option.value === "HOT" || option.value === "ICED" ? value !== "BOTH" : true)
                              )
                            );
                          }
                        }
                      }}
                    />
                    <label
                      htmlFor={`temp-${option.value}`}
                      className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              <FormDescription>
                Select all temperatures available for this product.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Sizes selection with custom pricing */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="sizes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available Sizes</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <Checkbox
                        id={`size-${option.value}`}
                        checked={field.value?.includes(option.value as Size)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? field.onChange([...field.value, option.value as Size])
                            : field.onChange(
                                field.value?.filter(
                                  (value) => value !== option.value
                                )
                              );
                        }}
                      />
                      <label
                        htmlFor={`size-${option.value}`}
                        className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Select all sizes available for this product.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Size-specific pricing */}
          {form.watch("sizes").length > 0 && (
            <div className="mt-4 border rounded-md p-4">
              <h4 className="text-sm font-medium mb-3">Size Pricing</h4>
              <div className="space-y-3">
                {form.watch("sizes").map((size) => {
                  const sizeLabel = sizeOptions.find(opt => opt.value === size)?.label || size;
                  const isBasePrice = size === "SIXTEEN_OZ"; 
                  const price = sizePrices[size] !== undefined ? sizePrices[size] : 
                    (size === "SIXTEEN_OZ" ? form.watch("basePrice") : Math.round(form.watch("basePrice") * 1.2));
                  
                  return (
                    <div key={size} className="grid grid-cols-2 gap-4 items-center">
                      <div className="font-medium">
                        {sizeLabel}
                        {isBasePrice && (
                          <span className="text-xs text-muted-foreground ml-1">(Base Price)</span>
                        )}
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={price}
                          onChange={(e) => {
                            // Convert the value to a number during state update
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleSizePriceChange(size, newValue.toString());
                          }}
                          onBlur={() => {
                            // Force an update on blur to ensure the value is saved
                            const currentPrice = sizePrices[size];
                            console.log(`Size ${size} price on blur: ${currentPrice}`);
                          }}
                          placeholder={`Price for ${sizeLabel}`}
                          className={`w-full ${isBasePrice ? 'bg-gray-50' : ''}`}
                          disabled={isBasePrice} // Disable 16oz since it's always the base price
                        />
                        {size === "TWENTY_TWO_OZ" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter specific price for 22oz size
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <FormDescription className="mt-2">
                Set specific prices for each size. The base price is used for 16oz.
              </FormDescription>
            </div>
          )}
        </div>
        
        {/* Addons management */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Product Add-ons</h3>
            <p className="text-sm text-muted-foreground">
              Add optional extras that customers can add to this product
            </p>
          </div>
          
          {/* List of existing addons */}
          {addons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Add-ons</h4>
              <div className="border rounded-md p-4 space-y-2">
                {addons.map((addon, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{addon.name}</p>
                      <p className="text-sm text-muted-foreground">₱{addon.price}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAddon(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add new addon */}
          <div className="border rounded-md p-4">
            <h4 className="text-sm font-medium mb-2">Add New Add-on</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <FormLabel htmlFor="addon-name">Name</FormLabel>
                <Input
                  id="addon-name"
                  placeholder="Add-on name"
                  value={newAddon.name}
                  onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                />
              </div>
              <div>
                <FormLabel htmlFor="addon-price">Price (₱)</FormLabel>
                <Input
                  id="addon-price"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Add-on price"
                  value={newAddon.price}
                  onChange={(e) => setNewAddon({ ...newAddon, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAddon}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
        
        {/* Featured product checkbox */}
        <FormField
          control={form.control}
          name="featured"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Featured Product</FormLabel>
                <FormDescription>
                  Display this product in the Featured Products section on the homepage
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        {/* Form submission */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/products')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : product ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 
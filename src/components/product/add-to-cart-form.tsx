"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Product, Size, Temperature, Addon } from "@/types/types";
import { useCartStore } from "@/store/cart-store";

const formSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  size: z.string({
    required_error: "Please select a size",
  }),
  temperature: z.string({
    required_error: "Please select a temperature",
  }),
  addons: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddToCartFormProps {
  product: Product;
}

export function AddToCartForm({ product }: AddToCartFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      size: product.sizes[0],
      temperature: product.temperatures[0] === "BOTH" ? "HOT" : product.temperatures[0],
      addons: [],
    },
  });

  function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      // Get selected addons
      const selectedAddons = product.addons.filter((addon) =>
        values.addons?.includes(addon.id)
      );

      // Calculate price based on selections
      let basePrice = product.basePrice;
      
      // Get size-specific price if available
      if (product.sizePricing) {
        console.log("sizePricing from product:", product.sizePricing);
        
        const sizePricing = product.sizePricing as Record<string, number>;
        console.log("Selected size:", values.size);
        console.log("Available size prices:", sizePricing);
        
        if (sizePricing[values.size]) {
          basePrice = sizePricing[values.size];
          console.log(`Using custom price for ${values.size}: ${basePrice}`);
        } else if (values.size === "TWENTY_TWO_OZ") {
          // Fallback if no specific price is set - use +30 as default differential
          basePrice += 30;
          console.log(`Using default price increase for ${values.size}: ${basePrice}`);
        }
      } else if (values.size === "TWENTY_TWO_OZ") {
        // Fallback if no sizePricing is available
        basePrice += 30;
        console.log(`No sizePricing available, using default price for ${values.size}: ${basePrice}`);
      }

      // Add addon prices
      const addonTotalPrice = selectedAddons.reduce(
        (total, addon) => total + addon.price,
        0
      );

      const totalItemPrice = basePrice + addonTotalPrice;
      console.log(`Final price: ${totalItemPrice} (base: ${basePrice}, addons: ${addonTotalPrice})`);

      // Create cart item
      addItem({
        id: uuidv4(),
        productId: product.id,
        name: product.name,
        quantity: values.quantity,
        size: values.size as Size,
        temperature: values.temperature as Temperature,
        price: totalItemPrice,
        addons: selectedAddons,
      });

      toast.success("Added to cart");
      
      // Reset form
      form.reset({
        ...form.getValues(),
        quantity: 1,
      });
    } catch (error) {
      toast.error("Failed to add item to cart");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle quantity changes
  const incrementQuantity = () => {
    const current = form.getValues("quantity");
    if (current < 10) {
      form.setValue("quantity", current + 1);
    }
  };

  const decrementQuantity = () => {
    const current = form.getValues("quantity");
    if (current > 1) {
      form.setValue("quantity", current - 1);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="size"
          render={({ field }) => {
            // Calculate price differentials for sizes
            let twentyTwoOzPrice = product.basePrice;
            let priceDifferential = 0;
            
            if (product.sizePricing) {
              const sizePricing = product.sizePricing as Record<string, number>;
              if (sizePricing["TWENTY_TWO_OZ"]) {
                twentyTwoOzPrice = sizePricing["TWENTY_TWO_OZ"];
                priceDifferential = Math.round((twentyTwoOzPrice - product.basePrice) * 100) / 100;
              }
            }
            
            if (priceDifferential === 0 && product.sizes.includes("TWENTY_TWO_OZ")) {
              // Fallback to default 30 differential if no price set
              priceDifferential = 30;
              twentyTwoOzPrice = product.basePrice + priceDifferential;
            }
            
            return (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <Select
                  disabled={isLoading || product.sizes.length === 0}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {product.sizes.includes("SIXTEEN_OZ") && (
                      <SelectItem value="SIXTEEN_OZ">Regular (16oz)</SelectItem>
                    )}
                    {product.sizes.includes("TWENTY_TWO_OZ") && (
                      <SelectItem value="TWENTY_TWO_OZ">
                        Large (22oz) +₱{priceDifferential}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temperature</FormLabel>
              <Select
                disabled={isLoading || product.temperatures.length === 0}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select temperature" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(product.temperatures.includes("HOT") || product.temperatures.includes("BOTH")) && (
                    <SelectItem value="HOT">Hot</SelectItem>
                  )}
                  {(product.temperatures.includes("ICED") || product.temperatures.includes("BOTH")) && (
                    <SelectItem value="ICED">Iced</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {product.addons.length > 0 && (
          <FormField
            control={form.control}
            name="addons"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>Add-ons</FormLabel>
                </div>
                <div className="space-y-2">
                  {product.addons.map((addon) => (
                    <FormField
                      key={addon.id}
                      control={form.control}
                      name="addons"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={addon.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(addon.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, addon.id])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== addon.id
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {addon.name} +₱{addon.price.toFixed(2)}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={decrementQuantity}
                  disabled={isLoading || field.value <= 1}
                >
                  -
                </Button>
                <FormControl>
                  <Input
                    type="number"
                    className="w-16 text-center"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      field.onChange(Math.min(value, 10));
                    }}
                    max={10}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={incrementQuantity}
                  disabled={isLoading || field.value >= 10}
                >
                  +
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !product.inStock}
        >
          {isLoading
            ? "Adding..."
            : !product.inStock
            ? "Out of Stock"
            : "Add to Cart"}
        </Button>
      </form>
    </Form>
  );
} 
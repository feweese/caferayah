"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Size, Temperature } from "@prisma/client";
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
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { Product, Addon } from "@/types/types";

const formSchema = z.object({
  size: z.enum([Size.SIXTEEN_OZ, Size.TWENTY_TWO_OZ]),
  temperature: z.enum([Temperature.HOT, Temperature.ICED]),
  quantity: z.number().min(1).max(10),
  addons: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface AddToCartFormProps {
  product: Product;
}

export function AddToCartForm({ product }: AddToCartFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const addToCart = useCartStore((state) => state.addItem);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      size: product.sizes[0],
      temperature: product.temperatures[0],
      quantity: 1,
      addons: [],
    },
  });

  const watchedSize = form.watch("size");
  const watchedAddons = form.watch("addons");

  // Calculate price based on selections
  const basePrice = product.basePrice;
  const sizePrice = watchedSize === Size.TWENTY_TWO_OZ ? 20 : 0;
  
  const selectedAddons = product.addons.filter(addon => 
    watchedAddons.includes(addon.id)
  );
  
  const addonPrice = selectedAddons.reduce((total, addon) => total + addon.price, 0);
  
  const totalPrice = basePrice + sizePrice + addonPrice;

  function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      // Get selected addons
      const selectedAddons = product.addons.filter(addon => 
        values.addons.includes(addon.id)
      );

      // Add to cart
      addToCart({
        id: Math.random().toString(36).substr(2, 9), // Generate a random ID
        productId: product.id,
        name: product.name,
        size: values.size,
        temperature: values.temperature,
        quantity: values.quantity,
        price: totalPrice,
        addons: selectedAddons,
      });

      toast.success(`${product.name} added to cart!`);
      
      // Optionally navigate to cart
      // router.push("/cart");
    } catch (error) {
      toast.error("Failed to add to cart");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size</FormLabel>
                <Select
                  disabled={isLoading}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {product.sizes.includes(Size.SIXTEEN_OZ) && (
                      <SelectItem value={Size.SIXTEEN_OZ}>16oz</SelectItem>
                    )}
                    {product.sizes.includes(Size.TWENTY_TWO_OZ) && (
                      <SelectItem value={Size.TWENTY_TWO_OZ}>22oz (+₱20)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature</FormLabel>
                <Select
                  disabled={isLoading || product.temperatures.length <= 1}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select temperature" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {product.temperatures.includes(Temperature.HOT) && (
                      <SelectItem value={Temperature.HOT}>Hot</SelectItem>
                    )}
                    {product.temperatures.includes(Temperature.ICED) && (
                      <SelectItem value={Temperature.ICED}>Iced</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {product.addons.length > 0 && (
          <FormField
            control={form.control}
            name="addons"
            render={() => (
              <FormItem>
                <FormLabel>Add-ons</FormLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
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
                                  const currentValue = [...field.value];
                                  if (checked) {
                                    field.onChange([...currentValue, addon.id]);
                                  } else {
                                    field.onChange(
                                      currentValue.filter((value) => value !== addon.id)
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {addon.name} (+₱{addon.price.toFixed(2)})
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
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
              <FormControl>
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newValue = Math.max(1, field.value - 1);
                      form.setValue("quantity", newValue);
                    }}
                    disabled={field.value <= 1 || isLoading}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    className="w-16 text-center"
                    min={1}
                    max={10}
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= 10) {
                        field.onChange(value);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const newValue = Math.min(10, field.value + 1);
                      form.setValue("quantity", newValue);
                    }}
                    disabled={field.value >= 10 || isLoading}
                  >
                    +
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">
            Total: ₱{(totalPrice * form.watch("quantity")).toFixed(2)}
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Adding..." : "Add to Cart"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { MinimalIcons as Icons } from "@/components/minimal-icons";
import { MainLayout } from "@/components/layout/main-layout";
import { useCartStore } from "@/store/cart-store";
import { Size, Temperature, PaymentMethod, DeliveryMethod } from "@/types/types";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ShoppingBag, Wallet, CreditCard, Truck, Store, Receipt } from "lucide-react";
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useProfileData } from "@/hooks/use-profile-data";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCheck } from "lucide-react";
import { GCashPayment } from "@/components/payment/gcash-payment";

// Temporary fix for missing icons
const safeIcons = {
  ...Icons,
  shoppingBag: Icons.shoppingBag || ShoppingBag,
  logo: Icons.logo || (() => <span>Logo</span>),
  wallet: Icons.wallet || Wallet,
  creditCard: Icons.creditCard || CreditCard,
  truck: Icons.truck || Truck,
  store: Icons.store || Store,
  receipt: Icons.receipt || Receipt,
  spinner: Icons.spinner || Loader2,
  trash: Icons.trash || Trash2,
  star: Icons.star || Star,
  banknote: Icons.banknote || Banknote,
  alertCircle: Icons.alertCircle || AlertCircle,
  dashboard: (() => <span>Admin</span>),
};

// Form depends on delivery method and payment method
const getFormSchema = (deliveryMethod: string, paymentMethod: string) => {
  if (deliveryMethod === DeliveryMethod.DELIVERY) {
    return z.object({
      address: z.string().min(1, "Delivery address is required"),
      phoneNumber: z.string()
        .min(1, "Phone number is required")
        .regex(/^(\+?63|0)?([0-9]{9,13})$/, "Please enter a valid phone number")
        .transform(val => {
          // Format to ensure consistent storage
          val = val.trim();
          
          // If number starts with 63 but not +63, add the +
          if (val.startsWith('63') && !val.startsWith('+63')) {
            val = '+' + val;
          }
          
          // If number doesn't start with +63 or 0, add 0 prefix
          if (!val.startsWith('+63') && !val.startsWith('0')) {
            val = '0' + val;
          }
          
          return val;
        }),
    });
  } else {
    // For pickup - no validation needed
    return z.object({
      address: z.string().optional(),
      phoneNumber: z.string().optional()
    });
  }
};

type CheckoutFormValues = z.infer<ReturnType<typeof getFormSchema>>;

export default function CartPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { profileData } = useProfileData();
  const { points: loyaltyPoints, isLoading: pointsLoading } = useLoyaltyPoints();
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(DeliveryMethod.PICKUP);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.IN_STORE);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  
  // Check if user is admin
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // Redirect admin users to the menu page
  useEffect(() => {
    if (mounted && isAdmin) {
      toast.info("Cart is disabled in admin preview mode", {
        description: "To test the cart functionality, please use a customer account",
        action: {
          label: "View Menu",
          onClick: () => router.push("/menu"),
        },
      });
      router.push("/menu");
    }
  }, [mounted, isAdmin, router]);
  
  // Get cart store (initialize as empty objects to prevent undefined errors)
  const cartStore = useCartStore();
  const items = mounted ? (cartStore?.items || []) : [];
  const removeItem = cartStore?.removeItem || (() => {});
  const updateItemQuantity = cartStore?.updateItemQuantity || (() => {});
  const clearCart = cartStore?.clearCart || (() => {});
  const getTotalPrice = cartStore?.getTotalPrice || (() => 0);

  // Mark component as mounted after first render (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update payment method when delivery method changes
  useEffect(() => {
    if (deliveryMethod === DeliveryMethod.DELIVERY) {
      setPaymentMethod(paymentMethod === PaymentMethod.IN_STORE ? PaymentMethod.CASH_ON_DELIVERY : paymentMethod);
    } else {
      setPaymentMethod(paymentMethod === PaymentMethod.CASH_ON_DELIVERY ? PaymentMethod.IN_STORE : paymentMethod);
    }
  }, [deliveryMethod, paymentMethod]);

  const checkoutForm = useForm<CheckoutFormValues>({
    resolver: zodResolver(getFormSchema(deliveryMethod, paymentMethod)),
    defaultValues: {
      address: "",
      phoneNumber: "",
    },
  });

  // Update form validation when delivery method or payment method changes
  useEffect(() => {
    checkoutForm.reset(checkoutForm.getValues());
  }, [deliveryMethod, paymentMethod, checkoutForm]);

  // Set initial form values from user profile if available
  useEffect(() => {
    if (!mounted) return;

    // First check localStorage data (which is more reliable)
    if (profileData?.phoneNumber) {
      checkoutForm.setValue("phoneNumber", profileData.phoneNumber);
    } else if (session?.user?.phoneNumber) {
      checkoutForm.setValue("phoneNumber", session.user.phoneNumber);
    }
    
    if (profileData?.address) {
      checkoutForm.setValue("address", profileData.address);
    } else if (session?.user?.address) {
      checkoutForm.setValue("address", session.user.address);
    }
  }, [session, checkoutForm, profileData, mounted]);

  const deliveryFee = deliveryMethod === DeliveryMethod.DELIVERY ? 50 : 0;
  
  // Calculate discounts and final total
  const subtotal = getTotalPrice();
  const pointsDiscount = usePoints ? Math.min(pointsToUse, loyaltyPoints) : 0;
  const total = subtotal + deliveryFee - pointsDiscount;

  // Handle GCash payment proof upload
  const handlePaymentProofUploaded = (imageUrl: string) => {
    setPaymentProofUrl(imageUrl);
  };

  // Check if GCash payment is selected and proof is required
  const isGCashPayment = paymentMethod === PaymentMethod.GCASH;
  const isPaymentProofRequired = isGCashPayment && !paymentProofUrl;

  // Show loading state while not mounted yet (prevents hydration mismatch)
  if (!mounted) {
    return (
      <MainLayout>
        <div className="container py-16 px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="animate-spin">
            <safeIcons.logo className="h-8 w-8" />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show empty cart state when cart is empty
  if (!items.length) {
    return (
      <MainLayout>
        <div className="container py-16 px-4 sm:px-6 lg:px-8 animate-fadeIn">
          <div className="max-w-md mx-auto flex flex-col items-center justify-center py-16 bg-card rounded-xl border shadow-sm">
            <div className="bg-primary/10 p-5 rounded-full mb-6">
              <safeIcons.shoppingBag className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8 text-center max-w-xs">
              Looks like you haven&apos;t added any items to your cart yet.
            </p>
            <Link href="/menu">
              <Button size="lg" className="px-8">Browse Menu</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const handleCheckout = async (formData?: CheckoutFormValues) => {
    setIsLoading(true);
    
    try {
      // Check if user is logged in
      if (!session || !session.user) {
        toast.error("You must be logged in to create an order");
        router.push("/login?callbackUrl=/cart");
        return;
      }
      
      // Check if payment proof is required for GCash
      if (paymentMethod === PaymentMethod.GCASH && !paymentProofUrl) {
        toast.error("Please upload a payment proof for GCash payment");
        setIsLoading(false);
        return;
      }
      
      // Create order object with normalized items (ensure all required properties are at top level)
      const order = {
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          // Ensure size and temperature are always present at the top level
          // If they're missing, provide default values
          size: item.size || Size.SIXTEEN_OZ, // Default to SIXTEEN_OZ if missing
          temperature: item.temperature || Temperature.HOT, // Default to HOT if missing
          // Ensure addons is always an array
          addons: Array.isArray(item.addons) ? item.addons : []
        })),
        totalPrice: total,
        paymentMethod: paymentMethod,
        deliveryMethod: deliveryMethod,
        deliveryFee,
        subtotal: getTotalPrice(),
        deliveryAddress: deliveryMethod === DeliveryMethod.DELIVERY ? formData?.address : null,
        contactNumber: formData?.phoneNumber || null,
        pointsToRedeem: usePoints ? pointsToUse : 0,
        paymentProofUrl: paymentProofUrl,
      };
      
      // Send order to API
      console.log("Sending order data:", JSON.stringify(order, null, 2));
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });
      
      console.log("API Response status:", response.status);
      
      const responseText = await response.text();
      console.log("API Response raw text:", responseText);
      
      let responseData;
      try {
        // Try to parse as JSON if possible
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        responseData = { message: "Invalid response format", rawText: responseText };
      }
      
      if (!response.ok) {
        console.error('API Error Response:', responseData);
        throw new Error(responseData.message || responseData.detail || `Server error: ${response.status}`);
      }
      
      const result = responseData;
      
      // Display a success message with points info if applicable
      let successMessage = `Order placed successfully!`;
      
      if (paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
        successMessage += " Cash will be collected upon delivery.";
      } else if (paymentMethod === PaymentMethod.IN_STORE) {
        successMessage += " Your order will be ready for pickup soon.";
      } else if (paymentMethod === PaymentMethod.GCASH) {
        successMessage += " Your payment is being verified.";
      }
      
      if (result.pointsEarned > 0) {
        successMessage += ` You'll earn ${result.pointsEarned} loyalty points when your order is completed!`;
      }
      
      if (result.pointsUsed > 0) {
        successMessage += ` You redeemed ${result.pointsUsed} points for a ₱${result.pointsUsed} discount.`;
      }
      
      toast.success(successMessage);
      clearCart();
      
      // Redirect to the order details page instead of the orders list
      if (result.orderId) {
        router.push(`/orders/${result.orderId}`);
      } else {
        // Fallback to orders page if for some reason we don't have the order ID
        router.push("/orders");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to place order. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const onSubmit = (data: CheckoutFormValues) => {
    handleCheckout(data);
  };

  // Handle changes to loyalty points usage
  const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    // Ensure the user can't redeem more points than they have or more than the subtotal
    const maxPoints = Math.min(loyaltyPoints, Math.floor(subtotal));
    setPointsToUse(Math.min(value, maxPoints));
  };

  return (
    <MainLayout>
      <div className="container py-16 px-4 sm:px-6 lg:px-8 animate-fadeIn">
        <h1 className="text-3xl font-bold mb-2">Your Cart</h1>
        <p className="text-muted-foreground mb-8">Review your items and proceed to checkout</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items Section */}
          <div className="lg:col-span-2">
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <safeIcons.shoppingBag className="mr-2 h-5 w-5" /> 
                  Cart Items ({items.length})
                </h2>
                <div className="divide-y">
                  {items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="py-6 first:pt-2 last:pb-2 animate-fadeInUp"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            {/* Color badge based on temperature */}
                            <div className={`h-10 w-1 rounded-full ${item.temperature === Temperature.HOT ? 'bg-red-400' : 'bg-blue-400'} self-stretch`}></div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{item.name}</h3>
                              <div className="grid grid-cols-2 gap-1 mt-1.5">
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <span className="inline-block h-2 w-2 bg-muted rounded-full mr-1.5"></span>
                                  Size: {item.size === Size.SIXTEEN_OZ ? "16oz" : "22oz"}
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <span className="inline-block h-2 w-2 bg-muted rounded-full mr-1.5"></span>
                                  Temp: {item.temperature === Temperature.HOT ? "Hot" : "Iced"}
                                </div>
                                {item.addons && item.addons.length > 0 && (
                                  <div className="flex items-center text-xs text-muted-foreground col-span-2">
                                    <span className="inline-block h-2 w-2 bg-muted rounded-full mr-1.5"></span>
                                    Add-ons: {item.addons.map((a) => a.name).join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:min-w-[140px]">
                          <div className="font-medium">₱{item.price.toFixed(2)}</div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  updateItemQuantity(item.id, item.quantity - 1);
                                }
                              }}
                              disabled={item.quantity <= 1}
                            >
                              <span className="sr-only">Decrease quantity</span>
                              -
                            </Button>
                            <span className="mx-1 w-7 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={() => {
                                if (item.quantity < 10) {
                                  updateItemQuantity(item.id, item.quantity + 1);
                                }
                              }}
                              disabled={item.quantity >= 10}
                            >
                              <span className="sr-only">Increase quantity</span>
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 ml-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                              onClick={() => removeItem(item.id)}
                            >
                              <span className="sr-only">Remove item</span>
                              <safeIcons.trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => clearCart()}
                className="text-sm gap-2"
                size="sm"
              >
                <safeIcons.trash className="h-3.5 w-3.5" />
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Order Summary Section */}
          <div>
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm sticky top-24">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <safeIcons.receipt className="mr-2 h-5 w-5" />
                  Order Summary
                </h2>
                <div className="space-y-4">
                  {/* Items section with detailed product listing */}
                  <div className="mb-2">
                    <span className="text-sm font-medium">Items</span>
                    <div className="mt-2 space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="text-sm">
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <span>{item.name}</span>
                              {item.quantity > 1 && <span className="text-muted-foreground ml-1">×{item.quantity}</span>}
                            </div>
                            <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                          {item.addons && item.addons.length > 0 && (
                            <div className="text-xs text-muted-foreground ml-4 mt-0.5">
                              Add-ons: {item.addons.map(addon => addon.name).join(", ")}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Points Redemption Section */}
                  {session?.user && (
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Checkbox
                          id="usePoints"
                          checked={usePoints}
                          onCheckedChange={(checked) => {
                            setUsePoints(checked === true);
                            if (!checked) setPointsToUse(0);
                          }}
                          disabled={pointsLoading || loyaltyPoints <= 0}
                        />
                        <label 
                          htmlFor="usePoints" 
                          className="text-sm font-medium cursor-pointer"
                        >
                          Use loyalty points
                        </label>
                      </div>
                      
                      {usePoints && (
                        <div className="mb-3 mt-2">
                          <div className="text-xs text-muted-foreground mb-2">
                            You have {loyaltyPoints} points available (₱1 per point)
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={Math.min(loyaltyPoints, Math.floor(subtotal))}
                              value={pointsToUse}
                              onChange={handlePointsChange}
                              className="w-24"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setPointsToUse(Math.min(loyaltyPoints, Math.floor(subtotal)))}
                            >
                              Max
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Delivery Method Section */}
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Delivery Method</span>
                      <span className={`flex items-center gap-1 ${deliveryMethod === DeliveryMethod.DELIVERY ? "text-purple-600" : "text-amber-600"}`}>
                        {deliveryMethod === DeliveryMethod.DELIVERY ? (
                          <>
                            <safeIcons.truck className="h-3.5 w-3.5" />
                            Delivery
                          </>
                        ) : (
                          <>
                            <safeIcons.store className="h-3.5 w-3.5" />
                            Pickup
                          </>
                        )}
                      </span>
                    </div>
                    
                    <RadioGroup 
                      value={deliveryMethod} 
                      onValueChange={(value) => setDeliveryMethod(value as DeliveryMethod)}
                      className="mt-2"
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={DeliveryMethod.PICKUP} id="pickup" />
                          <Label 
                            htmlFor="pickup" 
                            className="cursor-pointer"
                          >
                            Pickup
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={DeliveryMethod.DELIVERY} id="delivery" />
                          <Label 
                            htmlFor="delivery" 
                            className="cursor-pointer"
                          >
                            Delivery (+₱50)
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Payment Method Section */}
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Payment Method</span>
                      <span className="flex items-center gap-1 text-green-600">
                        {paymentMethod === PaymentMethod.CASH_ON_DELIVERY && (
                          <>
                            <safeIcons.banknote className="h-3.5 w-3.5" />
                            Cash on Delivery
                          </>
                        )}
                        {paymentMethod === PaymentMethod.IN_STORE && (
                          <>
                            <safeIcons.wallet className="h-3.5 w-3.5" />
                            Pay in Store
                          </>
                        )}
                        {paymentMethod === PaymentMethod.GCASH && (
                          <>
                            <safeIcons.creditCard className="h-3.5 w-3.5" />
                            GCash
                          </>
                        )}
                      </span>
                    </div>
                    
                    <RadioGroup 
                      value={paymentMethod} 
                      onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                      className="mt-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {deliveryMethod === DeliveryMethod.DELIVERY && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={PaymentMethod.CASH_ON_DELIVERY} id="cod" />
                            <Label 
                              htmlFor="cod" 
                              className="cursor-pointer"
                            >
                              Cash on Delivery
                            </Label>
                          </div>
                        )}
                        {deliveryMethod === DeliveryMethod.PICKUP && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={PaymentMethod.IN_STORE} id="in-store" />
                            <Label 
                              htmlFor="in-store" 
                              className="cursor-pointer"
                            >
                              Pay in Store
                            </Label>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={PaymentMethod.GCASH} id="gcash" />
                          <Label 
                            htmlFor="gcash" 
                            className="cursor-pointer"
                          >
                            GCash
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>₱{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Points Discount Line Item */}
                  {usePoints && pointsDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center">
                        <safeIcons.star className="h-3.5 w-3.5 mr-1 text-green-600" />
                        <span>Points Discount</span>
                      </span>
                      <span className="text-green-600">-₱{pointsDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t border-border pt-4 mt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>₱{total.toFixed(2)}</span>
                    </div>
                    
                    {session?.user && pointsDiscount === 0 && (
                      <div className="text-xs text-primary mt-1">
                        You'll earn approximately {Math.floor(total / 100)} loyalty points with this order
                      </div>
                    )}
                  </div>
                </div>
                
                {!session ? (
                  <div className="rounded-md bg-muted p-6 mb-6 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium">Account Required</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Please login or create an account to complete your order and earn loyalty points.
                    </p>
                    <Link href="/login?callbackUrl=/cart">
                      <Button size="sm">Login or Register</Button>
                    </Link>
                  </div>
                ) : session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN" ? (
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 p-6 mb-6 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <safeIcons.alertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-medium text-amber-800 dark:text-amber-300">Admin Preview Mode</h3>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                      Checkout is disabled in admin preview mode. To test the ordering system, please use a customer account.
                    </p>
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="mr-2">
                        <safeIcons.dashboard className="mr-2 h-4 w-4" />
                        Back to Admin
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => clearCart()}
                    >
                      <safeIcons.trash className="mr-2 h-4 w-4" />
                      Clear Cart
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6">
                    {/* GCash Payment Section */}
                    {paymentMethod === PaymentMethod.GCASH && (
                      <GCashPayment 
                        onPaymentProofUploaded={handlePaymentProofUploaded} 
                        isLoading={isLoading}
                        total={total}
                      />
                    )}
                    
                    {/* Address Form for Delivery */}
                    <Form {...checkoutForm}>
                      <form onSubmit={checkoutForm.handleSubmit(onSubmit)} className="space-y-4 mt-6">
                        {deliveryMethod === DeliveryMethod.DELIVERY && (
                          <>
                            <FormField
                              control={checkoutForm.control}
                              name="address"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Delivery Address</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter your delivery address" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={checkoutForm.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 09123456789 or +63912345678" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={isLoading || isPaymentProofRequired}
                        >
                          {isLoading ? (
                            <>
                              <safeIcons.spinner className="mr-2 h-4 w-4 animate-spin" />
                              Processing
                            </>
                          ) : isPaymentProofRequired ? (
                            'Upload Payment Proof to Continue'
                          ) : (
                            'Place Order'
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
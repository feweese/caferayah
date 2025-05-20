"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MainLayout } from "@/components/layout/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfileData } from "@/hooks/use-profile-data";
import { useLoyaltyPoints } from "@/hooks/use-loyalty-points";
import { format } from "date-fns";
import { Icons } from "@/components/icons";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phoneNumber: z.string()
    .optional()
    .refine(val => val === '' || val === undefined || val === null || /^(\+?63|0)?([0-9]{9,13})$/.test(val), {
      message: "Please enter a valid phone number"
    })
    .transform(val => {
      if (!val) return val;
      
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
  address: z.string().optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const { data: session, update, status } = useSession();
  const { profileData, updateProfileData } = useProfileData();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { 
    points, 
    history, 
    isLoading: pointsLoading, 
    error: pointsError 
  } = useLoyaltyPoints();
  
  // Determine if user has signed in with Google (no password)
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  
  // Initialize forms at the top level regardless of conditions
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      address: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push("/login");
    }
    
    // Redirect admin users to the admin profile page
    if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
      router.push("/admin/profile");
      return;
    }
    
    // Update form default values when session is available
    if (session?.user) {
      console.log("Profile session data:", {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image
      });
      
      // Check if this user is a Google-authenticated user
      const checkGoogleAuth = async () => {
        try {
          const response = await fetch("/api/auth/check-auth-method");
          const data = await response.json();
          
          if (response.ok) {
            setIsGoogleUser(data.isOAuthUser);
            console.log("User auth method:", data.isOAuthUser ? "OAuth" : "Credentials");
          }
        } catch (error) {
          console.error("Failed to check auth method:", error);
        }
      };
      
      checkGoogleAuth();
      
      profileForm.setValue("name", session.user.name || "");
      
      // Always use session data first as it's most up-to-date from database
      if (session.user.phoneNumber) {
        profileForm.setValue("phoneNumber", session.user.phoneNumber);
      } else if (profileData.phoneNumber) {
        profileForm.setValue("phoneNumber", profileData.phoneNumber);
      }
      
      if (session.user.address) {
        profileForm.setValue("address", session.user.address);
      } else if (profileData.address) {
        profileForm.setValue("address", profileData.address);
      }
    }
  }, [status, router, session, profileForm, profileData]);
  
  if (status === 'loading') {
    return (
      <MainLayout>
        <div className="container py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
          <p>Loading...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (!session) {
    return null;
  }

  async function onProfileSubmit(data: ProfileFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Something went wrong");
      }

      // Update the session with all profile data
      await update({
        ...session,
        user: {
          ...session.user,
          name: data.name,
          phoneNumber: data.phoneNumber,
          address: data.address,
        },
      });

      // Also update localStorage through our hook
      updateProfileData({
        phoneNumber: data.phoneNumber || null,
        address: data.address || null,
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function onPasswordSubmit(data: PasswordFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle error without throwing
        if (responseData.message === "Current password is incorrect") {
          passwordForm.setError("currentPassword", { 
            type: "manual", 
            message: "Current password is incorrect" 
          });
          setIsLoading(false);
          return; // Stop execution here
        }
        
        // For other errors, display toast
        toast.error(responseData.message || "Something went wrong");
        setIsLoading(false);
        return; // Stop execution here
      }

      toast.success("Password changed successfully");
      passwordForm.reset();
    } catch (error) {
      console.error("Password change error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Add function to handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file type
    const fileType = file.type;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(fileType)) {
      toast.error("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }
    
    setIsUploadingAvatar(true);
    
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      
      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }
      
      // Update the session with the new avatar
      await update({
        ...session,
        user: {
          ...session.user,
          image: data.url,
        },
      });
      
      toast.success("Avatar uploaded successfully");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };
  
  // Add function to handle avatar removal
  const handleAvatarRemove = async () => {
    setIsUploadingAvatar(true);
    
    try {
      console.log("Initiating avatar removal request");
      
      const response = await fetch("/api/upload/avatar/remove", {
        method: "POST",
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      });
      
      console.log(`Avatar removal response status: ${response.status}`);
      
      // Read the response as text first
      const responseText = await response.text();
      console.log(`Avatar removal response text: ${responseText}`);
      
      // Try to parse as JSON
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error(`Server response error: ${response.status} - ${responseText.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to remove avatar");
      }
      
      // Update the session with null image
      await update({
        ...session,
        user: {
          ...session.user,
          image: null,
        },
      });
      
      toast.success("Avatar removed successfully");
    } catch (error) {
      console.error("Avatar removal error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <MainLayout>
      <div className="container py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
          <p className="text-muted-foreground text-center max-w-2xl">
            Manage your account information and preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          <div className="w-full md:w-80 flex flex-col items-center">
            <div className="relative group mb-6">
              <Avatar className="h-32 w-32">
                {session.user.image ? (
                  <AvatarImage 
                    src={session.user.image} 
                    alt={session.user.name || ""} 
                    onError={(e) => {
                      console.error("Error loading avatar image:", e);
                      // Fallback to initials if image fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
                )}
                {/* Always render the fallback in case the image fails to load */}
                {session.user.image && (
                  <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
                )}
              </Avatar>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <input 
                  type="file" 
                  id="avatar-upload" 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/webp, image/jpg"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
                <label 
                  htmlFor="avatar-upload" 
                  className="cursor-pointer text-white text-xs font-medium bg-primary/80 hover:bg-primary px-2 py-1 rounded mb-2"
                >
                  {isUploadingAvatar ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : "Change Avatar"}
                </label>
                
                {session.user.image && (
                  <button
                    type="button"
                    className="text-white text-xs font-medium bg-red-500/80 hover:bg-red-500 px-2 py-1 rounded"
                    onClick={handleAvatarRemove}
                    disabled={isUploadingAvatar}
                  >
                    Remove Avatar
                  </button>
                )}
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold">{session.user.name}</h2>
              <p className="text-muted-foreground">{session.user.email}</p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {session.user.role.charAt(0) + session.user.role.slice(1).toLowerCase().replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="bg-card border rounded-lg p-6 w-full">
              <h3 className="font-semibold mb-3">Loyalty Points</h3>
              {pointsLoading ? (
                <div className="flex items-center justify-center h-16">
                  <div className="animate-spin">
                    <Icons.spinner className="h-6 w-6 text-primary" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-primary">{points}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You can redeem 1 point = ₱1 discount
                  </p>
                  
                  {history.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Points History</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {history.map((item) => (
                          <div 
                            key={item.id} 
                            className="text-xs rounded-md p-2 bg-muted flex justify-between"
                          >
                            <div>
                              <span className={
                                item.action === "EARNED" ? "text-green-500" :
                                item.action === "REDEEMED" ? "text-amber-500" :
                                item.action === "EXPIRED" ? "text-red-500" :
                                "text-blue-500"
                              }>
                                {item.action === "EARNED" ? "Earned" :
                                 item.action === "REDEEMED" ? "Redeemed" :
                                 item.action === "EXPIRED" ? "Expired" :
                                 "Refunded"}
                              </span>
                              <span className="ml-1">{item.points} points</span>
                            </div>
                            <div className="text-muted-foreground">
                              {(() => {
                                try {
                                  // Handle potential date parsing issues
                                  const date = new Date(item.createdAt);
                                  return isNaN(date.getTime()) 
                                    ? "Invalid date" 
                                    : format(date, "MMM d, yyyy");
                                } catch (error) {
                                  return "Invalid date";
                                }
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Link href="/menu">
                      <Button variant="outline" className="w-full">
                        Shop to Earn More Points
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1">
            <Tabs defaultValue="account">
              <TabsList className="mb-8">
                <TabsTrigger value="account">Account Info</TabsTrigger>
                {!isGoogleUser && (
                  <TabsTrigger value="security">Security</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Delivery Address</FormLabel>
                              <FormControl>
                                <Input {...field} disabled={isLoading} />
                              </FormControl>
                              <FormDescription>
                                Your default delivery address
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Updating..." : "Save Changes"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              {!isGoogleUser && (
                <TabsContent value="security">
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <CardDescription>
                        Update your password to keep your account secure
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormDescription>
                                  Password must be at least 6 characters
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Updating..." : "Change Password"}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
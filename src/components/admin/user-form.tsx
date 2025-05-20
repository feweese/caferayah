"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Mail, Phone, User, Shield, Home, Save, UserCog } from "lucide-react";

// Schema for user form validation
const createUserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]),
  phoneNumber: z.string()
    .optional()
    .refine(val => val === '' || val === undefined || val === null || /^(\+?63|0)?([0-9]{9,13})$/.test(val), {
      message: "Please enter a valid phone number"
    }),
  address: z.string().optional(),
});

// Schema for editing users - password is optional
const editUserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.union([
    z.string().min(6, "Password must be at least 6 characters"),
    z.string().length(0)
  ]),
  role: z.enum(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]),
  phoneNumber: z.string()
    .optional()
    .refine(val => val === '' || val === undefined || val === null || /^(\+?63|0)?([0-9]{9,13})$/.test(val), {
      message: "Please enter a valid phone number"
    }),
  address: z.string().optional(),
});

// Use conditional type based on whether we're creating or editing
type UserFormValues = z.infer<typeof createUserFormSchema>;

interface UserFormProps {
  isSuperAdmin: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    phoneNumber?: string;
    address?: string;
  };
}

export function NewUserForm({ isSuperAdmin, user }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  // Determine if the user being edited is a SUPER_ADMIN
  const isEditingSuperAdmin = user?.role === "SUPER_ADMIN";
  
  // Set default values for the form
  const defaultValues: Partial<UserFormValues> = {
    name: user?.name || "",
    email: user?.email || "",
    password: "", // Always empty for security
    role: (user?.role as "CUSTOMER" | "ADMIN" | "SUPER_ADMIN") || "CUSTOMER",
    phoneNumber: user?.phoneNumber || "",
    address: user?.address || "",
  };

  // Use the appropriate schema based on whether we're editing a user
  const formSchema = user ? editUserFormSchema : createUserFormSchema;

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  async function onSubmit(data: any) {
    setIsLoading(true);
    try {
      // If not a super admin, always set role to CUSTOMER
      if (!isSuperAdmin) {
        data.role = "CUSTOMER";
      }
      
      // If editing a super admin, prevent role change
      if (isEditingSuperAdmin) {
        data.role = "SUPER_ADMIN"; // Ensure role stays as SUPER_ADMIN
      }
      
      const endpoint = user ? `/api/admin/users/${user.id}` : "/api/admin/users";
      const method = user ? "PATCH" : "POST";
      
      // If editing a user and password is empty, remove it from the request
      if (user && data.password === "") {
        delete data.password;
      }
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save user");
      }

      toast.success(user ? "User updated" : "User created", {
        description: user 
          ? `${data.name} has been updated successfully.` 
          : `${data.name} has been created successfully.`,
      });

      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Error", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  Name
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Full Name" 
                    {...field} 
                    disabled={isLoading}
                    className="transition-all focus-within:border-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  Email
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="user@example.com" 
                    type="email" 
                    {...field} 
                    disabled={isLoading}
                    className="transition-all focus-within:border-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  {user ? "New Password (leave blank to keep current)" : "Password"}
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="••••••" 
                    type="password" 
                    {...field} 
                    disabled={isLoading}
                    className="transition-all focus-within:border-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  Phone Number (Optional)
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="09123456789" 
                    {...field} 
                    disabled={isLoading}
                    className="transition-all focus-within:border-primary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isSuperAdmin && (
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <UserCog className="h-4 w-4" />
                    Role
                  </FormLabel>
                  <Select 
                    disabled={isLoading || isEditingSuperAdmin} 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="transition-all focus-within:border-primary">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEditingSuperAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Super Admin role cannot be changed
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                Address (Optional)
              </FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="123 Main St, City, Country" 
                  {...field} 
                  disabled={isLoading}
                  className="min-h-24 transition-all focus-within:border-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            disabled={isLoading}
            onClick={() => router.back()}
            className="hover:bg-secondary">
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="gap-1.5">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {user ? "Update User" : "Create User"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
} 
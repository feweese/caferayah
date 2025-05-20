"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
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
import { MainLayout } from "@/components/layout/main-layout";
import { Icons } from "@/components/icons";
import { PasswordInput } from "@/components/ui/password-input";

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isTokenChecked, setIsTokenChecked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on component mount
  useEffect(() => {
    if (!token) {
      setIsTokenChecked(true);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-token?token=${token}`, {
          method: "GET",
        });

        if (response.ok) {
          setIsValidToken(true);
        }
      } catch (error) {
        console.error("Token validation error:", error);
      } finally {
        setIsTokenChecked(true);
      }
    };

    validateToken();
  }, [token]);

  async function onSubmit(data: ResetPasswordFormValues) {
    if (!token) return;
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Something went wrong");
      }

      setIsSuccess(true);
      toast.success("Password has been reset successfully");
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading state while checking token
  if (!isTokenChecked) {
    return (
      <MainLayout>
        <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="animate-spin mx-auto mb-4">
              <Icons.loader className="h-8 w-8" />
            </div>
            <p className="text-muted-foreground">Verifying your reset link...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error if token is invalid or missing
  if (!token || !isValidToken) {
    return (
      <MainLayout>
        <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-red-100 p-4 mb-6">
                <Icons.x className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Invalid or Expired Link</h1>
              <p className="text-muted-foreground max-w-sm mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button asChild className="mb-3 w-full">
                <Link href="/forgot-password">Request New Link</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show success state
  if (isSuccess) {
    return (
      <MainLayout>
        <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-green-100 p-4 mb-6">
                <Icons.check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Password Reset Complete</h1>
              <p className="text-muted-foreground max-w-sm mb-6">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show reset password form
  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 6 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Icons.loader className="h-4 w-4 animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </MainLayout>
  );
} 
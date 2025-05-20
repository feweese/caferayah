"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { MainLayout } from "@/components/layout/main-layout";
import { Icons } from "@/components/icons";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotPasswordFormValues) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Something went wrong");
      }

      // Show success state even if email doesn't exist in system for security reasons
      setIsSubmitted(true);
      toast.success("Password reset instructions sent to your email");
    } catch (error) {
      console.error("Password reset error:", error);
      // For security reasons, don't expose if the email exists or not
      // Just show success message anyway
      setIsSubmitted(true);
      toast.success("If your email exists in our system, you'll receive reset instructions");
    } finally {
      setIsLoading(false);
    }
  }

  // Success state after form submission
  if (isSubmitted) {
    return (
      <MainLayout>
        <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-green-100 p-4 mb-6">
                <Icons.check className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Check your email</h1>
              <p className="text-muted-foreground max-w-sm mb-6">
                We've sent password reset instructions to your email. If you don't see it, please check your spam folder.
              </p>
              <Button asChild variant="outline" className="mb-3 w-full">
                <Link href="/login">Return to Login</Link>
              </Button>
              <Button 
                variant="link" 
                size="sm" 
                className="text-muted-foreground"
                onClick={() => setIsSubmitted(false)}
              >
                Didn't receive the email? Try again
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-1">Forgot Password</h1>
            <p className="text-muted-foreground">
              Enter your email and we'll send you reset instructions
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        disabled={isLoading}
                        autoComplete="email"
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
                    Sending...
                  </span>
                ) : (
                  "Send Reset Instructions"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Button variant="link" size="sm" asChild>
              <Link href="/login">Back to login</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
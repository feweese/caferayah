"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { Icons } from "@/components/icons";
import { Separator } from "@/components/ui/separator";

const formSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // User already exists error
          toast.error(
            "This email is already registered. Please log in instead.",
            {
              action: {
                label: "Login",
                onClick: () => router.push("/login"),
              },
            }
          );
        } else {
          throw new Error(data.message || "Something went wrong");
        }
        return;
      }

      toast.success("Account created successfully. Please check your email for the verification code.");
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleGoogleSignUp = async () => {
    try {
      setIsGoogleLoading(true);
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      toast.error("Something went wrong with Google sign up.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-md py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-8">Create an Account</h1>
          <div className="w-full bg-card rounded-lg shadow-sm p-8 border">
            <Button 
              className="w-full flex items-center justify-center gap-2 mb-6" 
              type="button"
              variant="outline"
              onClick={handleGoogleSignUp}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="h-4 w-4" />
              )}
              Sign up with Google
            </Button>
            
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your Full Name"
                          disabled={isLoading}
                          {...field}
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          type="email"
                          disabled={isLoading}
                          {...field}
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="******"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="******"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Register"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm">
              <p>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary/90"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
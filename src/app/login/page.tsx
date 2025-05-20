"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { v4 as uuidv4 } from "uuid";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [lastAttemptedEmail, setLastAttemptedEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  
  // Check if there's an error from the URL
  const error = searchParams.get("error");
  
  useEffect(() => {
    if (error === "EmailNotVerified") {
      setShowVerificationAlert(true);
    }
  }, [error]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setLastAttemptedEmail(values.email);

    try {
      const response = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (response?.error) {
        if (response.error === "EmailNotVerified") {
          setShowVerificationAlert(true);
          toast.error(
            "Your email is not verified. Please verify your email before logging in.",
            {
              action: {
                label: "Verify Email",
                onClick: () => router.push(`/verify-email?email=${encodeURIComponent(values.email)}`),
              },
            }
          );
        } else {
          toast.error("Invalid email or password");
        }
        return;
      }

      // Check user role from session API and redirect accordingly
      try {
        const userDataResponse = await fetch("/api/auth/me");
        if (userDataResponse.ok) {
          const userData = await userDataResponse.json();
          
          // Redirect based on user role
          if (userData.user.role === "ADMIN" || userData.user.role === "SUPER_ADMIN") {
            toast.success("Successfully logged in as admin");
            router.push("/admin");
          } else {
            toast.success("Successfully logged in");
            router.push("/");
          }
        } else {
          // Fallback to home if can't determine role
          toast.success("Successfully logged in");
          router.push("/");
        }
      } catch (error) {
        // Fallback to home if error
        toast.success("Successfully logged in");
        router.push("/");
      }
      
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await signIn("google", { callbackUrl: "/api/auth/redirect" });
    } catch (error) {
      toast.error("Something went wrong with Google sign in.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  async function resendVerificationEmail() {
    if (!lastAttemptedEmail) return;
    
    setResendLoading(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: lastAttemptedEmail,
        }),
      });
      
      if (response.ok) {
        toast.success("Verification email has been resent. Please check your inbox for the verification code.");
        router.push(`/verify-email?email=${encodeURIComponent(lastAttemptedEmail)}`);
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to resend verification email");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <MainLayout>
      <div className="container max-w-md py-16 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-8">Login to Caférayah</h1>
          
          {showVerificationAlert && (
            <div className="w-full mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <div className="mt-0.5">
                <Icons.warning className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium text-amber-800">Email not verified</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Please verify your email address to login. Enter the 6-digit code sent to your email.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="text-sm" 
                    onClick={() => router.push(`/verify-email?email=${encodeURIComponent(lastAttemptedEmail)}`)}
                  >
                    Enter verification code
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-sm" 
                    onClick={resendVerificationEmail}
                    disabled={resendLoading}
                  >
                    {resendLoading ? "Sending..." : "Resend code"}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div className="w-full bg-card rounded-lg shadow-sm p-8 border">
            <Button 
              className="w-full flex items-center justify-center gap-2 mb-6" 
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="h-4 w-4" />
              )}
              Sign in with Google
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
                <div className="text-sm">
                  <Link
                    href="/forgot-password"
                    className="text-primary hover:text-primary/90"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>
            <div className="mt-6 text-center text-sm">
              <p>
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary/90"
                >
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
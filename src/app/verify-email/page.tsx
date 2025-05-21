"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Schema for verification code form
const verificationSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  code: z.string().length(6, { message: "Verification code must be 6 digits" }),
});

type VerificationFormValues = z.infer<typeof verificationSchema>;

// Component that uses useSearchParams
function VerifyEmailContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") || "";
  
  // References for OTP inputs
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  
  // State for OTP digits
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: email,
      code: "",
    },
  });
  
  // Handle OTP input changes
  const handleOtpChange = (index: number, value: string) => {
    // Allow only digits
    if (!/^[0-9]?$/.test(value)) return;
    
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);
    
    // Combine values for form validation
    const combinedValue = newOtpValues.join("");
    form.setValue("code", combinedValue);
    
    // Auto-focus next input field if a digit was entered
    if (value !== "" && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };
  
  // Handle keyboard navigation and paste events for OTP
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otpValues[index] === "" && index > 0) {
      // Focus previous input when backspace is pressed on an empty input
      inputRefs[index - 1].current?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      // Move focus left
      inputRefs[index - 1].current?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      // Move focus right
      inputRefs[index + 1].current?.focus();
    }
  };
  
  // Handle paste for OTP inputs
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split("");
      const newOtpValues = [...otpValues];
      
      digits.forEach((digit, index) => {
        if (index < 6) newOtpValues[index] = digit;
      });
      
      setOtpValues(newOtpValues);
      form.setValue("code", newOtpValues.join(""));
      
      // Focus the next empty input or the last input
      const nextEmptyIndex = newOtpValues.findIndex(v => v === "");
      if (nextEmptyIndex !== -1) {
        inputRefs[nextEmptyIndex].current?.focus();
      } else {
        inputRefs[5].current?.focus();
      }
    }
  };

  const onSubmit = async (values: VerificationFormValues) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      
      if (data.verified) {
        setIsVerified(true);
        toast.success(data.message || "Email verified successfully");
      } else {
        setError(data.message || "Verification failed. Please try again.");
        toast.error(data.message || "Verification failed");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const onResendCode = async () => {
    setIsResending(true);
    setError("");
    
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message || "Verification code resent successfully");
        
        // Reset OTP inputs
        setOtpValues(["", "", "", "", "", ""]);
        form.setValue("code", "");
      } else {
        setError(data.message || "Failed to resend verification code");
        toast.error(data.message || "Failed to resend code");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
      toast.error("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };

  // Success state
  if (isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="mx-auto w-full max-w-md p-6">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-green-900/30 p-4 mb-6">
              <Icons.check className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Email Verified!</h1>
            <p className="text-gray-400 max-w-sm mb-6">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <Button asChild className="mb-3 w-full bg-white text-black hover:bg-gray-200">
              <Link href="/login">Login to Your Account</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-gray-400">
            Enter the 6-digit code sent to your email address.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800/30 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-zinc-900 p-6 border border-white/10 shadow-lg shadow-white/5">
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
                        disabled={isLoading || !!email}
                        className="bg-zinc-800 border-white/10 text-white focus:border-white/30 focus:ring-white/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <div className="flex justify-center space-x-2">
                        {inputRefs.map((ref, index) => (
                          <input
                            key={index}
                            ref={ref}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otpValues[index]}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            disabled={isLoading}
                            className="w-11 h-14 text-center text-lg font-mono bg-zinc-800 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm"
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />

              <div className="flex flex-col space-y-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full bg-white text-black hover:bg-gray-200 shadow-sm shadow-white/10" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full border-white/10 text-white hover:bg-zinc-800 hover:border-white/20"
                  onClick={onResendCode}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend Verification Code"
                  )}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-gray-400">
            <p>
              Already verified?{" "}
              <Link href="/login" className="text-white hover:text-gray-300 underline">
                Login to your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="mx-auto w-full max-w-md p-6">
          <div className="flex flex-col items-center text-center">
            <div className="animate-spin mb-4">
              <Icons.loader className="h-8 w-8 text-primary" />
            </div>
            <p>Loading verification page...</p>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
} 
"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export function AuthSuccessToast() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if the auth success message cookie exists
    const message = Cookies.get("auth_success_message");
    
    if (message) {
      // Display the toast message
      toast.success(message);
      
      // Remove the cookie
      Cookies.remove("auth_success_message", { path: "/" });
      
      // Refresh to ensure session is updated in UI
      router.refresh();
    }
  }, [router]);
  
  // This component doesn't render anything
  return null;
} 
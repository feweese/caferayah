"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { Toaster } from "sonner";
import { AuthSuccessToast } from "@/components/auth-success-toast";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
      >
        <SocketProvider>
          <NotificationProvider>
            <Toaster position="bottom-right" />
            <AuthSuccessToast />
            {children}
          </NotificationProvider>
        </SocketProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 
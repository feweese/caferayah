"use client";

import { useSession } from "next-auth/react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MinimalIcons as Icons } from "@/components/minimal-icons";
import { AlertCircle, Coffee } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {isAdmin && (
        <div className="bg-amber-50 dark:bg-zinc-800 text-amber-800 dark:text-white py-2 px-4 border-b border-amber-200 dark:border-zinc-700">
          <div className="container flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium">Admin Preview Mode</span>
            </div>
            <Link href="/admin">
              <Button size="sm" variant="outline" className="h-8 gap-1 text-amber-800 dark:text-white border-amber-200 dark:border-white/30 hover:bg-amber-100/60 dark:hover:bg-white/10">
                <Coffee className="h-3.5 w-3.5" />
                Back to Admin
              </Button>
            </Link>
          </div>
        </div>
      )}
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
} 
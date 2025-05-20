import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { LockKeyhole } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="rounded-full bg-blue-100 p-6 mx-auto w-24 h-24 flex items-center justify-center mb-6">
            <LockKeyhole className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold mb-3">401</h1>
          <h2 className="text-2xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            You need to be logged in to access this page. Please sign in with your account credentials to continue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>
          <div className="mt-6">
            <Button asChild variant="link">
              <Link href="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
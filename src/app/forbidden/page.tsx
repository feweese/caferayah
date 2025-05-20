import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="rounded-full bg-red-100 p-6 mx-auto w-24 h-24 flex items-center justify-center mb-6">
            <ShieldX className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold mb-3">403</h1>
          <h2 className="text-2xl font-semibold mb-4">Access Denied</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            Sorry, you don't have permission to access this page. Please contact the administrator if you believe this is an error.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
import Link from "next/link";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Coffee } from "lucide-react";

export default function NotFound() {
  return (
    <MainLayout>
      <div className="container flex flex-col items-center justify-center py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="rounded-full bg-primary/10 p-6 mx-auto w-24 h-24 flex items-center justify-center mb-6">
            <Coffee className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-3">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground max-w-sm mx-auto mb-8">
            Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/menu">View Menu</Link>
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
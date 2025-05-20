import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only admins can access this page
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Add New Product</h1>
            <p className="text-muted-foreground mt-1">
              Create a new product in your catalog
            </p>
          </div>
          <div>
            <Link href="/admin/products">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <ProductForm />
        </div>
      </div>
    </AdminLayout>
  );
} 
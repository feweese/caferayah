import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { ProductCategory } from "@/types/types";

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const products = await db.product.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  // Format product categories and dates for display before passing to client component
  const formattedProducts = products.map(product => ({
    ...product,
    formattedCategory: formatCategoryName(product.category),
  }));

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product inventory
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link href="/admin/products/new">
              <Button>Add New Product</Button>
            </Link>
          </div>
        </div>

        <ProductsTable products={formattedProducts} />
      </div>
    </AdminLayout>
  );
}

function formatCategoryName(category: ProductCategory): string {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
} 
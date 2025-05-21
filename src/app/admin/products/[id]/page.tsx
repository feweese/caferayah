import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";

// Disable caching for this page
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Only admins can access this page
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/");
  }

  // Remove the awaiting of params
  const productId = params.id;
  
  // Get product details with cache busting
  const cacheParam = Date.now();
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      addons: true
    }
  });

  if (!product) {
    redirect("/admin/products");
  }
  
  // Ensure sizePrices is always available and properly formatted
  const sizePrices = product.sizePricing 
    ? (product.sizePricing as Record<string, number>)
    : {
        SIXTEEN_OZ: product.basePrice
      };
  
  if (product.sizes.includes("TWENTY_TWO_OZ") && !sizePrices.TWENTY_TWO_OZ) {
    sizePrices.TWENTY_TWO_OZ = Math.round(product.basePrice * 1.2);
  }
  
  console.log("Product loaded with sizePrices:", sizePrices);

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Edit Product</h1>
            <p className="text-muted-foreground mt-1">
              Update product information
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Link href={`/menu/${product.id}`} target="_blank">
              <Button variant="secondary">View on Menu</Button>
            </Link>
            <DeleteProductButton 
              productId={product.id} 
              productName={product.name} 
            />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <ProductForm 
            product={{
              id: product.id,
              name: product.name,
              description: product.description,
              category: product.category,
              basePrice: product.basePrice,
              images: product.images,
              inStock: product.inStock,
              temperatures: product.temperatures,
              sizes: product.sizes,
              featured: product.featured,
              addons: product.addons,
              sizePrices: sizePrices
            }}
          />
        </div>
      </div>
    </AdminLayout>
  );
} 
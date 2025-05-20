import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Await params before using its properties
    const resolvedParams = await params;
    const productId = resolvedParams.id;
    
    // Get the featured status from query string
    const url = new URL(req.url);
    const featured = url.searchParams.get("featured") === "true";
    
    // Make sure the product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    // Update the featured status
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: { featured },
    });
    
    // Return the updated product
    return NextResponse.json({
      message: `Product ${featured ? "added to" : "removed from"} featured products`,
      featured: updatedProduct.featured
    });
    
  } catch (error) {
    console.error("Error updating featured status:", error);
    return NextResponse.json(
      { error: "Failed to update featured status" },
      { status: 500 }
    );
  }
} 
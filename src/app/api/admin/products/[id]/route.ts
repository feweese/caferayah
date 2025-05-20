import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for validating product update data
const productUpdateSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }).optional(),
  category: z.enum(["COFFEE", "BARISTA_DRINKS", "MILK_TEA", "MILK_SERIES", "MATCHA_SERIES", "SODA_SERIES"]).optional(),
  basePrice: z.coerce.number().min(1, { message: "Price must be at least 1" }).optional(),
  images: z.array(z.string()).optional(),
  temperatures: z.array(z.enum(["HOT", "ICED", "BOTH"])).optional(),
  sizes: z.array(z.enum(["SIXTEEN_OZ", "TWENTY_TWO_OZ"])).optional(),
  featured: z.boolean().optional(),
  addons: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    price: z.number()
  })).optional(),
  sizePricing: z.record(z.string(), z.number()).optional()
});

// GET - Retrieve a product by ID
export async function GET(
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
    const id = resolvedParams.id;
    
    // Get product from database
    const product = await db.product.findUnique({
      where: { id },
      include: { addons: true }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    // Format response with proper size pricing
    const productWithSizePrices = {
      ...product,
      sizePrices: product.sizePricing 
        ? (product.sizePricing as Record<string, number>) 
        : {}
    };
    
    return NextResponse.json(productWithSizePrices);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH - Update a product
export async function PATCH(
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
    const id = resolvedParams.id;
    
    // Check if product exists
    const product = await db.product.findUnique({
      where: { id },
      include: { addons: true }
    });
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    console.log("Update product data:", JSON.stringify(body, null, 2));
    
    const validationResult = productUpdateSchema.partial().safeParse(body);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return NextResponse.json(
        { error: "Invalid product data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { addons, sizePricing, ...productData } = validationResult.data;
    
    // Log temperature values for debugging
    if (productData.temperatures) {
      console.log("Temperatures from request:", productData.temperatures);
    }
    
    try {
      // Handle sizePricing properly - include it directly in the product update
      // This is more reliable than using a separate raw SQL query
      if (sizePricing) {
        console.log("Size pricing to be updated:", sizePricing);
        // Ensure the sizePricing field is properly JSON formatted
        productData.sizePricing = sizePricing;
      }
      
      // Update the product with all fields including JSON
      const updatedProduct = await db.product.update({
        where: { id },
        data: {
          ...productData,
        },
        include: {
          addons: true
        }
      });
      
      // Handle addons update if provided
      if (addons) {
        // Delete all existing addons
        await db.addon.deleteMany({
          where: { productId: id }
        });
        
        // Create new addons
        if (addons.length > 0) {
          await db.addon.createMany({
            data: addons.map(addon => ({
              productId: id,
              name: addon.name,
              price: addon.price,
              inStock: addon.inStock ?? true
            }))
          });
        }
      }
      
      // Fetch the final product with all updates
      const finalProduct = await db.product.findUnique({
        where: { id },
        include: { addons: true }
      });
      
      if (!finalProduct) {
        return NextResponse.json(
          { error: "Failed to retrieve updated product" },
          { status: 500 }
        );
      }
      
      // Log the temperatures in the updated product
      console.log("Final product temperatures:", finalProduct.temperatures);
      console.log("Final sizePricing:", finalProduct.sizePricing);
      
      // Return the updated product with size prices
      const productWithSizePrices = {
        ...finalProduct,
        sizePrices: finalProduct.sizePricing 
          ? (finalProduct.sizePricing as Record<string, number>) 
          : {}
      };
      
      return NextResponse.json(productWithSizePrices);
    } catch (error) {
      console.error("Database operation error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a product
export async function DELETE(
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
    
    console.log(`Processing deletion request for product ID: ${productId}`);
    
    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id: productId },
      include: {
        addons: true,
        orderItems: true,
        reviews: true
      }
    });
    
    if (!existingProduct) {
      console.log(`Product with ID ${productId} not found`);
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    console.log(`Found product "${existingProduct.name}" with ${existingProduct.addons.length} addons, ${existingProduct.orderItems.length} order items, and ${existingProduct.reviews.length} reviews`);
    
    // Check if product is used in orders - prevent deletion if it is
    if (existingProduct.orderItems.length > 0) {
      console.log(`Cannot delete product ${productId} because it's referenced in ${existingProduct.orderItems.length} orders`);
      return NextResponse.json(
        { 
          error: "Cannot delete product",
          details: `This product is used in ${existingProduct.orderItems.length} orders and cannot be deleted. You can mark it as out of stock instead.` 
        },
        { status: 400 }
      );
    }
    
    try {
      // First delete all related addons
      if (existingProduct.addons.length > 0) {
        console.log(`Deleting ${existingProduct.addons.length} addons for product ${productId}`);
        await db.addon.deleteMany({
          where: { productId }
        });
      }
      
      // Delete all related reviews
      if (existingProduct.reviews.length > 0) {
        console.log(`Deleting ${existingProduct.reviews.length} reviews for product ${productId}`);
        await db.review.deleteMany({
          where: { productId }
        });
      }
      
      // Delete the product
      console.log(`Deleting product ${productId}`);
      await db.product.delete({
        where: { id: productId },
      });
      
      console.log(`Product ${productId} successfully deleted`);
      
      return NextResponse.json(
        { message: "Product deleted successfully" },
        { status: 200 }
      );
    } catch (dbError) {
      console.error(`Database error while deleting product ${productId}:`, dbError);
      
      // Check for foreign key constraint error
      const errorMessage = dbError instanceof Error ? dbError.message : "Unknown database error";
      if (errorMessage.includes("Foreign key constraint") || errorMessage.includes("constraint violation")) {
        return NextResponse.json(
          { 
            error: "Cannot delete product",
            details: "This product is referenced in orders and cannot be deleted. You can mark it as out of stock instead."
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Database error during deletion",
          details: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in DELETE product handler:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 
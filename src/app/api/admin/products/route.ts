import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for validating product data
const productSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  category: z.enum(["COFFEE", "BARISTA_DRINKS", "MILK_TEA", "MILK_SERIES", "MATCHA_SERIES", "SODA_SERIES"]),
  basePrice: z.coerce.number().min(1, { message: "Price must be at least 1" }),
  images: z.array(z.string()).default([]),
  temperatures: z.array(z.enum(["HOT", "ICED", "BOTH"])),
  sizes: z.array(z.enum(["SIXTEEN_OZ", "TWENTY_TWO_OZ"])),
  featured: z.boolean().default(false),
  addons: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    price: z.number()
  })).optional(),
  sizePricing: z.record(z.string(), z.number()).optional()
});

// GET - List all products
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    
    // Base query
    const whereClause: any = {};
    
    // Add filter for category if provided
    if (category) {
      whereClause.category = category;
    }
    
    // Get products with filtering
    const products = await db.product.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        addons: true,
      },
    });
    
    // Add sizePrices to the response (to be implemented in the future if needed)
    const productsWithSizePrices = products.map(product => ({
      ...product,
      sizePrices: {} // We don't have this data yet, but we'll include it for consistency
    }));
    
    return NextResponse.json(productsWithSizePrices);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
      console.log("Received product data:", JSON.stringify(body, null, 2));
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    const validationResult = productSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.format());
      return NextResponse.json(
        { error: "Invalid product data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const productData = validationResult.data;
    // Extract fields that need special handling
    const { addons, sizePricing, ...productInfo } = productData;
    
    try {
      // Create the product without the JSON field
      const product = await db.product.create({
        data: {
          ...productInfo,
          inStock: true, // Always set products as in stock by default
          // Create addons if provided
          ...(addons && addons.length > 0
            ? {
                addons: {
                  create: addons.map(addon => ({
                    name: addon.name,
                    price: addon.price,
                    inStock: true
                  }))
                }
              }
            : {})
        },
        include: {
          addons: true
        }
      });
      
      // If sizePricing is provided, update it in a separate step
      // using Prisma's data property for JSON fields
      if (sizePricing) {
        await db.$queryRaw`UPDATE "Product" SET "sizePricing" = ${JSON.stringify(sizePricing)}::jsonb WHERE id = ${product.id}`;
      }
      
      // Fetch the updated product
      const updatedProduct = await db.product.findUnique({
        where: { id: product.id },
        include: { addons: true }
      });
      
      // Return product with size prices in the standard format
      const productWithSizePrices = {
        ...updatedProduct,
        sizePrices: updatedProduct.sizePricing ? (updatedProduct.sizePricing as Record<string, number>) : {}
      };
      
      return NextResponse.json(productWithSizePrices, { status: 201 });
    } catch (error) {
      console.error("Database operation error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 
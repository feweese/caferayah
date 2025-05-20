import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Define enums for product creation
enum ProductCategory {
  COFFEE = "COFFEE"
}

enum Temperature {
  HOT = "HOT",
  ICED = "ICED"
}

enum Size {
  SIXTEEN_OZ = "SIXTEEN_OZ",
  TWENTY_TWO_OZ = "TWENTY_TWO_OZ"
}

export async function GET() {
  try {
    // Create a single coffee product
    const product = await db.product.create({
      data: {
        name: "Caramel Macchiato",
        description: "Rich espresso with velvety steamed milk and sweet caramel drizzle",
        category: ProductCategory.COFFEE,
        basePrice: 165,
        images: ["https://placehold.co/600x400/brown/white?text=Caramel+Macchiato"],
        temperatures: [Temperature.HOT, Temperature.ICED],
        sizes: [Size.SIXTEEN_OZ, Size.TWENTY_TWO_OZ],
        inStock: true,
      },
    });

    // Add some addons
    await db.addon.createMany({
      data: [
        {
          name: "Extra Shot",
          price: 30,
          inStock: true,
          productId: product.id,
        },
        {
          name: "Caramel Drizzle",
          price: 20,
          inStock: true,
          productId: product.id,
        },
        {
          name: "Whipped Cream",
          price: 15,
          inStock: true,
          productId: product.id,
        }
      ],
    });

    return NextResponse.json(
      { 
        message: "Product created successfully", 
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.basePrice
        } 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { message: "Failed to create product", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 
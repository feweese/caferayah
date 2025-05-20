import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Define enums here since there are issues with Prisma client imports
enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN"
}

enum ProductCategory {
  COFFEE = "COFFEE",
  BARISTA_DRINKS = "BARISTA_DRINKS",
  MILK_TEA = "MILK_TEA",
  MILK_SERIES = "MILK_SERIES",
  MATCHA_SERIES = "MATCHA_SERIES",
  SODA_SERIES = "SODA_SERIES"
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
    // Create super admin user
    const existingSuperAdmin = await db.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
      },
    });

    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const superAdmin = await db.user.create({
        data: {
          name: "Super Admin",
          email: "superadmin@caferayah.com",
          password: hashedPassword,
          role: UserRole.SUPER_ADMIN,
        },
      });

      await db.loyaltyPoints.create({
        data: {
          userId: superAdmin.id,
          points: 0,
        },
      });
    }

    // Create admin user
    const existingAdmin = await db.user.findFirst({
      where: {
        role: "ADMIN",
        email: "admin@caferayah.com",
      },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = await db.user.create({
        data: {
          name: "Admin User",
          email: "admin@caferayah.com",
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });

      await db.loyaltyPoints.create({
        data: {
          userId: admin.id,
          points: 0,
        },
      });
    }

    // Create sample customer
    const existingCustomer = await db.user.findFirst({
      where: {
        role: "CUSTOMER",
        email: "customer@example.com",
      },
    });

    if (!existingCustomer) {
      const hashedPassword = await bcrypt.hash("customer123", 10);
      const customer = await db.user.create({
        data: {
          name: "Sample Customer",
          email: "customer@example.com",
          password: hashedPassword,
          role: UserRole.CUSTOMER,
          address: "123 Sample St., Manila, Philippines",
          phoneNumber: "+639123456789",
        },
      });

      await db.loyaltyPoints.create({
        data: {
          userId: customer.id,
          points: 10,
        },
      });
    }

    // Create sample products
    const coffeeCount = await db.product.count({
      where: {
        category: ProductCategory.COFFEE,
      },
    });

    if (coffeeCount === 0) {
      // Coffee products
      const premiumLatte = await db.product.create({
        data: {
          name: "Premium Latte",
          description: "Rich espresso blended with smooth steamed milk",
          category: ProductCategory.COFFEE,
          basePrice: 150,
          images: ["/images/premium-latte.jpg"],
          temperatures: [Temperature.HOT, Temperature.ICED],
          sizes: [Size.SIXTEEN_OZ, Size.TWENTY_TWO_OZ],
          inStock: true,
        },
      });

      await db.addon.createMany({
        data: [
          {
            name: "Extra Shot",
            price: 30,
            inStock: true,
            productId: premiumLatte.id,
          },
          {
            name: "Vanilla Syrup",
            price: 20,
            inStock: true,
            productId: premiumLatte.id,
          },
        ],
      });

      const signatureMocha = await db.product.create({
        data: {
          name: "Signature Mocha",
          description: "Espresso with chocolate and steamed milk",
          category: ProductCategory.COFFEE,
          basePrice: 175,
          images: ["/images/signature-mocha.jpg"],
          temperatures: [Temperature.HOT, Temperature.ICED],
          sizes: [Size.SIXTEEN_OZ, Size.TWENTY_TWO_OZ],
          inStock: true,
        },
      });

      await db.addon.createMany({
        data: [
          {
            name: "Extra Shot",
            price: 30,
            inStock: true,
            productId: signatureMocha.id,
          },
          {
            name: "Whipped Cream",
            price: 15,
            inStock: true,
            productId: signatureMocha.id,
          },
        ],
      });

      // Matcha product
      const matchaFusion = await db.product.create({
        data: {
          name: "Matcha Fusion",
          description: "Premium matcha with a hint of vanilla",
          category: ProductCategory.MATCHA_SERIES,
          basePrice: 180,
          images: ["/images/matcha-fusion.jpg"],
          temperatures: [Temperature.HOT, Temperature.ICED],
          sizes: [Size.SIXTEEN_OZ, Size.TWENTY_TWO_OZ],
          inStock: true,
        },
      });

      await db.addon.createMany({
        data: [
          {
            name: "Almond Milk",
            price: 25,
            inStock: true,
            productId: matchaFusion.id,
          },
          {
            name: "Extra Matcha",
            price: 35,
            inStock: true,
            productId: matchaFusion.id,
          },
        ],
      });

      // Milk tea product
      const classicMilkTea = await db.product.create({
        data: {
          name: "Classic Milk Tea",
          description: "Traditional milk tea with pearls",
          category: ProductCategory.MILK_TEA,
          basePrice: 160,
          images: ["/images/classic-milk-tea.jpg"],
          temperatures: [Temperature.ICED],
          sizes: [Size.SIXTEEN_OZ, Size.TWENTY_TWO_OZ],
          inStock: true,
        },
      });

      await db.addon.createMany({
        data: [
          {
            name: "Extra Pearls",
            price: 20,
            inStock: true,
            productId: classicMilkTea.id,
          },
          {
            name: "Pudding",
            price: 25,
            inStock: true,
            productId: classicMilkTea.id,
          },
        ],
      });
    }

    return NextResponse.json(
      { message: "Database seeded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { message: "Failed to seed database", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 
// seed-product.js
const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  try {
    // Create a single coffee product
    const product = await prisma.product.create({
      data: {
        name: "Vanilla Latte",
        description: "Smooth espresso with rich vanilla flavor and steamed milk",
        category: "COFFEE",
        basePrice: 155,
        images: ["https://placehold.co/600x400/brown/white?text=Vanilla+Latte"],
        temperatures: ["HOT", "ICED"],
        sizes: ["SIXTEEN_OZ", "TWENTY_TWO_OZ"],
        inStock: true,
      },
    });

    console.log('Created product:', product);

    // Add some addons
    const addons = await prisma.addon.createMany({
      data: [
        {
          name: "Extra Shot",
          price: 30,
          inStock: true,
          productId: product.id,
        },
        {
          name: "Vanilla Syrup",
          price: 20,
          inStock: true,
          productId: product.id,
        }
      ],
    });

    console.log('Created addons:', addons);

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Error seeding product:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
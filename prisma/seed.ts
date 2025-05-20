import { PrismaClient } from "../src/generated/prisma";
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Delete existing admin user to avoid duplicate email errors on reseeding
  await prisma.user.deleteMany({
    where: {
      email: 'admin@caferayah.com',
    },
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@caferayah.com',
      password: hashedPassword,
      role: 'ADMIN',
      phoneNumber: '09123456789',
      address: '123 Admin Street, Admin City',
      image: null,
    },
  });

  console.log('Created admin user:', admin.email);

  // You could add other seed data here like products, categories, etc.
  console.log('Seeding completed!');

  // Initialize status history for existing orders
  console.log("Initializing status history for existing orders...");
  const orders = await prisma.order.findMany();

  for (const order of orders) {
    // Check if the order already has status history
    const existingHistory = await prisma.orderStatusHistory.findFirst({
      where: {
        orderId: order.id
      }
    });

    if (!existingHistory) {
      // Create a status history entry with the current status
      await prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          // Use the order's creation date for the initial status
          createdAt: order.createdAt
        }
      });

      // If the order is completed or cancelled, add those statuses too
      if (order.status === "COMPLETED" && order.completedAt) {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "COMPLETED",
            createdAt: order.completedAt
          }
        });
      } else if (order.status === "CANCELLED" && order.cancelledAt) {
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            createdAt: order.cancelledAt
          }
        });
      }
    }
  }

  console.log("Status history initialization completed!");
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
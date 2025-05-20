import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting review fix script...');
  
  // Find all reviews without an orderId
  const reviewsWithoutOrderId = await prisma.review.findMany({
    where: {
      orderId: null,
    },
    include: {
      user: true,
      product: true,
    },
  });
  
  console.log(`Found ${reviewsWithoutOrderId.length} reviews without orderId`);
  
  if (reviewsWithoutOrderId.length === 0) {
    console.log('No reviews to fix.');
    return;
  }
  
  // For each review without orderId, find a completed order from the user
  // that includes the product, and associate the review with that order
  for (const review of reviewsWithoutOrderId) {
    console.log(`Processing review ${review.id} for product ${review.product.name} by user ${review.user.name}`);
    
    try {
      // Find a completed order from this user that contains this product
      const order = await prisma.order.findFirst({
        where: {
          userId: review.userId,
          status: 'COMPLETED',
          items: {
            some: {
              productId: review.productId,
            },
          },
        },
      });
      
      if (order) {
        // Update the review with the found order ID
        await prisma.review.update({
          where: { id: review.id },
          data: { orderId: order.id },
        });
        console.log(`Updated review ${review.id} with order ${order.id}`);
      } else {
        // If no order is found, create a placeholder order
        console.log(`No matching order found for review ${review.id}. Creating placeholder order.`);
        
        // Create a placeholder completed order
        const placeholderOrder = await prisma.order.create({
          data: {
            userId: review.userId,
            status: 'COMPLETED',
            total: 0,
            deliveryMethod: 'PICKUP',
            paymentMethod: 'IN_STORE',
            items: {
              create: {
                productId: review.productId,
                quantity: 1,
                price: 0,
                size: 'SIXTEEN_OZ',
                temperature: 'HOT',
              },
            },
          },
        });
        
        // Update the review with the placeholder order ID
        await prisma.review.update({
          where: { id: review.id },
          data: { orderId: placeholderOrder.id },
        });
        console.log(`Created placeholder order ${placeholderOrder.id} for review ${review.id}`);
      }
    } catch (error) {
      console.error(`Error processing review ${review.id}:`, error);
    }
  }
  
  console.log('Review fix script completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getImagePath } from "@/lib/products";

export async function GET(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(req.url);
    const query = url.searchParams.get("q") || "";
    const type = url.searchParams.get("type") || "all"; // all, products, users, orders, reviews
    const limit = parseInt(url.searchParams.get("limit") || "5");

    console.log("Search API called with query:", query, "type:", type, "limit:", limit);

    // Return empty results for empty queries
    if (!query.trim()) {
      console.log("Empty query, returning empty results");
      return NextResponse.json({ results: [] });
    }

    // Search results array
    let results: any[] = [];

    // Search based on type
    if (type === "all" || type === "products") {
      try {
        // Search products with minimal required fields
        const products = await db.product.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          take: type === "all" ? limit : limit * 2,
          select: {
            id: true,
            name: true,
            basePrice: true,
            category: true,
            images: true,
          },
        });

        console.log(`Found ${products.length} products matching "${query}"`);

        results = [
          ...results,
          ...products.map((product) => {
            // Robust image handling
            let imagePath = '/images/placeholder.jpg';
            
            // Only try to access the image if it exists
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              // Use a simple path construction instead of the utility function
              const imageName = product.images[0];
              if (typeof imageName === 'string' && imageName.trim() !== '') {
                if (imageName.startsWith('http')) {
                  // Full URL
                  imagePath = imageName;
                  console.log(`Product ${product.id} image: Using full URL: ${imagePath}`);
                } else if (imageName.startsWith('/')) {
                  // Absolute path starting with /
                  imagePath = imageName;
                  console.log(`Product ${product.id} image: Using absolute path: ${imagePath}`);
                } else {
                  // Try different common paths for product images
                  // This provides more flexibility if the image storage path changes
                  const possiblePaths = [
                    `/uploads/products/${imageName}`,
                    `/images/products/${imageName}`,
                    `/uploads/${imageName}`,
                    `/temp_uploads/${imageName}`,
                    `/${imageName}`
                  ];
                  
                  // Check if we can detect the image location from the existing product images
                  const existingProductWithImage = results.find(r => 
                    r.type === 'product' && 
                    r.image && 
                    typeof r.image === 'string' && 
                    r.image.includes('/') &&
                    !r.image.includes(imageName)
                  );
                  
                  if (existingProductWithImage && existingProductWithImage.image) {
                    // Extract the directory path from an existing image
                    const pathMatch = existingProductWithImage.image.match(/(.*\/)/);
                    if (pathMatch && pathMatch[1]) {
                      const existingImageDir = pathMatch[1];
                      possiblePaths.unshift(`${existingImageDir}${imageName}`);
                      console.log(`Product ${product.id} image: Found existing image path pattern: ${existingImageDir}`);
                    }
                  }
                  
                  // Use the first path format from our list
                  imagePath = possiblePaths[0];
                  console.log(`Product ${product.id} image: Using path: ${imagePath}`);
                }
              } else {
                console.log(`Product ${product.id} has invalid image name: ${imageName}`);
              }
            } else {
              console.log(`Product ${product.id} has no images, using placeholder`);
            }

            return {
              id: product.id,
              type: "product",
              title: product.name || "Unnamed Product",
              description: `₱${(product.basePrice || 0).toFixed(2)} · ${formatCategoryName(product.category)}`,
              image: imagePath,
              url: `/admin/products/${product.id}`,
              badges: [{ text: formatCategoryName(product.category), color: "blue" }],
            };
          }),
        ];
      } catch (error) {
        console.error("Error searching products:", error);
      }
    }

    if (type === "all" || type === "users") {
      try {
        // Restrict regular admins to only search for customers
        const userWhereClause = session.user.role === "SUPER_ADMIN" 
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            } 
          : {
              AND: [
                { role: "CUSTOMER" },
                {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                  ],
                },
              ],
            };

        // Search users
        const users = await db.user.findMany({
          where: userWhereClause,
          take: type === "all" ? limit : limit * 2,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            points: {
              select: {
                points: true,
              },
            },
          },
        });

        results = [
          ...results,
          ...users.map((user) => ({
            id: user.id,
            type: "user",
            title: user.name,
            description: user.email,
            image: user.image,
            url: `/admin/users/${user.id}`,
            status: user.role,
            badges: [
              { text: formatRoleName(user.role), color: getRoleColor(user.role) },
              user.points ? { text: `${user.points.points} Points`, color: "amber" } : null,
            ].filter(Boolean),
          })),
        ];
      } catch (error) {
        console.error("Error searching users:", error);
      }
    }

    if (type === "all" || type === "orders") {
      try {
        // Search orders with minimal required fields
        const orders = await db.order.findMany({
          where: {
            OR: [
              { id: { contains: query } },
              { user: { name: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
            ],
          },
          take: type === "all" ? limit : limit * 2,
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            user: {
              select: {
                name: true,
              },
            },
            items: {
              select: {
                price: true,
                quantity: true,
              }
            }
          },
        });

        console.log(`Found ${orders.length} orders matching "${query}"`);

        // For each order, fetch additional details in separate queries
        // to avoid schema issues with the original search
        const orderResults = await Promise.all(orders.map(async (order) => {
          try {
            // Calculate base subtotal from items
            const subtotal = order.items.reduce(
              (total, item) => total + ((item?.price || 0) * (item?.quantity || 1)), 
              0
            );
            
            // Try to fetch additional order details separately to avoid schema issues
            let deliveryFee = 0;
            let pointsUsed = 0;
            let hasDelivery = false;
            let originalTotal = order.total || 0;
            
            try {
              // Fetch additional order details with a more targeted select
              const orderDetails = await db.order.findUnique({
                where: { id: order.id },
                select: {
                  total: true,
                  status: true,
                  deliveryFee: true,
                  pointsUsed: true,
                  deliveryMethod: true,
                  paymentMethod: true,
                }
              });
              
              if (orderDetails) {
                // Preserve the original total from the database for comparison
                originalTotal = orderDetails.total || order.total || 0;
                
                // Check if delivery fee should apply based on deliveryMethod
                hasDelivery = !!(
                  orderDetails.deliveryMethod === 'DELIVERY' || 
                  (orderDetails.paymentMethod && 
                    (orderDetails.paymentMethod.toUpperCase().includes('DELIVERY') || 
                     orderDetails.paymentMethod.toLowerCase() === 'cod'))
                );
                
                // Get delivery fee if applicable
                deliveryFee = hasDelivery ? (orderDetails.deliveryFee || 50) : 0;
                
                // Get points discount
                pointsUsed = orderDetails.pointsUsed || 0;
                
                console.log(`Order ${order.id} details: method=${orderDetails.deliveryMethod}, deliveryFee=${deliveryFee}, pointsUsed=${pointsUsed}, hasDelivery=${hasDelivery}, status=${orderDetails.status}`);
              }
            } catch (detailsError) {
              // If details fetch fails, fall back to stored total
              console.error(`Cannot fetch additional details for order ${order.id}: ${detailsError.message}`);
              
              // Get the error details and log schema information to help debug
              if (detailsError.message.includes('Unknown field')) {
                console.log('Schema mismatch detected. Check your Prisma schema definition for Order model');
              }
            }
            
            // Calculate the total using the formula from the customer order page
            const calculatedTotal = subtotal + deliveryFee - pointsUsed;
            
            console.log(`Order ${order.id} total calculation: subtotal=${subtotal}, deliveryFee=${deliveryFee}, pointsUsed=${pointsUsed}, calculatedTotal=${calculatedTotal}, originalTotal=${originalTotal}`);
            
            // Use calculated total or fall back to stored total
            const displayTotal = !isNaN(calculatedTotal) ? calculatedTotal : (originalTotal || subtotal);
            
            // Check if there's a significant difference between calculated and original
            const hasTotalDiscrepancy = Math.abs(originalTotal - calculatedTotal) > 1;
            
            return {
              id: order.id,
              type: "order",
              title: `Order #${order.id.slice(0, 8)}`,
              description: `${order.user?.name || "Anonymous"} · ₱${displayTotal.toFixed(2)}`,
              url: `/admin/orders/${order.id}`,
              status: order.status,
              statusColor: getOrderStatusColor(order.status),
              badges: [
                { text: formatOrderStatus(order.status), color: getOrderStatusColor(order.status) },
                { text: new Date(order.createdAt).toLocaleDateString(), color: "gray" },
                // Add fee and points badges if applicable
                hasDelivery ? { text: `+₱${deliveryFee} fee`, color: "blue" } : null,
                pointsUsed > 0 ? { text: `-₱${pointsUsed} points`, color: "green" } : null,
                // Add a badge if there's a discrepancy in total
                hasTotalDiscrepancy && originalTotal > 0 ? { text: "Adjusted total", color: "orange" } : null,
              ].filter(Boolean),
            };
          } catch (err) {
            console.error("Error processing order for search results:", err);
            return {
              id: order.id,
              type: "order",
              title: `Order #${order.id.slice(0, 8)}`,
              description: order.user?.name || "Anonymous",
              url: `/admin/orders/${order.id}`,
              status: order.status,
              statusColor: getOrderStatusColor(order.status),
              badges: [
                { text: formatOrderStatus(order.status), color: getOrderStatusColor(order.status) },
              ],
            };
          }
        }));

        results = [...results, ...orderResults];
      } catch (error) {
        console.error("Error searching orders:", error);
      }
    }

    if (type === "all" || type === "reviews") {
      try {
        // Search reviews
        const reviews = await db.review.findMany({
          where: {
            OR: [
              { comment: { contains: query, mode: "insensitive" } },
              { user: { name: { contains: query, mode: "insensitive" } } },
              { product: { name: { contains: query, mode: "insensitive" } } },
            ],
          },
          take: type === "all" ? limit : limit * 2,
          select: {
            id: true,
            rating: true,
            comment: true,
            approved: true,
            rejected: true,
            user: {
              select: {
                name: true,
              },
            },
            product: {
              select: {
                name: true,
              },
            },
          },
        });

        results = [
          ...results,
          ...reviews.map((review) => {
            let status = "Pending";
            let statusColor = "yellow";
            
            if (review.approved) {
              status = "Approved";
              statusColor = "green";
            } else if (review.rejected) {
              status = "Rejected";
              statusColor = "red";
            }
            
                          return {              id: review.id,              type: "review",              title: `${review.user?.name || "Anonymous"}'s Review`,              description: review.comment ? (review.comment.length > 60 ? `${review.comment.slice(0, 57)}...` : review.comment) : `${review.rating}/5 stars`,              url: `/admin/reviews?id=${review.id}`,              status,              statusColor,              badges: [                { text: `${review.rating}/5 ★`, color: "amber" },                { text: review.product?.name || "Unknown Product", color: "blue" },                { text: status, color: statusColor },              ],              };
          }),
        ];
      } catch (error) {
        console.error("Error searching reviews:", error);
      }
    }

    // Sort results to mix different types
    const sortedResults = results.slice(0, limit);

    console.log(`Returning ${sortedResults.length} total results for "${query}"`);
    
    return NextResponse.json({ results: sortedResults });
  } catch (error) {
    console.error("Error in global search:", error);
    return NextResponse.json(
      { error: "Failed to perform search" },
      { status: 500 }
    );
  }
}

// Helper functions
function formatCategoryName(category: string): string {
  if (!category) return "Uncategorized";
  
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatRoleName(role: string): string {
  if (!role) return "User";
  
  return role.charAt(0) + role.slice(1).toLowerCase().replace("_", " ");
}

function getRoleColor(role: string): string {
  if (!role) return "gray";
  
  switch (role) {
    case "SUPER_ADMIN":
      return "red";
    case "ADMIN":
      return "blue";
    default:
      return "green";
  }
}

function formatOrderStatus(status: string): string {
  if (!status) return "Unknown";
  
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

function getOrderStatusColor(status: string): string {
  if (!status) return "gray";
  
  switch (status) {
    case "RECEIVED":
      return "blue";
    case "PREPARING":
      return "yellow";
    case "OUT_FOR_DELIVERY":
      return "purple";
    case "READY_FOR_PICKUP":
      return "indigo";
    case "COMPLETED":
      return "green";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
} 
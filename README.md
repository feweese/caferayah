# CafeRayah - Cafe Management System

## Project Overview
CafeRayah is a comprehensive cafe management system designed for coffee shops and cafes to handle online ordering, inventory management, customer loyalty programs, and administrative tasks. It serves cafe owners, staff, and customers by providing a streamlined platform for ordering beverages, managing operations, and enhancing customer engagement.

## Features

### Customer Features
- **User Authentication** [Working]
  - Registration, login, password reset, and email verification
  - Multiple authentication methods including credentials and OAuth

- **Product Browsing** [Working]
  - Browse products by category
  - View product details including descriptions, prices, and options

- **Shopping Cart** [Working]
  - Add products to cart with customization options
  - Modify quantities and remove items
  - Cart persistence across sessions

- **Checkout Process** [Working]
  - Multiple delivery methods (pickup or delivery)
  - Payment method selection (Cash on Delivery or In-Store)
  - Address and contact information collection

- **Order Tracking** [Working]
  - View order status updates
  - Order history with details

- **Customer Profiles** [Working]
  - Personal information management
  - Order history access
  - Address management

- **Loyalty Program** [Working]
  - Points accumulation with purchases
  - Points redemption for discounts
  - Points history tracking

- **Product Reviews** [Working]
  - Submit reviews with ratings
  - View approved reviews from other customers

- **Notifications** [Partially Working]
  - Order status updates
  - Loyalty points notifications
  - Review approval status notifications

### Admin Features
- **Dashboard** [Working]
  - Overview of sales, orders, customers, and inventory
  - Recent activity monitoring
  - Sales analytics with charts and metrics

- **Product Management** [Working]
  - Add, edit, and delete products
  - Manage product categories, sizes, temperatures, and add-ons
  - Set pricing and availability

- **Order Management** [Working]
  - View and process incoming orders
  - Update order status
  - Order history with filtering options

- **Customer Management** [Working]
  - View and manage customer accounts
  - Check customer order history
  - Manage loyalty points

- **Review Management** [Working]
  - Approve or reject customer reviews
  - Provide feedback on rejected reviews

- **Analytics and Reporting** [Partially Working]
  - Sales reports by time period
  - Product popularity analysis
  - Basic revenue analytics

- **User Role Management** [Partially Working]
  - Create and manage admin accounts
  - Set permissions based on roles

- **Inventory Management** [Not Yet Implemented]
  - Track ingredient stock levels
  - Low stock alerts
  - Inventory usage reports

- **Marketing Tools** [Not Yet Implemented]
  - Create and manage promotions
  - Send promotional notifications
  - Special offers management

## User Roles and Permissions

### Super Admin
- **Access Level** [Working]
  - Full access to all system functions
  - Can create/modify other admin accounts
  - Complete system configuration control

### Admin
- **Access Level** [Working]
  - Access to admin dashboard
  - Manage products, orders, and customers
  - View analytics and reports
  - Process orders and reviews

### Customer
- **Access Level** [Working]
  - Browse products and place orders
  - Manage personal account information
  - Submit reviews and earn/redeem loyalty points
  - Track order status and history

## System Logic and Workflows

### Authentication Flow
- **Registration Process** [Working]
  - User submits registration form with personal information
  - System validates input and creates account
  - Verification email sent to confirm email address
  - User activates account via verification link

- **Login Process** [Working]
  - User enters credentials
  - System validates and creates authenticated session
  - Role-based redirect to appropriate dashboard

- **Password Reset** [Working]
  - User requests password reset
  - System sends reset link to registered email
  - User creates new password via secure form

### Order Processing Workflow
- **Order Creation** [Working]
  - Customer adds products to cart
  - Customer proceeds to checkout
  - Customer selects delivery method and payment option
  - System validates order and creates record
  - Loyalty points calculated and applied if redeemed

- **Order Fulfillment** [Working]
  - Admin receives notification of new order
  - Admin updates order status as it progresses
  - Customer receives notifications of status changes
  - Order marked as completed when delivered/picked up
  - Loyalty points awarded upon completion

- **Order Cancellation** [Working]
  - Either customer or admin can cancel order
  - System updates inventory and order status
  - Points refunded if used in order

### Review System Workflow
- **Review Submission** [Working]
  - Customer submits review with rating for purchased product
  - Review enters moderation queue
  - Admin reviews and approves/rejects submission
  - Customer notified of review status
  - Approved reviews displayed on product page

### Loyalty Program Logic
- **Points Earning** [Working]
  - Points awarded based on order total
  - Points added to customer account upon order completion

- **Points Redemption** [Working]
  - Customer selects to use points during checkout
  - System calculates discount based on points value
  - Points deducted from customer account

## Business Logic / Calculations

### Product Pricing
- **Base Price Calculation** [Working]
  - Products have base prices with modifiers for size
  - Add-ons increase price incrementally
  - Final product price = base price + size modifier + add-on total

### Loyalty Points
- **Points Earning Formula** [Working]
  - 1 point awarded per ₱100 spent on orders
  - Points rounded down to nearest whole number

- **Points Redemption Value** [Working]
  - 10 points = ₱10 discount
  - Maximum redemption limited by available points

### Order Totals
- **Order Calculation** [Working]
  - Subtotal = Sum of (item price × quantity)
  - Total = Subtotal + delivery fee - points discount

## Database Structure

### Main Entities
- **User** [Working]
  - Personal information, authentication, and role data
  - Linked to orders, reviews, and loyalty points

- **Product** [Working]
  - Product details, pricing, categories, and options
  - Images, descriptions, and availability status

- **Order** [Working]
  - Order information, status, and fulfillment details
  - Contains order items and payment information

- **OrderItem** [Working]
  - Individual items within orders
  - Links to products with selected options and quantity

- **Addon** [Working]
  - Product customization options
  - Additional price modifiers

- **LoyaltyPoints** [Working]
  - Customer points balance
  - Connected to customer account

- **PointsHistory** [Working]
  - Record of point transactions
  - Includes earning, redemption, and expiration

- **Review** [Working]
  - Customer product reviews with ratings
  - Moderation status and administrative feedback

- **Notification** [Working]
  - System messages for users
  - Various notification types and read status

## Technology Stack

### Frontend
- Next.js 15.3.1 (React 19)
- TypeScript
- Tailwind CSS for styling
- Shadcn UI components
- React Hook Form for form handling
- Zod for validation
- Zustand for state management
- Recharts for data visualization

### Backend
- Next.js API routes
- Prisma ORM
- PostgreSQL database
- NextAuth.js for authentication
- Socket.io for real-time features

### Deployment & Infrastructure
- Vercel (recommended deployment platform)
- PostgreSQL database hosting

## Project Structure

```
caferayah/
├── src/                 # Source code
│   ├── app/             # Next.js app router pages
│   │   ├── admin/       # Admin dashboard and features
│   │   ├── api/         # API endpoints
│   │   └── ...          # Customer-facing pages
│   ├── components/      # React components
│   │   ├── admin/       # Admin-specific components
│   │   ├── ui/          # Reusable UI components
│   │   └── ...          # Feature-specific components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and configurations
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   └── middleware.ts    # Request middleware for auth/permissions
├── prisma/              # Database schema and migrations
│   ├── schema.prisma    # Prisma schema definition
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── ...                  # Configuration files
```

## Installation / Deployment Instructions

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager
- PostgreSQL database

### Local Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/caferayah.git
   cd caferayah
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables
   - Create a `.env` file based on `.env.example`
   - Configure database connection string and authentication secrets

4. Set up the database
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Access the application at `http://localhost:3000`

## Sample Credentials

### Admin Access
- Email: admin@caferayah.com
- Password: Admin123!

### Customer Access
- Email: customer@example.com
- Password: Customer123!

## Known Issues / Limitations

### Current Issues
- Notifications system needs improvement for real-time updates
- Analytics features are limited to basic reporting
- Mobile responsiveness requires enhancement in some areas
- Admin role permissions need more granular control

### Planned Improvements
- Implement inventory management system
- Add marketing and promotion tools
- Enhance reporting and analytics capabilities
- Implement real-time order tracking with map integration
- Add multi-language support
- Integrate additional payment methods

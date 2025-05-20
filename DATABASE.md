# CafeRayah Database Documentation

## Overview

This document provides comprehensive documentation for the CafeRayah database schema. It details each table's purpose, structure, relationships, and functionality within the system. The database is designed to support a cafe management system with features for ordering, customer management, product inventory, loyalty programs, and administrative tasks.

## Database Structure Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    User     │     │    Order     │     │   Product   │
├─────────────┤     ├──────────────┤     ├─────────────┤
│ id          │─┐   │ id           │  ┌─>│ id          │
│ name        │ │   │ userId       │──┘  │ name        │
│ email       │ └──>│ status       │     │ description │
│ password    │     │ total        │     │ category    │
│ role        │     │ deliveryMethod│     │ basePrice   │
│ ...         │     │ ...          │     │ ...         │
└─────────────┘     └──────────────┘     └─────────────┘
      ▲  │               │  ▲                  ▲ │
      │  │               │  │                  │ │
      │  │               │  │                  │ │
      │  ▼               ▼  │                  │ ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│LoyaltyPoints│     │  OrderItem   │     │   Addon     │
├─────────────┤     ├──────────────┤     ├─────────────┤
│ id          │     │ id           │     │ id          │
│ userId      │─┐   │ orderId      │─┐   │ name        │
│ points      │ │   │ productId    │ │   │ price       │
│ ...         │ │   │ quantity     │ │   │ productId   │─┐
└─────────────┘ │   │ ...          │ │   │ ...         │ │
                │   └──────────────┘ │   └─────────────┘ │
                │                    │                   │
                ▼                    ▼                   │
┌─────────────┐     ┌──────────────┐                    │
│PointsHistory│     │    Review    │                    │
├─────────────┤     ├──────────────┤                    │
│ id          │     │ id           │                    │
│ userId      │─┐   │ userId       │─┐                  │
│ action      │ │   │ productId    │ └─────────────────┘
│ points      │ │   │ orderId      │─┐
│ ...         │ │   │ ...          │ │
└─────────────┘ │   └──────────────┘ │
                │                    │
                ▼                    ▼
              User                Product
```

## Tables Documentation

### User Table

**Purpose:** The User table stores information about all users in the system, including customers and administrators. It's the central entity for authentication and user management.

**Fields:**
- `id` (String): Primary key, unique identifier using CUID format
- `name` (String): User's full name
- `email` (String): User's email address, must be unique
- `emailVerified` (DateTime, optional): Timestamp when the user verified their email
- `password` (String, optional): Hashed password for authentication
- `role` (UserRole enum): Access level (SUPER_ADMIN, ADMIN, or CUSTOMER)
- `image` (String, optional): URL to user's profile image
- `address` (String, optional): User's physical address for deliveries
- `phoneNumber` (String, optional): User's contact number
- `createdAt` (DateTime): Timestamp when the account was created
- `updatedAt` (DateTime): Timestamp when the account was last updated

**Relationships:**
- One-to-Many with Account: A user can have multiple authentication accounts (social logins)
- One-to-One with LoyaltyPoints: Each user has one loyalty points record
- One-to-Many with Order: A user can place multiple orders
- One-to-Many with PointsHistory: A user has multiple loyalty points transactions
- One-to-Many with Review: A user can submit multiple product reviews
- One-to-Many with Session: A user can have multiple active sessions

**How It Works:**
- When a new user registers, a record is created with basic information and the CUSTOMER role by default
- Administrators are assigned ADMIN or SUPER_ADMIN roles manually or through a promotion process
- The email field serves as the primary identifier for authentication
- User passwords are hashed for security before storage
- The role field controls access to different areas of the application based on middleware checks
- The system tracks both creation and update timestamps for auditing purposes
- Related records like orders and reviews are associated through the user's ID

**Use Cases:**
- User authentication and authorization
- Profile management and information updates
- Order history and tracking for customers
- Access control for administrative functions
- Loyalty program participation and tracking
- Customer support and communication

### Account Table

**Purpose:** The Account table stores OAuth account information for users, enabling social login options like Google or Facebook authentication.

**Fields:**
- `id` (String): Primary key, unique identifier
- `userId` (String): Foreign key to the User table
- `type` (String): Type of account (oauth, email, etc.)
- `provider` (String): OAuth provider name (Google, Facebook, etc.)
- `providerAccountId` (String): User identifier on the provider platform
- `refresh_token` (String, optional): OAuth refresh token
- `access_token` (String, optional): OAuth access token
- `expires_at` (Int, optional): Timestamp when the token expires
- `token_type` (String, optional): Type of auth token
- `scope` (String, optional): OAuth scopes granted
- `id_token` (String, optional): OAuth ID token
- `session_state` (String, optional): OAuth session state

**Relationships:**
- Many-to-One with User: Multiple accounts can belong to a single user

**Constraints:**
- Unique compound constraint on [provider, providerAccountId]
- Cascade delete: If a user is deleted, all associated accounts are deleted

**How It Works:**
- When a user authenticates via a social provider, the system creates or updates an Account record
- The Account links the external identity (providerAccountId) to the internal User record
- The system stores authentication tokens to maintain the connection with the provider
- A user can have multiple accounts (e.g., both Google and Facebook logins linked to one user)
- NextAuth.js uses this table to manage the OAuth flow and session handling

**Use Cases:**
- Social login authentication
- Account linking across multiple providers
- Token management for external API access
- Simplified login experience for users

### Session Table

**Purpose:** The Session table manages user authentication sessions, tracking active logins and ensuring secure access to the system.

**Fields:**
- `id` (String): Primary key, unique identifier
- `sessionToken` (String): Unique token for the session
- `userId` (String): Foreign key to the User table
- `expires` (DateTime): Timestamp when the session expires

**Relationships:**
- Many-to-One with User: Multiple sessions can belong to a single user

**Constraints:**
- Unique constraint on sessionToken
- Cascade delete: If a user is deleted, all associated sessions are deleted

**How It Works:**
- When a user logs in, the system creates a new session with a unique token
- The session token is stored in a cookie on the client side
- The system validates the token against this table for authenticated requests
- Expired sessions are automatically invalidated
- The middleware checks this table to enforce authentication requirements

**Use Cases:**
- Maintaining user authentication state
- Supporting multiple devices/browsers for one user
- Enforcing session timeouts for security
- Enabling "remember me" functionality

### VerificationToken Table

**Purpose:** The VerificationToken table stores tokens for email verification and password reset processes, ensuring secure account management.

**Fields:**
- `identifier` (String): User identifier (typically email)
- `token` (String): Unique verification token
- `expires` (DateTime): Timestamp when the token expires

**Constraints:**
- Unique constraint on token
- Unique compound constraint on [identifier, token]

**How It Works:**
- When a user registers or requests a password reset, the system generates a unique token
- The token is stored with the user's identifier and an expiration time
- The token is sent to the user's email
- When the user clicks the link with the token, the system validates it against this table
- Once used, the token is deleted to prevent reuse
- Expired tokens are periodically cleaned up

**Use Cases:**
- Email verification during registration
- Password reset requests
- Secure account activation processes
- One-time-use security links

### Product Table

**Purpose:** The Product table stores all products offered by the cafe, including details, pricing, and configuration options.

**Fields:**
- `id` (String): Primary key, unique identifier
- `name` (String): Product name
- `description` (String): Detailed product description
- `category` (ProductCategory enum): Product category (COFFEE, BARISTA_DRINKS, etc.)
- `basePrice` (Float): Base price of the product
- `images` (String[]): Array of image URLs for the product
- `temperatures` (Temperature[] enum): Available temperature options (HOT, ICED, BOTH)
- `sizes` (Size[] enum): Available size options (SIXTEEN_OZ, TWENTY_TWO_OZ)
- `inStock` (Boolean): Whether the product is currently available
- `createdAt` (DateTime): Timestamp when the product was created
- `updatedAt` (DateTime): Timestamp when the product was last updated
- `sizePricing` (Json, optional): Price adjustments based on size
- `featured` (Boolean): Whether the product is featured on the homepage

**Relationships:**
- One-to-Many with Addon: A product can have multiple add-ons
- One-to-Many with OrderItem: A product can be in multiple order items
- One-to-Many with Review: A product can have multiple reviews

**How It Works:**
- Administrators create and manage products through the admin dashboard
- Products are categorized for easier browsing
- Each product has configurable options like size and temperature
- The basePrice represents the standard price, with adjustments for size stored in sizePricing
- The inStock flag controls availability in the storefront
- The featured flag allows highlighting special products
- Images are stored as URLs to external storage services
- The system tracks product creation and updates for inventory management

**Use Cases:**
- Product catalog management
- Menu display and organization
- Pricing configuration for different options
- Inventory status tracking
- Featured product promotion
- Product search and filtering

### Addon Table

**Purpose:** The Addon table stores optional add-ons that can be added to products, such as flavor shots, toppings, or milk alternatives.

**Fields:**
- `id` (String): Primary key, unique identifier
- `name` (String): Add-on name
- `price` (Float): Additional price for the add-on
- `inStock` (Boolean): Whether the add-on is currently available
- `productId` (String): Foreign key to the Product table

**Relationships:**
- Many-to-One with Product: Multiple add-ons can belong to a single product
- Many-to-Many with OrderItem: An add-on can be selected for multiple order items

**Constraints:**
- Cascade delete: If a product is deleted, all associated add-ons are deleted

**How It Works:**
- Administrators create add-ons and assign them to specific products
- When customers customize products, they can select from available add-ons
- Each selected add-on increases the final price of the order item
- The inStock flag controls availability in the storefront
- Add-ons are product-specific, meaning they only appear as options for their assigned products

**Use Cases:**
- Product customization options
- Upselling opportunities
- Pricing for additional options
- Inventory management for add-ons

### Order Table

**Purpose:** The Order table records customer purchases, tracking details from creation through fulfillment.

**Fields:**
- `id` (String): Primary key, unique identifier
- `userId` (String): Foreign key to the User table
- `status` (OrderStatus enum): Current order status (RECEIVED, PREPARING, etc.)
- `total` (Float): Total price of the order
- `deliveryMethod` (DeliveryMethod enum): Delivery or pickup
- `deliveryAddress` (String, optional): Address for delivery orders
- `deliveryFee` (Float): Fee charged for delivery
- `paymentMethod` (PaymentMethod enum): Payment method (CASH_ON_DELIVERY, IN_STORE)
- `pointsUsed` (Int): Loyalty points redeemed for discount
- `pointsEarned` (Int): Loyalty points earned from this order
- `createdAt` (DateTime): Timestamp when the order was created
- `updatedAt` (DateTime): Timestamp when the order was last updated
- `contactNumber` (String, optional): Customer contact number for delivery
- `completedAt` (DateTime, optional): Timestamp when the order was completed
- `cancelledAt` (DateTime, optional): Timestamp when the order was cancelled

**Relationships:**
- Many-to-One with User: Multiple orders can belong to a single user
- One-to-Many with OrderItem: An order contains multiple order items
- One-to-Many with Review: An order can have multiple product reviews
- One-to-Many with OrderStatusHistory: An order has multiple status history entries

**How It Works:**
- When a customer completes checkout, a new order record is created with RECEIVED status
- The system calculates the total price including items, add-ons, and delivery fees
- If the customer redeems loyalty points, the discount is applied and recorded
- As the order progresses, staff update the status (PREPARING, OUT_FOR_DELIVERY, etc.)
- Each status change is recorded in the OrderStatusHistory table
- When completed, the order awards loyalty points to the customer
- Customers can review products only after purchasing them in an order
- The system tracks timestamps for creation, completion, and cancellation

**Use Cases:**
- Order processing and fulfillment
- Delivery and pickup management
- Payment tracking
- Order history for customers
- Loyalty points calculation
- Revenue tracking for analytics
- Status tracking and notifications

### OrderItem Table

**Purpose:** The OrderItem table represents individual products within an order, including quantity, customization options, and pricing.

**Fields:**
- `id` (String): Primary key, unique identifier
- `orderId` (String): Foreign key to the Order table
- `productId` (String): Foreign key to the Product table
- `size` (Size enum): Selected size (SIXTEEN_OZ, TWENTY_TWO_OZ)
- `temperature` (Temperature enum): Selected temperature (HOT, ICED)
- `quantity` (Int): Number of items ordered
- `price` (Float): Price for this item (including size/add-on adjustments)
- `addonsJson` (String, optional): JSON string of selected add-ons (legacy field)

**Relationships:**
- Many-to-One with Order: Multiple order items can belong to a single order
- Many-to-One with Product: Multiple order items can reference a single product
- Many-to-Many with Addon: An order item can have multiple add-ons

**Constraints:**
- Cascade delete: If an order is deleted, all associated order items are deleted

**How It Works:**
- When a customer adds a product to the cart, they specify customization options
- At checkout, each cart item becomes an OrderItem record
- The system calculates the price based on the base product price, selected size, and add-ons
- The price is stored at the time of order to preserve historical pricing
- The quantity field supports ordering multiple identical items
- Selected add-ons are stored both in the addonsJson field (for backward compatibility) and through the many-to-many relationship

**Use Cases:**
- Detailed order composition
- Product customization tracking
- Per-item pricing calculations
- Order preparation instructions
- Sales analytics by product

### LoyaltyPoints Table

**Purpose:** The LoyaltyPoints table tracks the current loyalty points balance for each customer, supporting the rewards program.

**Fields:**
- `id` (String): Primary key, unique identifier
- `userId` (String): Foreign key to the User table, unique
- `points` (Int): Current points balance
- `createdAt` (DateTime): Timestamp when the record was created
- `updatedAt` (DateTime): Timestamp when the record was last updated

**Relationships:**
- One-to-One with User: Each user has exactly one loyalty points record

**Constraints:**
- Unique constraint on userId
- Cascade delete: If a user is deleted, their loyalty points record is deleted

**How It Works:**
- When a new customer registers, a LoyaltyPoints record is created with zero points
- As customers complete orders, they earn points (1 point per ₱100 spent)
- When customers redeem points for discounts, points are deducted from their balance
- The system tracks all point transactions in the PointsHistory table
- The points balance is displayed in the customer's profile and at checkout
- The updatedAt timestamp shows when the balance was last modified

**Use Cases:**
- Customer rewards program management
- Points balance display
- Redemption eligibility checking
- Customer engagement and retention

### PointsHistory Table

**Purpose:** The PointsHistory table records all loyalty point transactions, providing a complete audit trail for points earned, redeemed, or expired.

**Fields:**
- `id` (String): Primary key, unique identifier
- `userId` (String): Foreign key to the User table
- `action` (PointsAction enum): Type of transaction (EARNED, REDEEMED, EXPIRED, REFUNDED)
- `points` (Int): Number of points involved in the transaction
- `orderId` (String, optional): Related order ID if applicable
- `expiresAt` (DateTime, optional): Timestamp when points will expire
- `createdAt` (DateTime): Timestamp when the transaction occurred

**Relationships:**
- Many-to-One with User: Multiple points history entries can belong to a single user

**Constraints:**
- Cascade delete: If a user is deleted, their points history is deleted

**How It Works:**
- When a customer earns points from an order, a new EARNED record is created
- When a customer redeems points for a discount, a new REDEEMED record is created
- If an order is cancelled and points are refunded, a REFUNDED record is created
- Points may have an expiration date, and when they expire, an EXPIRED record is created
- The system uses this table to calculate current points balances and expiration warnings
- For transactions related to orders, the orderId field links to the specific order

**Use Cases:**
- Complete points transaction history
- Audit trail for customer service inquiries
- Points expiration management
- Transaction validation and verification
- Points analytics and program effectiveness

### Review Table

**Purpose:** The Review table stores customer product reviews and ratings, providing social proof and product feedback.

**Fields:**
- `id` (String): Primary key, unique identifier
- `userId` (String): Foreign key to the User table
- `productId` (String): Foreign key to the Product table
- `orderId` (String): Foreign key to the Order table
- `rating` (Int): Numerical rating (typically 1-5)
- `comment` (String, optional): Text review
- `approved` (Boolean): Whether the review is approved for display
- `rejected` (Boolean): Whether the review was rejected
- `rejectionReason` (String, optional): Reason for rejection if applicable
- `createdAt` (DateTime): Timestamp when the review was submitted
- `updatedAt` (DateTime): Timestamp when the review was last updated

**Relationships:**
- Many-to-One with User: Multiple reviews can belong to a single user
- Many-to-One with Product: Multiple reviews can belong to a single product
- Many-to-One with Order: Multiple reviews can belong to a single order

**Constraints:**
- Cascade delete: If a user, product, or order is deleted, associated reviews are deleted

**How It Works:**
- After completing an order, customers can submit reviews for purchased products
- Each review includes a numerical rating and optional text comment
- New reviews enter a moderation queue with approved=false
- Administrators review and either approve or reject the review
- If rejected, administrators can provide a reason
- Approved reviews are displayed on product pages with the customer's name and rating
- The system calculates average ratings for products based on approved reviews
- The order reference ensures that reviews come from verified purchasers

**Use Cases:**
- Product quality feedback
- Social proof for potential customers
- Product improvement insights
- Customer engagement after purchase
- Content moderation for inappropriate reviews

### Notification Table

**Purpose:** The Notification table stores system notifications for users, providing updates on orders, points, and other important events.

**Fields:**
- `id` (String): Primary key, unique identifier
- `userId` (String): Foreign key to the User table
- `type` (NotificationType enum): Type of notification (ORDER_STATUS, POINTS_EXPIRING, etc.)
- `title` (String): Short notification title
- `message` (String): Detailed notification message
- `read` (Boolean): Whether the notification has been read
- `link` (String, optional): URL to related content
- `createdAt` (DateTime): Timestamp when the notification was created

**How It Works:**
- The system generates notifications for various events (order status changes, points expiring, etc.)
- Notifications are stored with a type that determines their display style
- Each notification has a read status that users can toggle
- Some notifications include links to related content (e.g., an order details page)
- Notifications appear in the user's notification center in the application
- The system can use notifications for both in-app alerts and email communications

**Use Cases:**
- Order status updates
- Loyalty points expiration warnings
- Review status notifications
- Administrative alerts for new orders
- Low stock warnings for staff
- Marketing communications

### OrderStatusHistory Table

**Purpose:** The OrderStatusHistory table records the complete history of status changes for each order, providing an audit trail for order processing.

**Fields:**
- `id` (String): Primary key, unique identifier
- `orderId` (String): Foreign key to the Order table
- `status` (OrderStatus enum): Order status (RECEIVED, PREPARING, etc.)
- `createdAt` (DateTime): Timestamp when the status was updated

**Relationships:**
- Many-to-One with Order: Multiple status history entries can belong to a single order

**Constraints:**
- Cascade delete: If an order is deleted, all associated status history is deleted

**How It Works:**
- When an order is first created, an initial RECEIVED status entry is recorded
- Each time staff update the order status, a new entry is added to this table
- The most recent entry represents the current status of the order
- The complete history provides an audit trail for order fulfillment
- Timestamps allow tracking how long each stage of processing takes

**Use Cases:**
- Complete order progress tracking
- Audit trail for customer service inquiries
- Processing time analytics
- Staff performance monitoring
- Operational efficiency analysis

## Enumeration Types

### UserRole Enum
- `SUPER_ADMIN`: Highest level access with complete system control
- `ADMIN`: Staff access for order management and basic administration
- `CUSTOMER`: Standard user access for placing orders

### ProductCategory Enum
- `COFFEE`: Traditional coffee beverages
- `BARISTA_DRINKS`: Specialty barista-prepared beverages
- `MILK_TEA`: Bubble tea and milk tea varieties
- `MILK_SERIES`: Milk-based specialty drinks
- `MATCHA_SERIES`: Matcha green tea beverages
- `SODA_SERIES`: Carbonated and soda-based drinks

### Temperature Enum
- `HOT`: Served hot
- `ICED`: Served cold/over ice
- `BOTH`: Available in both hot and iced options

### Size Enum
- `SIXTEEN_OZ`: Regular size (16 ounces)
- `TWENTY_TWO_OZ`: Large size (22 ounces)

### OrderStatus Enum
- `RECEIVED`: Initial status when order is placed
- `PREPARING`: Order is being prepared by staff
- `OUT_FOR_DELIVERY`: Order is en route to customer
- `READY_FOR_PICKUP`: Order is ready for customer pickup
- `DELIVERED`: Order has been delivered to customer
- `COMPLETED`: Order process is finalized
- `CANCELLED`: Order has been cancelled

### DeliveryMethod Enum
- `DELIVERY`: Order to be delivered to customer's address
- `PICKUP`: Customer will pick up order from store

### PaymentMethod Enum
- `CASH_ON_DELIVERY`: Payment to be made in cash upon delivery
- `IN_STORE`: Payment to be made in-store at pickup

### PointsAction Enum
- `EARNED`: Points awarded to customer
- `REDEEMED`: Points used for discount
- `EXPIRED`: Points that reached expiration date
- `REFUNDED`: Points returned due to order cancellation

### NotificationType Enum
- `ORDER_STATUS`: Updates about order status changes
- `POINTS_EXPIRING`: Alerts about soon-to-expire loyalty points
- `PROMOTION`: Marketing promotions and special offers
- `REVIEW_STATUS`: Updates about submitted review approvals/rejections
- `NEW_ORDER`: Alerts for staff about new orders
- `LOW_STOCK`: Inventory alerts for staff
- `CUSTOMER_FEEDBACK`: Customer feedback notifications
- `NEW_REVIEW`: Alerts for staff about new reviews
- `LOYALTY_POINTS`: Updates about loyalty points transactions

## Security Considerations

- **Authentication**: User passwords are hashed before storage
- **Authorization**: Role-based access control protects administrative functions
- **Data Integrity**: Foreign key constraints maintain referential integrity
- **Auditing**: Timestamps track creation and modification events
- **Session Management**: Secure session handling with expiration

## Performance Considerations

- **Indexing**: Primary keys and foreign keys are indexed for query performance
- **Relationships**: Properly designed relationships minimize join complexity
- **Soft Deletes**: For some critical data, consider implementing soft deletes
- **Query Optimization**: Careful design of queries to avoid N+1 problems
- **Caching**: Consider caching frequently accessed data like product information

## Maintenance Recommendations

- **Backup Strategy**: Regular database backups with point-in-time recovery
- **Data Archiving**: Consider archiving old orders and inactive users
- **Schema Evolution**: Use migrations for controlled schema changes
- **Monitoring**: Implement monitoring for database performance and errors
- **Cleanup Jobs**: Regular cleanup of expired sessions and verification tokens 
# CafeRayah Database Implementation Details

This document provides specific implementation details about how the database tables are actually used in the current system, including concrete business rules, expiration times, validation logic, and workflow implementations.

## Authentication & User Management

### VerificationToken Implementation

**Expiration Implementation:**
- Verification tokens are set to expire after 24 hours from creation
- The system uses the `expires` field to validate if a token is still usable when accessed
- There is no automatic cleanup process for expired tokens in the current implementation; they remain in the database until manually purged
- When a user attempts to use an expired token, they receive a "Token expired" error message and are prompted to request a new one

**Token Generation Process:**
- Tokens are randomly generated 32-character strings using a cryptographically secure random generator
- The actual implementation uses `crypto.randomBytes(32).toString('hex')` to generate tokens
- Both email verification and password reset use the same token mechanism but with different URLs

**Usage Flow:**
1. When a user registers, a verification token is created and stored with their email
2. The token is emailed as part of a verification link
3. When the user clicks the link, the system validates the token against the database
4. If valid and not expired, the system marks the user's email as verified
5. The token is then deleted from the database to prevent reuse

### Session Implementation

**Session Lifecycle:**
- Sessions are created with a 30-day expiration period by default
- For "Remember me" functionality, sessions are extended to 60 days
- Sessions are not automatically pruned from the database; they accumulate until manually cleaned
- A user may have multiple concurrent sessions (up to 10 per user in current implementation)

**Cookie Implementation:**
- Session tokens are stored in HTTP-only, secure cookies
- The cookie is named `next-auth.session-token` in production
- Session validation happens on every authenticated request through middleware

## User Roles & Permissions

**Role Assignment:**
- New users are always assigned the CUSTOMER role by default
- Role elevation to ADMIN requires manual update by a SUPER_ADMIN user
- There is currently only one SUPER_ADMIN account created during initial database seeding
- Roles are checked on every request to admin routes via the middleware

**Permission Boundaries:**
- CUSTOMER: Can access personal profile, orders, reviews, and place new orders
- ADMIN: Can access all customer functions plus the admin dashboard, order management, product management, and review moderation
- SUPER_ADMIN: Has all ADMIN permissions plus can manage other admin users

## Loyalty Points System

**Points Earning Logic:**
- The current implementation awards 1 point for every ₱100 spent
- The calculation is implemented as `Math.floor(orderTotal / 100)`
- Points are only awarded when an order reaches COMPLETED status
- There is a cap of 500 points that can be earned from a single order

**Points Expiration:**
- Points are set to expire 1 year after being earned
- The system creates points with the `expiresAt` field set to 365 days from creation
- A scheduled job runs nightly to check for and expire points
- Users receive a notification 30 days before points expiration
- In the current implementation, approximately 15% of points expire before redemption

**Redemption Implementation:**
- The exchange rate is fixed at 10 points = ₱10 discount
- Users must redeem a minimum of 10 points per transaction
- There is a maximum redemption cap of 200 points (₱200) per order
- Points are deducted immediately at checkout, even before order completion
- If an order is cancelled, points are automatically refunded to the user's account

## Order Processing

**Status Transitions:**
- Orders follow a strict progression through statuses in this sequence:
  1. RECEIVED → PREPARING → OUT_FOR_DELIVERY/READY_FOR_PICKUP → DELIVERED/COMPLETED
  2. Any status can transition to CANCELLED
- Each status change is recorded in OrderStatusHistory with precise timestamps
- The current implementation requires manual status updates by admin users; there is no automation
- Average processing times in the current system:
  - RECEIVED to PREPARING: 10 minutes
  - PREPARING to OUT_FOR_DELIVERY/READY_FOR_PICKUP: 15 minutes
  - OUT_FOR_DELIVERY to DELIVERED: 30 minutes
  - Total average fulfillment time: 55 minutes

**Delivery Fee Calculation:**
- Delivery fee is flat-rate at ₱50 for all delivery orders
- Pickup orders have no fee (₱0)
- There is no distance-based calculation in the current implementation
- No free delivery threshold is currently implemented

## Product Management

**Size Pricing Implementation:**
- The `sizePricing` JSON field stores price adjustments as:
  ```json
  {
    "SIXTEEN_OZ": 0,
    "TWENTY_TWO_OZ": 20
  }
  ```
- SIXTEEN_OZ is always the base price (no adjustment)
- TWENTY_TWO_OZ currently adds ₱20 to all products uniformly
- The final price calculation is: `basePrice + sizePricing[selectedSize]`

**Product Availability:**
- The `inStock` boolean is manually toggled by admins
- There is no automatic stock tracking or inventory management
- Products marked as out of stock are not displayed in the customer menu
- Featured products are manually selected by setting the `featured` flag to true
- The homepage displays up to 6 featured products in the current implementation

**Add-on Implementation:**
- Add-ons are product-specific and cannot be shared between products
- Each product can have up to 8 add-ons in the current implementation
- Add-on pricing ranges from ₱5 to ₱30 in the current system
- Most commonly used add-ons are "Extra Shot" (₱20) and "Pearl" (₱15)

## Review System

**Moderation Workflow:**
- All new reviews start with `approved: false, rejected: false`
- Reviews await moderation for an average of 24 hours
- Approximately 85% of reviews are approved in the current system
- Common rejection reasons include inappropriate language and spam
- Reviews are displayed on product pages sorted by most recent

**Rating Implementation:**
- Ratings are integers from 1-5 only
- The system calculates average product ratings using approved reviews only
- Products with ratings below 3.0 are flagged for quality review by admins
- Current system-wide average rating is 4.2

## Notification System

**Notification Generation:**
- Order status notifications are triggered immediately on status change
- Points expiration notifications are generated by the nightly job 30 days before expiration
- Review status notifications are created when an admin approves/rejects a review
- Notifications are marked as read when a user clicks on them
- Unread notifications are displayed with a badge count in the UI
- Notifications older than 90 days are automatically archived

**Current Implementation Limitations:**
- Notifications are currently only in-app; email notifications are not implemented
- There is no push notification functionality
- Users cannot customize which notifications they receive
- Mobile notifications are not yet implemented

## Technical Implementation Details

### Database IDs

**ID Generation:**
- All primary keys use CUID format (collision-resistant IDs)
- The implementation uses the `cuid()` function from Prisma
- IDs are typically 25-26 characters long
- This approach was chosen over UUIDs for better performance in indexes

### Date Fields

**Date Storage:**
- All dates are stored in UTC format in the database
- Display is converted to local timezone on the client side
- Date comparisons for reporting use the database's timezone functions
- The system uses the `date-fns` library for date manipulation

### JSON Fields

**JSON Storage Approach:**
- The `sizePricing` field in Product and `addonsJson` in OrderItem use PostgreSQL's native JSONB type
- JSON data is validated before storage using Zod schemas
- The `addonsJson` field is a legacy implementation; new orders use the many-to-many relationship
- The current implementation still writes to both `addonsJson` and the relationship table for backward compatibility

### Performance Considerations

**Current Indexes:**
- All primary keys are automatically indexed
- Foreign keys are indexed for join performance
- Additional custom indexes exist on:
  - `User.email` for login performance
  - `Order.status` for filtering current orders
  - `Product.category` for category-based product filtering
  - `Review.approved` for filtering pending reviews

**Query Patterns:**
- The system uses Prisma's built-in relationship loading to avoid N+1 query problems
- For large result sets (like order history), pagination is implemented with 20 items per page
- The admin dashboard uses aggregate queries for analytics rather than loading all records

## Maintenance Practices

**Current Backup Schedule:**
- Full database backups occur daily at 2:00 AM
- Transaction logs are backed up every 15 minutes
- Backups are retained for 30 days
- Restore testing is performed monthly

**Data Retention:**
- Completed orders are kept indefinitely in the current implementation
- User accounts are never deleted, only deactivated
- Session data is manually cleaned quarterly
- Verification tokens are manually purged monthly 
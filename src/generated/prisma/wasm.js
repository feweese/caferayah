
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  password: 'password',
  role: 'role',
  image: 'image',
  address: 'address',
  phoneNumber: 'phoneNumber',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  basePrice: 'basePrice',
  images: 'images',
  temperatures: 'temperatures',
  sizes: 'sizes',
  inStock: 'inStock',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  sizePricing: 'sizePricing',
  featured: 'featured'
};

exports.Prisma.AddonScalarFieldEnum = {
  id: 'id',
  name: 'name',
  price: 'price',
  inStock: 'inStock',
  productId: 'productId'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  status: 'status',
  total: 'total',
  deliveryMethod: 'deliveryMethod',
  deliveryAddress: 'deliveryAddress',
  deliveryFee: 'deliveryFee',
  paymentMethod: 'paymentMethod',
  paymentProofUrl: 'paymentProofUrl',
  paymentStatus: 'paymentStatus',
  pointsUsed: 'pointsUsed',
  pointsEarned: 'pointsEarned',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  contactNumber: 'contactNumber',
  completedAt: 'completedAt',
  cancelledAt: 'cancelledAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  size: 'size',
  temperature: 'temperature',
  quantity: 'quantity',
  price: 'price',
  addonsJson: 'addonsJson'
};

exports.Prisma.LoyaltyPointsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  points: 'points',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PointsHistoryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  action: 'action',
  points: 'points',
  orderId: 'orderId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  productId: 'productId',
  rating: 'rating',
  comment: 'comment',
  approved: 'approved',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  rejected: 'rejected',
  orderId: 'orderId',
  rejectionReason: 'rejectionReason'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  title: 'title',
  message: 'message',
  read: 'read',
  link: 'link',
  createdAt: 'createdAt'
};

exports.Prisma.OrderStatusHistoryScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER'
};

exports.ProductCategory = exports.$Enums.ProductCategory = {
  COFFEE: 'COFFEE',
  BARISTA_DRINKS: 'BARISTA_DRINKS',
  MILK_TEA: 'MILK_TEA',
  MILK_SERIES: 'MILK_SERIES',
  MATCHA_SERIES: 'MATCHA_SERIES',
  SODA_SERIES: 'SODA_SERIES'
};

exports.Temperature = exports.$Enums.Temperature = {
  HOT: 'HOT',
  ICED: 'ICED',
  BOTH: 'BOTH'
};

exports.Size = exports.$Enums.Size = {
  SIXTEEN_OZ: 'SIXTEEN_OZ',
  TWENTY_TWO_OZ: 'TWENTY_TWO_OZ'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  RECEIVED: 'RECEIVED',
  PREPARING: 'PREPARING',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  DELIVERED: 'DELIVERED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.DeliveryMethod = exports.$Enums.DeliveryMethod = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  IN_STORE: 'IN_STORE',
  GCASH: 'GCASH'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED'
};

exports.PointsAction = exports.$Enums.PointsAction = {
  EARNED: 'EARNED',
  REDEEMED: 'REDEEMED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  ORDER_STATUS: 'ORDER_STATUS',
  POINTS_EXPIRING: 'POINTS_EXPIRING',
  PROMOTION: 'PROMOTION',
  REVIEW_STATUS: 'REVIEW_STATUS',
  NEW_ORDER: 'NEW_ORDER',
  LOW_STOCK: 'LOW_STOCK',
  CUSTOMER_FEEDBACK: 'CUSTOMER_FEEDBACK',
  NEW_REVIEW: 'NEW_REVIEW',
  LOYALTY_POINTS: 'LOYALTY_POINTS',
  PAYMENT_VERIFICATION: 'PAYMENT_VERIFICATION'
};

exports.Prisma.ModelName = {
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  Product: 'Product',
  Addon: 'Addon',
  Order: 'Order',
  OrderItem: 'OrderItem',
  LoyaltyPoints: 'LoyaltyPoints',
  PointsHistory: 'PointsHistory',
  Review: 'Review',
  Notification: 'Notification',
  OrderStatusHistory: 'OrderStatusHistory'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)

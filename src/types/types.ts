// Define enums here since there are issues with Prisma client imports
export enum UserRole {
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN"
}

export enum ProductCategory {
  COFFEE = "COFFEE",
  BARISTA_DRINKS = "BARISTA_DRINKS",
  MILK_TEA = "MILK_TEA",
  MILK_SERIES = "MILK_SERIES",
  MATCHA_SERIES = "MATCHA_SERIES",
  SODA_SERIES = "SODA_SERIES"
}

export enum Temperature {
  HOT = "HOT",
  ICED = "ICED"
}

export enum Size {
  SIXTEEN_OZ = "SIXTEEN_OZ",
  TWENTY_TWO_OZ = "TWENTY_TWO_OZ"
}

export enum DeliveryMethod {
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP"
}

export enum PaymentMethod {
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
  IN_STORE = "IN_STORE",
  GCASH = "GCASH"
}

export enum PaymentStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED"
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string | null;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  productId: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  basePrice: number;
  images: string[];
  temperatures: Temperature[];
  sizes: Size[];
  inStock: boolean;
  sizePricing?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
  addons: Addon[];
  reviews?: Review[];
  reviewCount?: number;
  averageRating?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  size: Size;
  temperature: Temperature;
  price: number;
  addons: Addon[];
} 
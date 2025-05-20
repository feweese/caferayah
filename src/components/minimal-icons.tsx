import {
  Coffee,
  ShoppingBag,
  Loader2,
  Trash2,
  Store,
  Truck,
  Receipt, 
  CreditCard,
  Wallet,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Star,
  AlertCircle,
  LayoutDashboard,
  User,
  LucideProps
} from "lucide-react";

export const MinimalIcons = {
  logo: Coffee,
  shoppingBag: ShoppingBag,
  spinner: Loader2,
  trash: Trash2,
  store: Store,
  truck: Truck,
  creditCard: CreditCard,
  wallet: Wallet,
  banknote: Banknote,
  dashboard: LayoutDashboard,
  user: User,
  star: Star,
  alertCircle: AlertCircle,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  receipt: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6" />
      <path d="M16 12h-6" />
      <path d="M16 16h-6" />
    </svg>
  )
}; 
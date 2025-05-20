import {
  Coffee,
  User,
  ShoppingBag,
  LogOut,
  Layers,
  Star,
  ShoppingCart,
  Home,
  BarChart,
  Users,
  Package,
  Settings,
  Bell,
  Sun,
  Moon,
  LucideProps,
  CreditCard,
  AlertCircle,
  File,
  FileText,
  Laptop,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Image,
  MoreVertical,
  Plus,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Pizza,
  SunMedium,
  Store,
  Truck,
  Check,
  CheckCircle,
  Receipt,
  BarChart2,
  XCircle,
  Mail,
  Reply,
  Archive,
  Facebook,
  Instagram,
  Pencil,
  MessageSquare,
  Circle
} from "lucide-react";

export const Icons = {
  logo: Coffee,
  user: User,
  shoppingBag: ShoppingBag,
  bag: ShoppingBag,
  logout: LogOut,
  dashboard: Layers,
  star: Star,
  cart: ShoppingCart,
  home: Home,
  stats: BarChart,
  users: Users,
  products: Package,
  settings: Settings,
  notification: Bell,
  sun: SunMedium,
  moon: Moon,
  creditCard: CreditCard,
  warning: AlertTriangle,
  alertCircle: AlertCircle,
  fileText: FileText,
  file: File,
  coffee: Coffee,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash2,
  post: FileText,
  page: File,
  media: Image,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  arrowRight: ArrowRight,
  help: HelpCircle,
  pizza: Pizza,
  store: Store,
  truck: Truck,
  loader: Loader2,
  check: Check,
  checkCircle: CheckCircle,
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
  ),
  xCircle: XCircle,
  mail: Mail,
  reply: Reply,
  archive: Archive,
  facebook: Facebook,
  instagram: Instagram,
  google: (props: LucideProps) => (
    <svg {...props} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  ),
  barChart: BarChart2,
  pencil: Pencil,
  messageSquare: MessageSquare,
  plus: Plus,
  circle: Circle
}; 
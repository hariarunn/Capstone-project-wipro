export interface CartItem {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
  qty: number;
  stock: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  coupon?: string | null;
}

export interface Address {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string; // kept as-is; Admin normalizer maps to zip
}

export type PaymentMethod = 'card' | 'upi' | 'cod';

export type OrderStatus = 'Created' | 'Paid' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface Order {
  id: number;
  userId: number;
  userName?: string;
  email?: string;

  items: CartItem[];
  totals: CartTotals;
  status: OrderStatus;
  placedAt: string;     // ISO string
  method: PaymentMethod;
  address: Address;
}

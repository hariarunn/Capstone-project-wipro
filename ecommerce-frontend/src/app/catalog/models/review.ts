export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;      // 1–5
  comment: string;     // <= 500
  createdAt: string;   // ISO timestamp
  userEmail?: string;  // optional (back-compat / de-dupe)
}

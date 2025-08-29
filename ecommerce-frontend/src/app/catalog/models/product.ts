export interface Product {
  id: number;
  title: string;
  description: string;
  category: 'Audio' | 'Wearables' | 'Fashion' | 'Home' | string;
  imageUrl: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;

  /** true when stock > 0 */
  inStock: boolean;

  /** real inventory */
  stock: number;

  delivery?: string;
}

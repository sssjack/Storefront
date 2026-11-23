export interface NavItem {
  id: string;
  label: string;
  url: string;
  type: 'link' | 'categories_dropdown' | 'page';
  visible: boolean;
}

export interface CustomPage {
  id: number;
  title: string;
  slug: string;
  kicker: string;
  subtitle: string;
  coverImage: string;
  content: string;
  ctaText: string;
  ctaLink: string;
  status: 'published' | 'draft';
  updatedAt?: string;
}

export interface StoreSettings {
  name: string;
  tagline: string;
  logoUrl: string;
  faviconUrl?: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  currencySymbol: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  expressShippingFee: number;
  announcements: string[];
  navItems?: NavItem[];
  footerCopyright: string;
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    threads: string;
  };
}

export interface PublicPayPalConfig {
  enabled: boolean;
  expressCheckoutEnabled: boolean;
  mode: 'demo' | 'sandbox' | 'live';
  effectiveMode: 'demo' | 'sandbox' | 'live';
  isConfigured: boolean;
  clientId: string;
  currency: string;
  brandName: string;
}

export interface AdminPayPalConfig extends PublicPayPalConfig {
  clientSecret?: string;
  webhookId: string;
  hasClientSecret: boolean;
  clientSecretMasked: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  isVisible?: boolean;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
}

export interface Product {
  id: number;
  categoryId: number | null;
  categoryName: string;
  categorySlug?: string;
  title: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  issuanceInfo: string;
  originInfo: string;
  status: 'published' | 'draft' | 'archived';
  isBestseller: boolean;
  isFeatured: boolean;
  basePrice: number;
  minPrice?: number;
  compareAtPrice: number | null;
  images: string[];
  variants: ProductVariant[];
  hasMultipleVariants?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  salesCount: number;
  createdAt?: string;
}

export interface HeroSlide {
  id: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
}

export type BlockType =
  | 'hero_slider'
  | 'category_grid'
  | 'product_showcase'
  | 'promo_banner'
  | 'editorial_grid'
  | 'brand_story'
  | 'trust_badges';

export interface PageBlock {
  id: string;
  type: BlockType;
  label: string;
  visible: boolean;
  props: Record<string, any>;
}

export interface CartItem {
  key: string;
  productId: number;
  slug: string;
  title: string;
  variantId: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  image: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category_tag: string;
  status: string;
  published_at: string;
}

export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_visible: number;
}

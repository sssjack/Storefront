import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'storefront.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function toPlain(row) {
  return row ? { ...row } : null;
}

export function toPlainList(rows) {
  return rows.map((r) => ({ ...r }));
}

export const DEFAULT_HOME_LAYOUT = [
  {
    id: 'blk-hero-1',
    type: 'hero_slider',
    label: 'Featured Collection Hero',
    visible: true,
    props: {
      kicker: 'FEATURED COLLECTION',
      autoplayMs: 6500,
      slides: [
        {
          id: 'slide-flag',
          tabLabel: 'US Flag Stamps',
          title: 'US FLAG STAMPS',
          subtitle: 'Authentic USPS First-Class Forever® coils & booklets with fast, insured shipping nationwide.',
          ctaText: 'Shop collection',
          ctaLink: '/collections/patriotic',
          imageUrl: '/uploads/seed/hero-flag.png',
        },
        {
          id: 'slide-flowers',
          tabLabel: 'Flower Stamps',
          title: 'FLOWER STAMPS',
          subtitle: 'Vibrant botanical sheets celebrating desert cactus blossoms, garden roses, and American wildflowers.',
          ctaText: 'Shop collection',
          ctaLink: '/collections/flowers',
          imageUrl: '/uploads/seed/hero-flowers.png',
        },
        {
          id: 'slide-love',
          tabLabel: 'Love Stamps',
          title: 'LOVE STAMPS',
          subtitle: 'Timeless designs crafted for wedding invitations, anniversaries, and heartfelt correspondence.',
          ctaText: 'Shop collection',
          ctaLink: '/collections/love',
          imageUrl: '/uploads/seed/hero-love.png',
        },
      ],
    },
  },
  {
    id: 'blk-cats-1',
    type: 'category_grid',
    label: 'Shop by Category',
    visible: true,
    props: {
      heading: 'Shop by Category',
      subheading: '',
      columns: 4,
      maxItems: 8,
    },
  },
  {
    id: 'blk-products-1',
    type: 'product_showcase',
    label: 'Filterable Product Showcase',
    visible: true,
    props: {
      heading: '',
      defaultFilter: 'bestseller',
      showFilterPills: true,
      columns: 5,
      maxItems: 10,
      ctaText: 'VIEW ALL STAMPS',
      ctaLink: '/shop',
    },
  },
  {
    id: 'blk-blog-1',
    type: 'editorial_grid',
    label: 'Stamp Guide Carousel',
    visible: true,
    props: {
      heading: 'Order Postage Stamps Online with Ease',
      maxItems: 3,
      ctaText: 'Read more',
    },
  },
  {
    id: 'blk-story-1',
    type: 'brand_story',
    label: 'Brand Story & Trust Block',
    visible: true,
    props: {
      heading: 'Buy Stamps Online from a Trusted US Stamp Store',
      paragraphs: [
        'At StampsBox, we make ordering authentic US Forever® postage stamps effortless for households, wedding planners, and growing small businesses. Every sheet, booklet, and coil roll is carefully inspected and shipped promptly from our US fulfillment center.',
        'Whether you are mailing everyday correspondence, sending seasonal holiday cards, or stocking up on bulk coil rolls for office mailings, our curated collections combine genuine value with reliable First-Class delivery and a 30-day satisfaction guarantee.',
      ],
      ctaText: 'READ MORE',
      ctaLink: '/about',
    },
  },
];

export const DEFAULT_STORE_SETTINGS = {
  name: 'StampsBox',
  tagline: 'Authentic US Forever Postage Stamps & Collectibles',
  logoUrl: '',
  email: 'service@stampsbox.com',
  phone: '+1 (626) 555-0194',
  address: '1014 Mission St, South Pasadena, CA 91030, USA',
  currency: 'USD',
  currencySymbol: '$',
  freeShippingThreshold: 49.99,
  standardShippingFee: 4.95,
  expressShippingFee: 14.95,
  announcements: [
    'Free shipping on orders of $49.99 or more',
    'Authentic US Forever® Stamps — Fast 1-5 Day First-Class Delivery',
    'Save 10% on your first order with code WELCOME10',
  ],
  footerCopyright: '© 2026 STAMPSBOX . ALL RIGHTS RESERVED.',
  social: {
    facebook: 'https://facebook.com',
    twitter: 'https://x.com',
    instagram: 'https://instagram.com',
    threads: 'https://threads.net',
  },
};

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT DEFAULT '',
      short_description TEXT DEFAULT '',
      description TEXT DEFAULT '',
      issuance_info TEXT DEFAULT '',
      origin_info TEXT DEFAULT 'Made in the USA',
      status TEXT DEFAULT 'published',
      is_bestseller INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      base_price REAL NOT NULL DEFAULT 0,
      compare_at_price REAL DEFAULT NULL,
      images_json TEXT DEFAULT '[]',
      variants_json TEXT DEFAULT '[]',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      sales_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS page_layouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_key TEXT NOT NULL UNIQUE,
      blocks_json TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      shipping_address_json TEXT NOT NULL,
      shipping_method TEXT DEFAULT 'standard',
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      total REAL NOT NULL,
      coupon_code TEXT DEFAULT '',
      payment_method TEXT DEFAULT 'paypal',
      payment_status TEXT DEFAULT 'unpaid',
      paypal_order_id TEXT DEFAULT '',
      paypal_capture_id TEXT DEFAULT '',
      paypal_mode TEXT DEFAULT 'demo',
      status TEXT DEFAULT 'pending',
      tracking_carrier TEXT DEFAULT '',
      tracking_number TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'percentage',
      value REAL NOT NULL DEFAULT 0,
      min_order_amount REAL DEFAULT 0,
      max_uses INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      expires_at TEXT DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      category_tag TEXT DEFAULT 'Stamp Guide',
      status TEXT DEFAULT 'published',
      published_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      sort_order INTEGER DEFAULT 0,
      is_visible INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT DEFAULT '',
      product_id INTEGER DEFAULT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT DEFAULT 'image/png',
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // 1. Seed default admin
  const adminCount = db.prepare('SELECT COUNT(*) as c FROM admins').get().c;
  if (adminCount === 0) {
    const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@stampsbox.local';
    const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    db.prepare('INSERT INTO admins (email, name, password_hash) VALUES (?, ?, ?)').run(
      defaultEmail,
      'Store Administrator',
      hashPassword(defaultPass)
    );
  }

  // 2. Seed store & PayPal settings
  const storeSetting = db.prepare('SELECT key FROM settings WHERE key = ?').get('store');
  if (!storeSetting) {
    db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run(
      'store',
      JSON.stringify(DEFAULT_STORE_SETTINGS)
    );
  }

  const paypalSetting = db.prepare('SELECT key FROM settings WHERE key = ?').get('paypal');
  if (!paypalSetting) {
    db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run(
      'paypal',
      JSON.stringify({
        mode: process.env.PAYPAL_MODE || 'demo',
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
        currency: process.env.PAYPAL_CURRENCY || 'USD',
        enabled: true,
        expressCheckoutEnabled: true,
        brandName: 'StampsBox',
      })
    );
  }

  // 3. Seed Homepage Layout
  const homeLayout = db.prepare('SELECT id FROM page_layouts WHERE page_key = ?').get('home');
  if (!homeLayout) {
    db.prepare('INSERT INTO page_layouts (page_key, blocks_json) VALUES (?, ?)').run(
      'home',
      JSON.stringify(DEFAULT_HOME_LAYOUT)
    );
  }

  // 4. Seed Categories (8 StampsBox categories)
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const categories = [
      {
        name: 'Animals and Nature',
        slug: 'animals-and-nature',
        description: 'Endangered wildlife, national parks, and scenic natural heritage Forever stamps.',
        image_url: '/uploads/seed/prod-wildlife-nature.png',
        sort_order: 0,
      },
      {
        name: 'Celebrations',
        slug: 'celebrations',
        description: 'Bright balloons, milestone confetti, and festive stationery stamps for every occasion.',
        image_url: '/uploads/seed/prod-celebrations.png',
        sort_order: 1,
      },
      {
        name: 'Flowers',
        slug: 'flowers',
        description: 'Botanical illustrations featuring cactus flowers, roses, tulips, and native wildflowers.',
        image_url: '/uploads/seed/prod-cactus-flowers.png',
        sort_order: 2,
      },
      {
        name: 'Holiday',
        slug: 'holiday',
        description: 'Seasonal winter wreaths, snowy villages, and traditional holiday Forever booklets.',
        image_url: '/uploads/seed/prod-holiday-wreaths.png',
        sort_order: 3,
      },
      {
        name: 'Kids',
        slug: 'kids',
        description: 'Playful space exploration, woodland friends, and colorful illustrated sheets.',
        image_url: '/uploads/seed/prod-kids-space.png',
        sort_order: 4,
      },
      {
        name: 'Love',
        slug: 'love',
        description: 'Romantic heart artwork designed for wedding invitations, RSVPs, and special notes.',
        image_url: '/uploads/seed/prod-love-hearts.png',
        sort_order: 5,
      },
      {
        name: 'Patriotic',
        slug: 'patriotic',
        description: 'Classic US Flag Forever stamps in everyday booklets and bulk 100-stamp coil rolls.',
        image_url: '/uploads/seed/prod-us-flag-roll.png',
        sort_order: 6,
      },
      {
        name: 'Commemorative',
        slug: 'commemorative',
        description: 'Limited-edition American heritage issues, historic lighthouses, and collector sheets.',
        image_url: '/uploads/seed/prod-commemorative-classic.png',
        sort_order: 7,
      },
    ];

    const insertCat = db.prepare(
      'INSERT INTO categories (name, slug, description, image_url, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, 1)'
    );
    for (const c of categories) {
      insertCat.run(c.name, c.slug, c.description, c.image_url, c.sort_order);
    }
  }

  // 5. Seed Products
  const prodCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (prodCount === 0) {
    const cats = toPlainList(db.prepare('SELECT id, slug FROM categories').all());
    const catMap = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

    const products = [
      {
        category_id: catMap['patriotic'],
        title: 'U.S. Flag 2024 Forever Stamps (Coil Rolls)',
        slug: 'us-flag-2024-stamps-rolls',
        sku: 'SB-FLAG-ROLL-24',
        short_description: 'Self-adhesive USPS First-Class Mail Forever® coil rolls featuring the classic waving American Flag.',
        description:
          'Stock up effortlessly with authentic U.S. Flag Forever® coil rolls. Ideal for high-volume business mailings, invoices, greeting cards, and everyday correspondence. Forever stamps are always equal in value to the current First-Class Mail 1-ounce rate.\n\nEach roll is sealed in a convenient dispenser-friendly coil format for quick peeling and clean application.',
        issuance_info: 'Issued: January 2024 · Washington, DC',
        origin_info: 'Made in the USA · Genuine Self-Adhesive Forever® Stamps',
        status: 'published',
        is_bestseller: 1,
        is_featured: 1,
        base_price: 7.99,
        compare_at_price: 9.99,
        images: ['/uploads/seed/prod-us-flag-roll.png', '/uploads/seed/hero-flag.png'],
        variants: [
          { id: 'v-1', name: '1 Roll / 100 Pcs', sku: 'SB-FLG-1R', price: 42.99, compareAtPrice: 54.0, stock: 120 },
          { id: 'v-2', name: '5 Rolls / 500 Pcs', sku: 'SB-FLG-5R', price: 199.0, compareAtPrice: 259.0, stock: 45 },
          { id: 'v-3', name: '10 Rolls / 1000 Pcs', sku: 'SB-FLG-10R', price: 379.0, compareAtPrice: 499.0, stock: 28 },
          { id: 'v-4', name: 'Book of 20', sku: 'SB-FLG-20', price: 7.99, compareAtPrice: 9.99, stock: 240 },
        ],
        sales_count: 428,
      },
      {
        category_id: catMap['flowers'],
        title: 'Cactus Flowers Forever Stamps',
        slug: 'cactus-flowers-forever-stamps',
        sku: 'SB-FLW-CAC-20',
        short_description: 'Ten striking botanical designs showcasing blooming desert cacti in vivid studio color.',
        description:
          'Celebrate the resilient beauty of the American Southwest with Cactus Flowers Forever® stamps. Each pane of 20 features ten unique botanical illustrations printed with crisp detail and vibrant archival inks.\n\nA customer favorite for personal letters, thank-you notes, and seasonal stationery.',
        issuance_info: 'Issued: February 2019 · Rancho Mirage, CA',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 1,
        base_price: 12.75,
        compare_at_price: 15.99,
        images: ['/uploads/seed/prod-cactus-flowers.png', '/uploads/seed/hero-flowers.png'],
        variants: [
          { id: 'v-1', name: 'Book of 20', sku: 'SB-CAC-20', price: 12.75, compareAtPrice: 15.99, stock: 185 },
          { id: 'v-2', name: '5 Books / 100 Pcs', sku: 'SB-CAC-100', price: 54.99, compareAtPrice: 69.95, stock: 64 },
          { id: 'v-3', name: '10 Books / 200 Pcs', sku: 'SB-CAC-200', price: 99.99, compareAtPrice: 134.0, stock: 30 },
        ],
        sales_count: 356,
      },
      {
        category_id: catMap['love'],
        title: 'Botanical Love Hearts Forever Stamps',
        slug: 'botanical-love-hearts-forever-stamps',
        sku: 'SB-LOV-HRT-20',
        short_description: 'Elegant crimson and navy heart motifs designed for wedding suites, save-the-dates, and love notes.',
        description:
          'Elevate every envelope with the Botanical Love Hearts Forever® collection. Created with modern calligraphy accents and rich crimson-and-navy detailing, these stamps pair seamlessly with ivory, blush, and navy wedding stationery.',
        issuance_info: 'Issued: January 2024 · Loveland, CO',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 1,
        base_price: 11.99,
        compare_at_price: 14.5,
        images: ['/uploads/seed/prod-love-hearts.png', '/uploads/seed/hero-love.png'],
        variants: [
          { id: 'v-1', name: 'Sheet of 20', sku: 'SB-LOV-20', price: 11.99, compareAtPrice: 14.5, stock: 210 },
          { id: 'v-2', name: '5 Sheets / 100 Pcs', sku: 'SB-LOV-100', price: 52.5, compareAtPrice: 68.0, stock: 75 },
          { id: 'v-3', name: '10 Sheets / 200 Pcs', sku: 'SB-LOV-200', price: 96.0, compareAtPrice: 129.0, stock: 42 },
        ],
        sales_count: 312,
      },
      {
        category_id: catMap['animals-and-nature'],
        title: 'American Wildlife & National Parks Stamps',
        slug: 'american-wildlife-national-parks-stamps',
        sku: 'SB-NAT-WLD-20',
        short_description: 'Scenic pane of 20 Forever stamps honoring bald eagles, mountain vistas, and protected habitats.',
        description:
          'Pay tribute to America’s majestic national parks and native wildlife. Each sheet showcases high-resolution wildlife photography and alpine landscapes, making every piece of mail a miniature keepsake.',
        issuance_info: 'Issued: May 2023 · Yosemite, CA',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 0,
        base_price: 12.49,
        compare_at_price: 15.0,
        images: ['/uploads/seed/prod-wildlife-nature.png'],
        variants: [
          { id: 'v-1', name: 'Sheet of 20', sku: 'SB-WLD-20', price: 12.49, compareAtPrice: 15.0, stock: 95 },
          { id: 'v-2', name: '5 Sheets / 100 Pcs', sku: 'SB-WLD-100', price: 56.0, compareAtPrice: 70.0, stock: 34 },
        ],
        sales_count: 245,
      },
      {
        category_id: catMap['holiday'],
        title: 'Winter Wreaths & Evergreen Holiday Stamps',
        slug: 'winter-wreaths-holiday-stamps',
        sku: 'SB-HOL-WRT-20',
        short_description: 'Four classic evergreen wreath and crimson berry illustrations for seasonal holiday cards.',
        description:
          'Prepare early for holiday mailings with our Winter Wreaths Forever® booklet. Featuring rich pine greenery, winter berries, and crisp snow accents, these stamps bring warm seasonal polish to every card.',
        issuance_info: 'Issued: October 2023 · North Pole, AK',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 0,
        base_price: 11.49,
        compare_at_price: 14.0,
        images: ['/uploads/seed/prod-holiday-wreaths.png'],
        variants: [
          { id: 'v-1', name: 'Book of 20', sku: 'SB-HOL-20', price: 11.49, compareAtPrice: 14.0, stock: 160 },
          { id: 'v-2', name: '5 Books / 100 Pcs', sku: 'SB-HOL-100', price: 51.99, compareAtPrice: 66.0, stock: 58 },
          { id: 'v-3', name: '10 Books / 200 Pcs', sku: 'SB-HOL-200', price: 95.0, compareAtPrice: 125.0, stock: 22 },
        ],
        sales_count: 289,
      },
      {
        category_id: catMap['celebrations'],
        title: 'Festive Balloons & Celebrations Forever Stamps',
        slug: 'festive-balloons-celebrations-stamps',
        sku: 'SB-CEL-BAL-20',
        short_description: 'Joyful gold and pastel celebration stamps perfect for birthdays, graduations, and party invites.',
        description:
          'Bring instant cheer to milestone mailings. From birthday cards and baby showers to graduation announcements, the Festive Balloons Forever® sheet adds celebratory polish to every envelope.',
        issuance_info: 'Issued: April 2024 · Austin, TX',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 0,
        base_price: 11.95,
        compare_at_price: null,
        images: ['/uploads/seed/prod-celebrations.png'],
        variants: [
          { id: 'v-1', name: 'Sheet of 20', sku: 'SB-CEL-20', price: 11.95, compareAtPrice: null, stock: 140 },
          { id: 'v-2', name: '5 Sheets / 100 Pcs', sku: 'SB-CEL-100', price: 53.5, compareAtPrice: 64.0, stock: 40 },
        ],
        sales_count: 198,
      },
      {
        category_id: catMap['kids'],
        title: 'Space Exploration & Rockets Forever Stamps',
        slug: 'space-exploration-rockets-stamps',
        sku: 'SB-KID-SPC-20',
        short_description: 'Playful retro rockets, ringed planets, and starry galaxies loved by young collectors and families.',
        description:
          'Inspire curiosity with every letter! This vivid Space Exploration sheet highlights colorful spacecraft, planets, and friendly illustrations printed on durable self-adhesive stock.',
        issuance_info: 'Issued: July 2023 · Houston, TX',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 0,
        base_price: 12.25,
        compare_at_price: 14.5,
        images: ['/uploads/seed/prod-kids-space.png'],
        variants: [
          { id: 'v-1', name: 'Sheet of 20', sku: 'SB-KID-20', price: 12.25, compareAtPrice: 14.5, stock: 112 },
          { id: 'v-2', name: '5 Sheets / 100 Pcs', sku: 'SB-KID-100', price: 55.0, compareAtPrice: 68.0, stock: 26 },
        ],
        sales_count: 174,
      },
      {
        category_id: catMap['commemorative'],
        title: 'American Heritage Lighthouses Commemorative Sheet',
        slug: 'american-heritage-lighthouses-commemorative',
        sku: 'SB-COM-LHT-20',
        short_description: 'Fine engraving-style commemorative Forever stamps honoring historic coastal lighthouses.',
        description:
          'Crafted in tribute to traditional intaglio postal art, the American Heritage Lighthouses pane celebrates iconic coastal landmarks. Equally prized by stamp collectors and classic stationery enthusiasts.',
        issuance_info: 'Issued: June 2023 · Portland, ME',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 1,
        base_price: 13.5,
        compare_at_price: 16.99,
        images: ['/uploads/seed/prod-commemorative-classic.png'],
        variants: [
          { id: 'v-1', name: 'Collector Sheet of 20', sku: 'SB-COM-20', price: 13.5, compareAtPrice: 16.99, stock: 88 },
          { id: 'v-2', name: '5 Sheets / 100 Pcs', sku: 'SB-COM-100', price: 61.0, compareAtPrice: 78.0, stock: 19 },
        ],
        sales_count: 231,
      },
      {
        category_id: catMap['flowers'],
        title: 'Garden Roses & Wildflowers Collection',
        slug: 'garden-roses-wildflowers-collection',
        sku: 'SB-FLW-ROS-20',
        short_description: 'Soft watercolor roses and meadow blooms curated for invitations and everyday correspondence.',
        description:
          'A timeless floral assortment featuring lush heirloom roses and American meadow wildflowers. Printed with bright, crisp botanical tones on self-adhesive Forever® sheets.',
        issuance_info: 'Issued: March 2024 · Pasadena, CA',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 0,
        base_price: 11.75,
        compare_at_price: 13.95,
        images: ['/uploads/seed/hero-flowers.png', '/uploads/seed/prod-cactus-flowers.png'],
        variants: [
          { id: 'v-1', name: 'Book of 20', sku: 'SB-ROS-20', price: 11.75, compareAtPrice: 13.95, stock: 150 },
          { id: 'v-2', name: '5 Books / 100 Pcs', sku: 'SB-ROS-100', price: 52.99, compareAtPrice: 65.0, stock: 44 },
        ],
        sales_count: 210,
      },
      {
        category_id: catMap['patriotic'],
        title: 'Stars & Stripes Freedom Forever Booklets',
        slug: 'stars-and-stripes-freedom-booklets',
        sku: 'SB-PAT-STR-20',
        short_description: 'Everyday patriotic booklets ideal for home offices, small businesses, and bulk mailers.',
        description:
          'Clean, bold patriotic artwork on easy-to-store 20-stamp booklets. Keep a few on hand for bills, greetings, and business correspondence—they never expire.',
        issuance_info: 'Issued: February 2024 · Philadelphia, PA',
        origin_info: 'Made in the USA',
        status: 'published',
        is_bestseller: 1,
        is_featured: 0,
        base_price: 10.99,
        compare_at_price: 13.5,
        images: ['/uploads/seed/hero-flag.png', '/uploads/seed/prod-us-flag-roll.png'],
        variants: [
          { id: 'v-1', name: 'Book of 20', sku: 'SB-STR-20', price: 10.99, compareAtPrice: 13.5, stock: 310 },
          { id: 'v-2', name: '5 Books / 100 Pcs', sku: 'SB-STR-100', price: 48.99, compareAtPrice: 62.0, stock: 90 },
          { id: 'v-3', name: '10 Books / 200 Pcs', sku: 'SB-STR-200', price: 89.99, compareAtPrice: 118.0, stock: 35 },
        ],
        sales_count: 305,
      },
    ];

    const insertProd = db.prepare(`
      INSERT INTO products (
        category_id, title, slug, sku, short_description, description,
        issuance_info, origin_info, status, is_bestseller, is_featured,
        base_price, compare_at_price, images_json, variants_json,
        seo_title, seo_description, sort_order, sales_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    products.forEach((p, idx) => {
      insertProd.run(
        p.category_id,
        p.title,
        p.slug,
        p.sku,
        p.short_description,
        p.description,
        p.issuance_info,
        p.origin_info,
        p.status,
        p.is_bestseller,
        p.is_featured,
        p.base_price,
        p.compare_at_price,
        JSON.stringify(p.images),
        JSON.stringify(p.variants),
        `${p.title} | StampsBox`,
        p.short_description,
        idx,
        p.sales_count
      );
    });
  }

  // 6. Seed Stamp Guide Articles
  const artCount = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
  if (artCount === 0) {
    const articles = [
      {
        title: 'How Forever Stamps Work & Why They Never Expire',
        slug: 'how-forever-stamps-work',
        excerpt: 'Understand First-Class postage rates, coil rolls vs. booklets, and how Forever stamps protect you against future rate increases.',
        content:
          'USPS Forever® stamps are always equal in value to the current First-Class Mail one-ounce letter rate, regardless of when you purchased them. Whether rates rise next month or five years from now, your unused Forever stamps remain valid with zero extra postage required.\n\nFor households sending occasional greetings, a 20-stamp booklet is compact and easy to store. For offices, nonprofits, and wedding planners mailing 100+ envelopes, coil rolls of 100 stamps save substantial time and fit standard desktop dispensers.',
        cover_image: '/uploads/seed/hero-flag.png',
        category_tag: 'Stamp Guide',
      },
      {
        title: 'Choosing the Right Postage Stamps for Wedding Invitations',
        slug: 'choosing-wedding-invitation-stamps',
        excerpt: 'A practical weight checklist for multi-piece invitation suites, RSVP cards, and pairing Love or Floral designs.',
        content:
          'Wedding suites often include thick cotton cardstock, inner envelopes, detail cards, and wax seals—which can push an envelope over the standard 1-ounce threshold. Before purchasing postage, bring one fully assembled suite to a postal scale to confirm whether it requires 1 oz or 2 oz postage.\n\nOur Botanical Love Hearts and Cactus Flowers Forever collections are among the top choices for modern invitations because their crisp typography and balanced color palettes elevate every envelope.',
        cover_image: '/uploads/seed/hero-love.png',
        category_tag: 'Stationery Tips',
      },
      {
        title: 'Bulk Coil Rolls vs. Booklets: A Small Business Mailing Guide',
        slug: 'bulk-coil-rolls-vs-booklets-guide',
        excerpt: 'Compare cost per stamp, storage longevity, and handling speed when ordering stamps online for your office.',
        content:
          'When your business mails invoices, thank-you notes, or client packets every week, choosing the right stamp format directly impacts workflow efficiency. Coil rolls of 100 stamps peel rapidly in continuous strips and minimize packaging waste.\n\nKeep unused stamps stored flat in a cool, dry drawer away from direct sunlight so the self-adhesive backing stays fresh for years.',
        cover_image: '/uploads/seed/hero-flowers.png',
        category_tag: 'Business Mailing',
      },
    ];
    const insertArt = db.prepare(
      'INSERT INTO articles (title, slug, excerpt, content, cover_image, category_tag, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const a of articles) {
      insertArt.run(a.title, a.slug, a.excerpt, a.content, a.cover_image, a.category_tag, 'published');
    }
  }

  // 7. Seed FAQs
  const faqCount = db.prepare('SELECT COUNT(*) as c FROM faqs').get().c;
  if (faqCount === 0) {
    const faqs = [
      {
        q: 'Are your Forever stamps genuine and valid for USPS First-Class Mail?',
        a: 'Yes. Every stamp we sell is authentic US Forever® postage valid for First-Class 1-ounce domestic mail, and Forever stamps never expire even if postal rates increase.',
        cat: 'Products',
      },
      {
        q: 'How long does shipping take and when is shipping free?',
        a: 'Orders ship within 1 business day via USPS First-Class Mail (estimated delivery 1–5 business days). Orders of $49.99 or more qualify automatically for Free Standard Shipping.',
        cat: 'Shipping',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We support secure checkout via PayPal (including Visa, Mastercard, American Express, and Discover through PayPal Checkout).',
        cat: 'Payment',
      },
      {
        q: 'What is your return & refund policy?',
        a: 'Unused stamps in original, unopened condition may be returned within 30 days of purchase for a full refund or exchange. Contact our support team with your order number to start a return.',
        cat: 'Returns',
      },
      {
        q: 'Can I track my order after checkout?',
        a: 'Absolutely. Every shipped order receives a tracking number that you can check anytime on our Track Order page using your order number and email address.',
        cat: 'Shipping',
      },
    ];
    const insertFaq = db.prepare('INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)');
    faqs.forEach((f, i) => insertFaq.run(f.q, f.a, f.cat, i));
  }

  // 8. Seed Coupons
  const couponCount = db.prepare('SELECT COUNT(*) as c FROM coupons').get().c;
  if (couponCount === 0) {
    db.prepare(
      'INSERT INTO coupons (code, type, value, min_order_amount, max_uses, used_count, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    ).run('WELCOME10', 'percentage', 10, 20, 500, 14);
    db.prepare(
      'INSERT INTO coupons (code, type, value, min_order_amount, max_uses, used_count, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
    ).run('SAVE5', 'fixed', 5, 40, 200, 6);
  }

  // 9. Seed Sample Orders & Subscribers for lively initial Admin Dashboard
  const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  if (orderCount === 0) {
    const sampleOrders = [
      {
        order_number: 'SB-2026-1042',
        customer_name: 'Emily Carter',
        customer_email: 'emily.carter@example.com',
        customer_phone: '(626) 555-0148',
        shipping_address_json: JSON.stringify({
          line1: '428 Oakwood Ave',
          line2: 'Apt 4B',
          city: 'Pasadena',
          state: 'CA',
          postalCode: '91101',
          country: 'United States',
        }),
        shipping_method: 'standard',
        items_json: JSON.stringify([
          {
            productId: 1,
            title: 'U.S. Flag 2024 Forever Stamps (Coil Rolls)',
            variantName: '1 Roll / 100 Pcs',
            unitPrice: 42.99,
            quantity: 2,
            image: '/uploads/seed/prod-us-flag-roll.png',
          },
        ]),
        subtotal: 85.98,
        discount_amount: 8.6,
        shipping_fee: 0,
        total: 77.38,
        coupon_code: 'WELCOME10',
        payment_status: 'paid',
        paypal_order_id: 'PP-DEMO-8F29A10C',
        paypal_capture_id: 'CAP-DEMO-19B3E',
        paypal_mode: 'demo',
        status: 'shipped',
        tracking_carrier: 'USPS First-Class',
        tracking_number: '9400111899223456789012',
        daysAgo: 3,
      },
      {
        order_number: 'SB-2026-1043',
        customer_name: 'Marcus Bennett',
        customer_email: 'm.bennett@example.com',
        customer_phone: '(415) 555-0182',
        shipping_address_json: JSON.stringify({
          line1: '790 Market St',
          line2: 'Suite 300',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94102',
          country: 'United States',
        }),
        shipping_method: 'express',
        items_json: JSON.stringify([
          {
            productId: 3,
            title: 'Botanical Love Hearts Forever Stamps',
            variantName: '5 Sheets / 100 Pcs',
            unitPrice: 52.5,
            quantity: 1,
            image: '/uploads/seed/prod-love-hearts.png',
          },
          {
            productId: 2,
            title: 'Cactus Flowers Forever Stamps',
            variantName: 'Book of 20',
            unitPrice: 12.75,
            quantity: 2,
            image: '/uploads/seed/prod-cactus-flowers.png',
          },
        ]),
        subtotal: 78.0,
        discount_amount: 0,
        shipping_fee: 14.95,
        total: 92.95,
        coupon_code: '',
        payment_status: 'paid',
        paypal_order_id: 'PP-DEMO-4C11D92B',
        paypal_capture_id: 'CAP-DEMO-74A2C',
        paypal_mode: 'demo',
        status: 'processing',
        tracking_carrier: '',
        tracking_number: '',
        daysAgo: 1,
      },
      {
        order_number: 'SB-2026-1044',
        customer_name: 'Sophia Lin',
        customer_email: 'sophia.lin@example.com',
        customer_phone: '(206) 555-0129',
        shipping_address_json: JSON.stringify({
          line1: '1205 Pine St',
          line2: '',
          city: 'Seattle',
          state: 'WA',
          postalCode: '98101',
          country: 'United States',
        }),
        shipping_method: 'standard',
        items_json: JSON.stringify([
          {
            productId: 5,
            title: 'Winter Wreaths & Evergreen Holiday Stamps',
            variantName: '5 Books / 100 Pcs',
            unitPrice: 51.99,
            quantity: 1,
            image: '/uploads/seed/prod-holiday-wreaths.png',
          },
        ]),
        subtotal: 51.99,
        discount_amount: 0,
        shipping_fee: 0,
        total: 51.99,
        coupon_code: '',
        payment_status: 'paid',
        paypal_order_id: 'PP-DEMO-9E77F01A',
        paypal_capture_id: 'CAP-DEMO-61D8F',
        paypal_mode: 'demo',
        status: 'delivered',
        tracking_carrier: 'USPS Priority',
        tracking_number: '9405511899220001122334',
        daysAgo: 5,
      },
    ];

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, customer_name, customer_email, customer_phone,
        shipping_address_json, shipping_method, items_json,
        subtotal, discount_amount, shipping_fee, total, coupon_code,
        payment_method, payment_status, paypal_order_id, paypal_capture_id, paypal_mode,
        status, tracking_carrier, tracking_number, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);

    for (const o of sampleOrders) {
      insertOrder.run(
        o.order_number,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.shipping_address_json,
        o.shipping_method,
        o.items_json,
        o.subtotal,
        o.discount_amount,
        o.shipping_fee,
        o.total,
        o.coupon_code,
        o.payment_status,
        o.paypal_order_id,
        o.paypal_capture_id,
        o.paypal_mode,
        o.status,
        o.tracking_carrier,
        o.tracking_number,
        `-${o.daysAgo} days`
      );
    }
  }

  const subCount = db.prepare('SELECT COUNT(*) as c FROM subscribers').get().c;
  if (subCount === 0) {
    ['emily.carter@example.com', 'm.bennett@example.com', 'collector.club@example.com'].forEach((em) => {
      db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(em);
    });
  }

  const inqCount = db.prepare('SELECT COUNT(*) as c FROM inquiries').get().c;
  if (inqCount === 0) {
    db.prepare(
      'INSERT INTO inquiries (name, email, subject, message, status) VALUES (?, ?, ?, ?, ?)'
    ).run(
      'Daniel Foster',
      'd.foster@example.com',
      'Bulk order discount inquiry',
      'Hi! We are sending 1,500 holiday mailers for our studio next month. Do you offer custom pricing on 15 coil rolls of U.S. Flag stamps?',
      'unread'
    );
  }
}

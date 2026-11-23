import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { db, toPlain, toPlainList, DEFAULT_HOME_LAYOUT, DEFAULT_STORE_SETTINGS } from '../db.js';
import { hashPassword, verifyPassword, signAdminToken, requireAdmin } from '../auth.js';
import { getAdminPayPalConfig, getPayPalConfig, testPayPalConnection } from '../paypal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext) ? ext : '.png';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
}

export const adminRouter = express.Router();

// ---------------- AUTH ----------------
adminRouter.post('/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const admin = toPlain(
    db.prepare('SELECT * FROM admins WHERE LOWER(email) = LOWER(?)').get(String(email).trim())
  );
  if (!admin || !verifyPassword(String(password), admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signAdminToken(admin);
  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name },
  });
});

// Protect all subsequent routes
adminRouter.use(requireAdmin);

adminRouter.get('/auth/me', (req, res) => {
  const admin = toPlain(db.prepare('SELECT id, email, name, created_at FROM admins WHERE id = ?').get(req.admin.id));
  res.json({ admin });
});

adminRouter.post('/auth/change-password', (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body || {};
  if (String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const admin = toPlain(db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id));
  if (!admin || !verifyPassword(String(currentPassword), admin.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(String(newPassword)), admin.id);
  res.json({ ok: true, message: 'Password updated successfully.' });
});

// ---------------- DASHBOARD ANALYTICS ----------------
adminRouter.get('/dashboard', (_req, res) => {
  const orderStats = toPlain(
    db
      .prepare(
        `SELECT
          COUNT(*) as totalOrders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as totalRevenue,
          SUM(CASE WHEN status IN ('pending', 'paid', 'processing') THEN 1 ELSE 0 END) as pendingFulfillment
         FROM orders`
      )
      .get()
  );

  const productStats = toPlain(
    db
      .prepare(
        `SELECT
          COUNT(*) as totalProducts,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as publishedProducts,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draftProducts,
          SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archivedProducts
         FROM products`
      )
      .get()
  );

  const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  const subscriberCount = db.prepare('SELECT COUNT(*) as c FROM subscribers').get().c;
  const unreadInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'unread'").get().c;

  const recentOrders = toPlainList(
    db
      .prepare(
        `SELECT id, order_number, customer_name, customer_email, total, payment_status, status, paypal_mode, created_at
         FROM orders ORDER BY created_at DESC, id DESC LIMIT 6`
      )
      .all()
  );

  const statusBreakdown = toPlainList(
    db.prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status').all()
  );

  // Daily revenue over last 7 days
  const dailyRows = toPlainList(
    db
      .prepare(
        `SELECT DATE(created_at) as day,
                COUNT(*) as orders,
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue
         FROM orders
         WHERE created_at >= datetime('now', '-6 days')
         GROUP BY DATE(created_at)
         ORDER BY day ASC`
      )
      .all()
  );

  // Low stock variants (< 25)
  const allProducts = toPlainList(db.prepare('SELECT id, title, sku, status, variants_json FROM products').all());
  const lowStock = [];
  for (const p of allProducts) {
    const variants = JSON.parse(p.variants_json || '[]');
    for (const v of variants) {
      if (Number(v.stock) <= 25) {
        lowStock.push({
          productId: p.id,
          title: p.title,
          variantName: v.name,
          stock: Number(v.stock),
          status: p.status,
        });
      }
    }
  }

  const paypal = getAdminPayPalConfig(db);

  res.json({
    kpis: {
      totalRevenue: Number(orderStats.totalRevenue || 0),
      totalOrders: Number(orderStats.totalOrders || 0),
      pendingFulfillment: Number(orderStats.pendingFulfillment || 0),
      totalProducts: Number(productStats.totalProducts || 0),
      publishedProducts: Number(productStats.publishedProducts || 0),
      draftProducts: Number(productStats.draftProducts || 0),
      archivedProducts: Number(productStats.archivedProducts || 0),
      categoryCount,
      subscriberCount,
      unreadInquiries,
    },
    recentOrders,
    statusBreakdown,
    dailySeries: dailyRows,
    lowStock: lowStock.slice(0, 8),
    paypalStatus: {
      mode: paypal.mode,
      effectiveMode: paypal.effectiveMode,
      isConfigured: paypal.isConfigured,
      enabled: paypal.enabled,
    },
  });
});

// ---------------- DRAG-AND-DROP PAGE LAYOUT BUILDER ----------------
adminRouter.get('/layout/:pageKey', (req, res) => {
  const row = toPlain(db.prepare('SELECT * FROM page_layouts WHERE page_key = ?').get(req.params.pageKey));
  const blocks = row ? JSON.parse(row.blocks_json) : DEFAULT_HOME_LAYOUT;
  res.json({ pageKey: req.params.pageKey, blocks, updatedAt: row?.updated_at || null });
});

adminRouter.put('/layout/:pageKey', (req, res) => {
  const { blocks } = req.body || {};
  if (!Array.isArray(blocks)) {
    return res.status(400).json({ error: 'blocks must be an array' });
  }
  const serialized = JSON.stringify(blocks);
  db.prepare(
    `INSERT INTO page_layouts (page_key, blocks_json, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(page_key) DO UPDATE SET blocks_json = excluded.blocks_json, updated_at = CURRENT_TIMESTAMP`
  ).run(req.params.pageKey, serialized);
  res.json({ ok: true, pageKey: req.params.pageKey, blocks });
});

adminRouter.post('/layout/:pageKey/reset', (req, res) => {
  const serialized = JSON.stringify(DEFAULT_HOME_LAYOUT);
  db.prepare(
    `INSERT INTO page_layouts (page_key, blocks_json, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(page_key) DO UPDATE SET blocks_json = excluded.blocks_json, updated_at = CURRENT_TIMESTAMP`
  ).run(req.params.pageKey, serialized);
  res.json({ ok: true, blocks: DEFAULT_HOME_LAYOUT });
});

// ---------------- PRODUCTS CRUD + PUBLISH/UNPUBLISH ----------------
adminRouter.get('/products', (req, res) => {
  const { search = '', status = 'all', categoryId = 'all' } = req.query;
  const where = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    where.push('p.status = ?');
    params.push(status);
  }
  if (categoryId && categoryId !== 'all') {
    where.push('p.category_id = ?');
    params.push(Number(categoryId));
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    where.push('(p.title LIKE ? OR p.sku LIKE ? OR p.slug LIKE ?)');
    params.push(q, q, q);
  }

  const rows = toPlainList(
    db
      .prepare(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE ${where.join(' AND ')}
         ORDER BY p.sort_order ASC, p.id DESC`
      )
      .all(...params)
  );

  const items = rows.map((p) => ({
    id: p.id,
    categoryId: p.category_id,
    categoryName: p.category_name || 'Uncategorized',
    title: p.title,
    slug: p.slug,
    sku: p.sku,
    shortDescription: p.short_description,
    description: p.description,
    issuanceInfo: p.issuance_info,
    originInfo: p.origin_info,
    status: p.status,
    isBestseller: Boolean(p.is_bestseller),
    isFeatured: Boolean(p.is_featured),
    basePrice: Number(p.base_price),
    compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    images: JSON.parse(p.images_json || '[]'),
    variants: JSON.parse(p.variants_json || '[]'),
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    sortOrder: p.sort_order,
    salesCount: p.sales_count,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  res.json({ items });
});

adminRouter.post('/products', (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) {
    return res.status(400).json({ error: 'Product title is required.' });
  }
  let slug = slugify(b.slug || b.title);
  const exists = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug);
  if (exists) slug = `${slug}-${Date.now().toString().slice(-4)}`;

  const variants = Array.isArray(b.variants) && b.variants.length
    ? b.variants
    : [
        {
          id: `v-${Date.now()}`,
          name: 'Book of 20',
          sku: b.sku || `SKU-${Date.now().toString().slice(-5)}`,
          price: Number(b.basePrice || 0),
          compareAtPrice: b.compareAtPrice ? Number(b.compareAtPrice) : null,
          stock: 100,
        },
      ];

  const basePrice = b.basePrice !== undefined && b.basePrice !== ''
    ? Number(b.basePrice)
    : Math.min(...variants.map((v) => Number(v.price) || 0));

  const info = db
    .prepare(
      `INSERT INTO products (
        category_id, title, slug, sku, short_description, description,
        issuance_info, origin_info, status, is_bestseller, is_featured,
        base_price, compare_at_price, images_json, variants_json,
        seo_title, seo_description, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      b.categoryId ? Number(b.categoryId) : null,
      String(b.title).trim(),
      slug,
      String(b.sku || '').trim(),
      String(b.shortDescription || ''),
      String(b.description || ''),
      String(b.issuanceInfo || ''),
      String(b.originInfo || 'Made in the USA'),
      ['published', 'draft', 'archived'].includes(b.status) ? b.status : 'published',
      b.isBestseller ? 1 : 0,
      b.isFeatured ? 1 : 0,
      basePrice,
      b.compareAtPrice !== null && b.compareAtPrice !== '' && b.compareAtPrice !== undefined
        ? Number(b.compareAtPrice)
        : null,
      JSON.stringify(Array.isArray(b.images) ? b.images : []),
      JSON.stringify(variants),
      String(b.seoTitle || `${b.title} | StampsBox`),
      String(b.seoDescription || b.shortDescription || ''),
      Number(b.sortOrder || 0)
    );

  res.status(201).json({ id: info.lastInsertRowid, slug });
});

adminRouter.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = toPlain(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const b = req.body || {};
  const slug = b.slug ? slugify(b.slug) : existing.slug;
  const variants = Array.isArray(b.variants) ? b.variants : JSON.parse(existing.variants_json || '[]');
  const basePrice =
    b.basePrice !== undefined && b.basePrice !== ''
      ? Number(b.basePrice)
      : variants.length
        ? Math.min(...variants.map((v) => Number(v.price) || 0))
        : existing.base_price;

  db.prepare(
    `UPDATE products SET
      category_id = ?, title = ?, slug = ?, sku = ?,
      short_description = ?, description = ?, issuance_info = ?, origin_info = ?,
      status = ?, is_bestseller = ?, is_featured = ?,
      base_price = ?, compare_at_price = ?, images_json = ?, variants_json = ?,
      seo_title = ?, seo_description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    b.categoryId !== undefined ? (b.categoryId ? Number(b.categoryId) : null) : existing.category_id,
    b.title !== undefined ? String(b.title).trim() : existing.title,
    slug,
    b.sku !== undefined ? String(b.sku).trim() : existing.sku,
    b.shortDescription !== undefined ? String(b.shortDescription) : existing.short_description,
    b.description !== undefined ? String(b.description) : existing.description,
    b.issuanceInfo !== undefined ? String(b.issuanceInfo) : existing.issuance_info,
    b.originInfo !== undefined ? String(b.originInfo) : existing.origin_info,
    ['published', 'draft', 'archived'].includes(b.status) ? b.status : existing.status,
    b.isBestseller !== undefined ? (b.isBestseller ? 1 : 0) : existing.is_bestseller,
    b.isFeatured !== undefined ? (b.isFeatured ? 1 : 0) : existing.is_featured,
    basePrice,
    b.compareAtPrice !== undefined
      ? b.compareAtPrice !== null && b.compareAtPrice !== ''
        ? Number(b.compareAtPrice)
        : null
      : existing.compare_at_price,
    b.images !== undefined ? JSON.stringify(b.images) : existing.images_json,
    JSON.stringify(variants),
    b.seoTitle !== undefined ? String(b.seoTitle) : existing.seo_title,
    b.seoDescription !== undefined ? String(b.seoDescription) : existing.seo_description,
    b.sortOrder !== undefined ? Number(b.sortOrder) : existing.sort_order,
    id
  );

  res.json({ ok: true, id });
});

adminRouter.patch('/products/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const { status, isBestseller, isFeatured } = req.body || {};
  const existing = toPlain(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  db.prepare(
    `UPDATE products SET
      status = ?,
      is_bestseller = ?,
      is_featured = ?,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    ['published', 'draft', 'archived'].includes(status) ? status : existing.status,
    isBestseller !== undefined ? (isBestseller ? 1 : 0) : existing.is_bestseller,
    isFeatured !== undefined ? (isFeatured ? 1 : 0) : existing.is_featured,
    id
  );

  res.json({ ok: true });
});

adminRouter.delete('/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.post('/products/bulk', (req, res) => {
  const { ids = [], action = '' } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No product IDs selected' });
  }
  const placeholders = ids.map(() => '?').join(',');
  if (action === 'publish') {
    db.prepare(`UPDATE products SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'archive') {
    db.prepare(`UPDATE products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'draft') {
    db.prepare(`UPDATE products SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'delete') {
    db.prepare(`DELETE FROM products WHERE id IN (${placeholders})`).run(...ids);
  } else {
    return res.status(400).json({ error: 'Unsupported bulk action' });
  }
  res.json({ ok: true, count: ids.length });
});

// ---------------- CATEGORIES CRUD + DRAG REORDER ----------------
adminRouter.get('/categories', (_req, res) => {
  const rows = toPlainList(
    db
      .prepare(
        `SELECT c.*, COUNT(p.id) as product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.id ASC`
      )
      .all()
  );
  res.json({
    items: rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.image_url,
      sortOrder: c.sort_order,
      isVisible: Boolean(c.is_visible),
      productCount: c.product_count,
    })),
  });
});

adminRouter.post('/categories', (req, res) => {
  const { name = '', slug = '', description = '', imageUrl = '', isVisible = true } = req.body || {};
  if (!name.trim()) return res.status(400).json({ error: 'Category name is required.' });
  let finalSlug = slugify(slug || name);
  if (db.prepare('SELECT id FROM categories WHERE slug = ?').get(finalSlug)) {
    finalSlug = `${finalSlug}-${Date.now().toString().slice(-3)}`;
  }
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM categories').get().m;
  const info = db
    .prepare(
      'INSERT INTO categories (name, slug, description, image_url, sort_order, is_visible) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name.trim(), finalSlug, description, imageUrl, maxOrder + 1, isVisible ? 1 : 0);

  res.status(201).json({ id: info.lastInsertRowid, slug: finalSlug });
});

adminRouter.put('/categories/reorder', (req, res) => {
  const { orderedIds = [] } = req.body || {};
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array' });
  }
  const stmt = db.prepare('UPDATE categories SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  orderedIds.forEach((id, index) => {
    stmt.run(index, Number(id));
  });
  res.json({ ok: true });
});

adminRouter.put('/categories/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = toPlain(db.prepare('SELECT * FROM categories WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const { name, slug, description, imageUrl, isVisible } = req.body || {};
  db.prepare(
    `UPDATE categories SET
      name = ?, slug = ?, description = ?, image_url = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    name !== undefined ? String(name).trim() : existing.name,
    slug !== undefined && slug.trim() ? slugify(slug) : existing.slug,
    description !== undefined ? String(description) : existing.description,
    imageUrl !== undefined ? String(imageUrl) : existing.image_url,
    isVisible !== undefined ? (isVisible ? 1 : 0) : existing.is_visible,
    id
  );
  res.json({ ok: true });
});

adminRouter.delete('/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------- ORDERS ----------------
adminRouter.get('/orders', (req, res) => {
  const { status = 'all', search = '' } = req.query;
  const where = ['1=1'];
  const params = [];
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    where.push('(order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)');
    params.push(q, q, q);
  }
  const rows = toPlainList(
    db.prepare(`SELECT * FROM orders WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC`).all(...params)
  );
  res.json({
    items: rows.map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      customerPhone: o.customer_phone,
      shippingAddress: JSON.parse(o.shipping_address_json || '{}'),
      shippingMethod: o.shipping_method,
      items: JSON.parse(o.items_json || '[]'),
      subtotal: o.subtotal,
      discountAmount: o.discount_amount,
      shippingFee: o.shipping_fee,
      total: o.total,
      couponCode: o.coupon_code,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      paypalOrderId: o.paypal_order_id,
      paypalCaptureId: o.paypal_capture_id,
      paypalMode: o.paypal_mode,
      status: o.status,
      trackingCarrier: o.tracking_carrier,
      trackingNumber: o.tracking_number,
      notes: o.notes,
      createdAt: o.created_at,
    })),
  });
});

adminRouter.put('/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = toPlain(db.prepare('SELECT * FROM orders WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'Order not found' });

  const { status, paymentStatus, trackingCarrier, trackingNumber, notes } = req.body || {};
  db.prepare(
    `UPDATE orders SET
      status = ?, payment_status = ?, tracking_carrier = ?, tracking_number = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    status || existing.status,
    paymentStatus || existing.payment_status,
    trackingCarrier !== undefined ? String(trackingCarrier) : existing.tracking_carrier,
    trackingNumber !== undefined ? String(trackingNumber) : existing.tracking_number,
    notes !== undefined ? String(notes) : existing.notes,
    id
  );
  res.json({ ok: true });
});

// ---------------- COUPONS ----------------
adminRouter.get('/coupons', (_req, res) => {
  res.json({ items: toPlainList(db.prepare('SELECT * FROM coupons ORDER BY id DESC').all()) });
});

adminRouter.post('/coupons', (req, res) => {
  const { code = '', type = 'percentage', value = 10, minOrderAmount = 0, maxUses = 0, expiresAt = null, isActive = true } = req.body || {};
  if (!code.trim()) return res.status(400).json({ error: 'Coupon code is required' });
  try {
    const info = db
      .prepare(
        'INSERT INTO coupons (code, type, value, min_order_amount, max_uses, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        code.trim().toUpperCase(),
        type === 'fixed' ? 'fixed' : 'percentage',
        Number(value),
        Number(minOrderAmount || 0),
        Number(maxUses || 0),
        expiresAt || null,
        isActive ? 1 : 0
      );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: 'Coupon code already exists.' });
  }
});

adminRouter.put('/coupons/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = toPlain(db.prepare('SELECT * FROM coupons WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'Coupon not found' });
  const { code, type, value, minOrderAmount, maxUses, expiresAt, isActive } = req.body || {};
  db.prepare(
    'UPDATE coupons SET code = ?, type = ?, value = ?, min_order_amount = ?, max_uses = ?, expires_at = ?, is_active = ? WHERE id = ?'
  ).run(
    code ? code.trim().toUpperCase() : existing.code,
    type || existing.type,
    value !== undefined ? Number(value) : existing.value,
    minOrderAmount !== undefined ? Number(minOrderAmount) : existing.min_order_amount,
    maxUses !== undefined ? Number(maxUses) : existing.max_uses,
    expiresAt !== undefined ? expiresAt : existing.expires_at,
    isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    id
  );
  res.json({ ok: true });
});

adminRouter.delete('/coupons/:id', (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------- ARTICLES / CMS ----------------
adminRouter.get('/articles', (_req, res) => {
  res.json({ items: toPlainList(db.prepare('SELECT * FROM articles ORDER BY id DESC').all()) });
});

adminRouter.post('/articles', (req, res) => {
  const { title = '', slug = '', excerpt = '', content = '', coverImage = '', categoryTag = 'Stamp Guide', status = 'published' } = req.body || {};
  if (!title.trim()) return res.status(400).json({ error: 'Title is required' });
  let finalSlug = slugify(slug || title);
  if (db.prepare('SELECT id FROM articles WHERE slug = ?').get(finalSlug)) {
    finalSlug = `${finalSlug}-${Date.now().toString().slice(-3)}`;
  }
  const info = db
    .prepare(
      'INSERT INTO articles (title, slug, excerpt, content, cover_image, category_tag, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(title.trim(), finalSlug, excerpt, content, coverImage, categoryTag, status);
  res.status(201).json({ id: info.lastInsertRowid, slug: finalSlug });
});

adminRouter.put('/articles/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = toPlain(db.prepare('SELECT * FROM articles WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'Article not found' });
  const { title, slug, excerpt, content, coverImage, categoryTag, status } = req.body || {};
  db.prepare(
    'UPDATE articles SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, category_tag = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(
    title !== undefined ? title.trim() : existing.title,
    slug ? slugify(slug) : existing.slug,
    excerpt !== undefined ? excerpt : existing.excerpt,
    content !== undefined ? content : existing.content,
    coverImage !== undefined ? coverImage : existing.cover_image,
    categoryTag !== undefined ? categoryTag : existing.category_tag,
    status || existing.status,
    id
  );
  res.json({ ok: true });
});

adminRouter.delete('/articles/:id', (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------- FAQS, INQUIRIES, SUBSCRIBERS ----------------
adminRouter.get('/faqs', (_req, res) => {
  res.json({ items: toPlainList(db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC, id ASC').all()) });
});

adminRouter.post('/faqs', (req, res) => {
  const { question = '', answer = '', category = 'General', isVisible = true } = req.body || {};
  if (!question.trim() || !answer.trim()) return res.status(400).json({ error: 'Question and answer are required' });
  const info = db
    .prepare('INSERT INTO faqs (question, answer, category, is_visible) VALUES (?, ?, ?, ?)')
    .run(question.trim(), answer.trim(), category, isVisible ? 1 : 0);
  res.status(201).json({ id: info.lastInsertRowid });
});

adminRouter.put('/faqs/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = toPlain(db.prepare('SELECT * FROM faqs WHERE id = ?').get(id));
  if (!existing) return res.status(404).json({ error: 'FAQ not found' });
  const { question, answer, category, isVisible } = req.body || {};
  db.prepare('UPDATE faqs SET question = ?, answer = ?, category = ?, is_visible = ? WHERE id = ?').run(
    question ?? existing.question,
    answer ?? existing.answer,
    category ?? existing.category,
    isVisible !== undefined ? (isVisible ? 1 : 0) : existing.is_visible,
    id
  );
  res.json({ ok: true });
});

adminRouter.delete('/faqs/:id', (req, res) => {
  db.prepare('DELETE FROM faqs WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/inquiries', (_req, res) => {
  res.json({ items: toPlainList(db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC').all()) });
});

adminRouter.patch('/inquiries/:id', (req, res) => {
  const { status = 'read' } = req.body || {};
  db.prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.delete('/inquiries/:id', (req, res) => {
  db.prepare('DELETE FROM inquiries WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

adminRouter.get('/subscribers', (_req, res) => {
  res.json({ items: toPlainList(db.prepare('SELECT * FROM subscribers ORDER BY created_at DESC').all()) });
});

adminRouter.delete('/subscribers/:id', (req, res) => {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------------- MEDIA LIBRARY & UPLOAD ----------------
adminRouter.get('/media', (_req, res) => {
  const dbMedia = toPlainList(db.prepare('SELECT * FROM media ORDER BY created_at DESC, id DESC').all());
  // Also include seed images so admins can pick them easily
  const seedDir = path.join(uploadsDir, 'seed');
  let seedItems = [];
  if (fs.existsSync(seedDir)) {
    seedItems = fs
      .readdirSync(seedDir)
      .filter((f) => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
      .map((f) => ({
        id: `seed-${f}`,
        filename: f,
        original_name: f,
        url: `/uploads/seed/${f}`,
        isSeed: true,
      }));
  }
  res.json({ items: [...dbMedia, ...seedItems] });
});

adminRouter.post('/media/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const url = `/uploads/${req.file.filename}`;
  const info = db
    .prepare('INSERT INTO media (filename, original_name, url, mime_type, size) VALUES (?, ?, ?, ?, ?)')
    .run(req.file.filename, req.file.originalname, url, req.file.mimetype, req.file.size);
  res.status(201).json({
    id: info.lastInsertRowid,
    filename: req.file.filename,
    originalName: req.file.originalname,
    url,
    size: req.file.size,
  });
});

adminRouter.delete('/media/:id', (req, res) => {
  const item = toPlain(db.prepare('SELECT * FROM media WHERE id = ?').get(Number(req.params.id)));
  if (item) {
    const fullPath = path.join(uploadsDir, item.filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    db.prepare('DELETE FROM media WHERE id = ?').run(item.id);
  }
  res.json({ ok: true });
});

// ---------------- STORE & PAYPAL SETTINGS ----------------
adminRouter.get('/settings', (_req, res) => {
  const storeRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('store');
  const store = storeRow ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(storeRow.value_json) } : DEFAULT_STORE_SETTINGS;
  const paypal = getAdminPayPalConfig(db);
  res.json({ store, paypal });
});

adminRouter.put('/settings/store', (req, res) => {
  const storeRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('store');
  const current = storeRow ? JSON.parse(storeRow.value_json) : DEFAULT_STORE_SETTINGS;
  const updated = { ...current, ...(req.body || {}) };
  db.prepare(
    `INSERT INTO settings (key, value_json, updated_at) VALUES ('store', ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).run(JSON.stringify(updated));
  res.json({ ok: true, store: updated });
});

adminRouter.put('/settings/paypal', (req, res) => {
  const current = getPayPalConfig(db);
  const b = req.body || {};
  const next = {
    mode: ['demo', 'sandbox', 'live'].includes(b.mode) ? b.mode : current.mode,
    clientId: b.clientId !== undefined ? String(b.clientId).trim() : current.clientId,
    // Keep existing secret if client left field blank and did not explicitly clear it
    clientSecret:
      b.clearSecret === true
        ? ''
        : b.clientSecret !== undefined && String(b.clientSecret).trim() !== ''
          ? String(b.clientSecret).trim()
          : current.clientSecret,
    webhookId: b.webhookId !== undefined ? String(b.webhookId).trim() : current.webhookId,
    currency: (b.currency || current.currency || 'USD').toUpperCase(),
    enabled: b.enabled !== undefined ? Boolean(b.enabled) : current.enabled,
    expressCheckoutEnabled:
      b.expressCheckoutEnabled !== undefined ? Boolean(b.expressCheckoutEnabled) : current.expressCheckoutEnabled,
    brandName: b.brandName !== undefined ? String(b.brandName) : current.brandName,
  };

  db.prepare(
    `INSERT INTO settings (key, value_json, updated_at) VALUES ('paypal', ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`
  ).run(JSON.stringify(next));

  res.json({ ok: true, paypal: getAdminPayPalConfig(db) });
});

adminRouter.post('/settings/paypal/test', async (_req, res) => {
  const cfg = getPayPalConfig(db);
  const result = await testPayPalConnection(cfg);
  res.json(result);
});

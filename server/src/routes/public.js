import express from 'express';
import crypto from 'node:crypto';
import { db, toPlain, toPlainList, DEFAULT_STORE_SETTINGS, DEFAULT_HOME_LAYOUT } from '../db.js';
import {
  getPayPalConfig,
  getPublicPayPalConfig,
  createPayPalOrder,
  capturePayPalOrder,
} from '../paypal.js';

export const publicRouter = express.Router();

function formatProduct(row) {
  if (!row) return null;
  const p = toPlain(row);
  const images = JSON.parse(p.images_json || '[]');
  const variants = JSON.parse(p.variants_json || '[]');
  const minVariantPrice = variants.length
    ? Math.min(...variants.map((v) => Number(v.price) || 0))
    : Number(p.base_price);

  return {
    id: p.id,
    categoryId: p.category_id,
    categoryName: p.category_name || '',
    categorySlug: p.category_slug || '',
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
    minPrice: minVariantPrice,
    compareAtPrice: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    images,
    variants,
    hasMultipleVariants: variants.length > 1,
    seoTitle: p.seo_title,
    seoDescription: p.seo_description,
    salesCount: p.sales_count,
    createdAt: p.created_at,
  };
}

function getStoreSettings() {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('store');
  const parsed = row ? JSON.parse(row.value_json) : {};
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...parsed,
    navItems: Array.isArray(parsed.navItems) ? parsed.navItems : DEFAULT_STORE_SETTINGS.navItems,
    social: { ...DEFAULT_STORE_SETTINGS.social, ...(parsed.social || {}) },
  };
}

// Bootstrap storefront config, categories, homepage layout, and public PayPal status
publicRouter.get('/store/bootstrap', (_req, res) => {
  const store = getStoreSettings();
  const categories = toPlainList(
    db
      .prepare(
        `SELECT c.*, COUNT(CASE WHEN p.status = 'published' THEN 1 END) as product_count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
         WHERE c.is_visible = 1
         GROUP BY c.id
         ORDER BY c.sort_order ASC, c.id ASC`
      )
      .all()
  ).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.image_url,
    sortOrder: c.sort_order,
    productCount: c.product_count,
  }));

  const pages = toPlainList(
    db
      .prepare("SELECT id, title, slug FROM custom_pages WHERE status = 'published' ORDER BY id ASC")
      .all()
  );

  const layoutRow = db.prepare('SELECT blocks_json FROM page_layouts WHERE page_key = ?').get('home');
  const homeLayout = layoutRow ? JSON.parse(layoutRow.blocks_json) : DEFAULT_HOME_LAYOUT;
  const paypal = getPublicPayPalConfig(db);

  res.json({ store, categories, pages, homeLayout, paypal });
});

// Public Custom Page by slug
publicRouter.get('/pages/:slug', (req, res) => {
  const row = toPlain(
    db
      .prepare("SELECT * FROM custom_pages WHERE slug = ? AND status = 'published'")
      .get(req.params.slug)
  );
  if (!row) return res.status(404).json({ error: 'Page not found' });
  res.json({
    page: {
      id: row.id,
      title: row.title,
      slug: row.slug,
      kicker: row.kicker,
      subtitle: row.subtitle,
      coverImage: row.cover_image,
      content: row.content,
      ctaText: row.cta_text,
      ctaLink: row.cta_link,
      status: row.status,
      updatedAt: row.updated_at,
    },
  });
});

// List published products with filtering & sorting
publicRouter.get('/products', (req, res) => {
  const {
    category,
    search,
    bestseller,
    featured,
    sort = 'default',
    minPrice,
    maxPrice,
    limit = 60,
    page = 1,
  } = req.query;

  const where = ["p.status = 'published'"];
  const params = [];

  if (category && category !== 'all') {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (bestseller === 'true' || bestseller === '1') {
    where.push('p.is_bestseller = 1');
  }
  if (featured === 'true' || featured === '1') {
    where.push('p.is_featured = 1');
  }
  if (search && String(search).trim()) {
    const q = `%${String(search).trim()}%`;
    where.push('(p.title LIKE ? OR p.short_description LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)');
    params.push(q, q, q, q);
  }
  if (minPrice !== undefined && minPrice !== '') {
    where.push('p.base_price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    where.push('p.base_price <= ?');
    params.push(Number(maxPrice));
  }

  let orderBy = 'p.sort_order ASC, p.id DESC';
  if (sort === 'popularity') orderBy = 'p.sales_count DESC, p.id DESC';
  else if (sort === 'latest') orderBy = 'p.created_at DESC, p.id DESC';
  else if (sort === 'price_asc') orderBy = 'p.base_price ASC';
  else if (sort === 'price_desc') orderBy = 'p.base_price DESC';

  const whereSql = where.join(' AND ');
  const total = db
    .prepare(
      `SELECT COUNT(*) as c FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${whereSql}`
    )
    .get(...params).c;

  const lim = Math.min(100, Math.max(1, Number(limit) || 60));
  const pg = Math.max(1, Number(page) || 1);
  const offset = (pg - 1) * lim;

  const rows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, lim, offset);

  res.json({
    items: rows.map(formatProduct),
    total,
    page: pg,
    limit: lim,
    totalPages: Math.ceil(total / lim),
  });
});

// Single product detail + related products
publicRouter.get('/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.status = 'published'`
    )
    .get(req.params.slug);

  if (!row) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = formatProduct(row);
  const relatedRows = db
    .prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'published' AND p.id != ?
       ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END, p.sales_count DESC
       LIMIT 4`
    )
    .all(product.id, product.categoryId || -1);

  res.json({
    product,
    related: relatedRows.map(formatProduct),
  });
});

// Articles / Stamp Guide
publicRouter.get('/articles', (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const rows = toPlainList(
    db
      .prepare(
        `SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT ?`
      )
      .all(limit)
  );
  res.json({ items: rows });
});

publicRouter.get('/articles/:slug', (req, res) => {
  const row = toPlain(
    db.prepare(`SELECT * FROM articles WHERE slug = ? AND status = 'published'`).get(req.params.slug)
  );
  if (!row) return res.status(404).json({ error: 'Article not found' });
  res.json({ article: row });
});

// FAQs
publicRouter.get('/faqs', (_req, res) => {
  const items = toPlainList(
    db.prepare('SELECT * FROM faqs WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC').all()
  );
  res.json({ items });
});

// Validate coupon code
function evaluateCoupon(code, subtotal) {
  if (!code || !code.trim()) return { valid: false, discount: 0, message: '' };
  const coupon = toPlain(
    db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(code.trim())
  );
  if (!coupon) {
    return { valid: false, discount: 0, message: 'Invalid or inactive coupon code.' };
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, discount: 0, message: 'This coupon code has expired.' };
  }
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return { valid: false, discount: 0, message: 'This coupon has reached its usage limit.' };
  }
  if (subtotal < Number(coupon.min_order_amount || 0)) {
    return {
      valid: false,
      discount: 0,
      message: `Minimum order of $${Number(coupon.min_order_amount).toFixed(2)} required for this code.`,
    };
  }
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Number(((subtotal * Number(coupon.value)) / 100).toFixed(2));
  } else {
    discount = Math.min(subtotal, Number(coupon.value));
  }
  return { valid: true, coupon, discount, message: `Coupon ${coupon.code} applied!` };
}

publicRouter.post('/coupons/validate', (req, res) => {
  const { code, subtotal = 0 } = req.body || {};
  const result = evaluateCoupon(code, Number(subtotal));
  if (!result.valid) {
    return res.status(400).json({ error: result.message });
  }
  res.json({
    code: result.coupon.code,
    type: result.coupon.type,
    value: result.coupon.value,
    discount: result.discount,
    message: result.message,
  });
});

// Create order (before PayPal payment approval)
publicRouter.post('/orders', (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone = '',
    shippingAddress,
    shippingMethod = 'standard',
    items = [],
    couponCode = '',
    notes = '',
  } = req.body || {};

  if (!customerName || !customerEmail || !shippingAddress?.line1 || !shippingAddress?.city) {
    return res.status(400).json({ error: 'Please complete all required contact and shipping address fields.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' });
  }

  const store = getStoreSettings();
  const normalizedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const prod = toPlain(
      db.prepare("SELECT * FROM products WHERE id = ? AND status = 'published'").get(item.productId)
    );
    if (!prod) {
      return res.status(400).json({ error: `Product #${item.productId} is no longer available.` });
    }
    const variants = JSON.parse(prod.variants_json || '[]');
    const images = JSON.parse(prod.images_json || '[]');
    const chosenVariant =
      variants.find((v) => v.id === item.variantId || v.name === item.variantName) || variants[0] || null;
    const unitPrice = chosenVariant ? Number(chosenVariant.price) : Number(prod.base_price);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

    if (chosenVariant && chosenVariant.stock !== undefined && chosenVariant.stock < qty) {
      return res.status(400).json({
        error: `Insufficient stock for ${prod.title} (${chosenVariant.name}). Only ${chosenVariant.stock} left.`,
      });
    }

    subtotal += unitPrice * qty;
    normalizedItems.push({
      productId: prod.id,
      slug: prod.slug,
      title: prod.title,
      variantId: chosenVariant?.id || '',
      variantName: chosenVariant?.name || 'Standard',
      unitPrice,
      quantity: qty,
      image: images[0] || '',
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  const couponEval = evaluateCoupon(couponCode, subtotal);
  const discountAmount = couponEval.valid ? couponEval.discount : 0;
  const appliedCode = couponEval.valid ? couponEval.coupon.code : '';

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  let shippingFee = 0;
  if (shippingMethod === 'express') {
    shippingFee = Number(store.expressShippingFee || 14.95);
  } else {
    shippingFee =
      afterDiscount >= Number(store.freeShippingThreshold || 49.99)
        ? 0
        : Number(store.standardShippingFee || 4.95);
  }

  const total = Number((afterDiscount + shippingFee).toFixed(2));
  const orderNumber = `SB-${new Date().getFullYear()}-${crypto.randomInt(100000, 999999)}`;
  const paypalCfg = getPayPalConfig(db);

  const info = db
    .prepare(
      `INSERT INTO orders (
        order_number, customer_name, customer_email, customer_phone,
        shipping_address_json, shipping_method, items_json,
        subtotal, discount_amount, shipping_fee, total, coupon_code,
        payment_method, payment_status, paypal_mode, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paypal', 'unpaid', ?, 'pending', ?)`
    )
    .run(
      orderNumber,
      customerName.trim(),
      customerEmail.trim().toLowerCase(),
      customerPhone.trim(),
      JSON.stringify(shippingAddress),
      shippingMethod,
      JSON.stringify(normalizedItems),
      subtotal,
      discountAmount,
      shippingFee,
      total,
      appliedCode,
      paypalCfg.effectiveMode,
      notes
    );

  const created = toPlain(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid));
  res.status(201).json({
    order: {
      id: created.id,
      orderNumber: created.order_number,
      subtotal: created.subtotal,
      discountAmount: created.discount_amount,
      shippingFee: created.shipping_fee,
      total: created.total,
      couponCode: created.coupon_code,
      paymentStatus: created.payment_status,
      status: created.status,
      paypalMode: created.paypal_mode,
    },
  });
});

// PayPal Step 1: Create PayPal Order (real v2 REST API when configured, reserved demo flow otherwise)
publicRouter.post('/payments/paypal/create-order', async (req, res) => {
  try {
    const { orderNumber } = req.body || {};
    const order = toPlain(db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const cfg = getPayPalConfig(db);
    if (!cfg.enabled) {
      return res.status(400).json({ error: 'PayPal checkout is currently disabled in Store Settings.' });
    }

    const ppResult = await createPayPalOrder(cfg, order);
    db.prepare(
      'UPDATE orders SET paypal_order_id = ?, paypal_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(ppResult.paypalOrderId, ppResult.mode, order.id);

    res.json({
      paypalOrderId: ppResult.paypalOrderId,
      mode: ppResult.mode,
      isConfigured: cfg.isConfigured,
      status: ppResult.status,
      orderNumber: order.order_number,
      amount: order.total,
      currency: cfg.currency,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to initialize PayPal order' });
  }
});

// PayPal Step 2: Capture PayPal Order & finalize store order
publicRouter.post('/payments/paypal/capture-order', async (req, res) => {
  try {
    const { orderNumber, paypalOrderId } = req.body || {};
    const order = toPlain(
      db
        .prepare('SELECT * FROM orders WHERE order_number = ? OR paypal_order_id = ?')
        .get(orderNumber || '', paypalOrderId || '')
    );
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid') {
      return res.json({
        orderNumber: order.order_number,
        paymentStatus: 'paid',
        status: order.status,
        paypalOrderId: order.paypal_order_id,
        paypalCaptureId: order.paypal_capture_id,
        mode: order.paypal_mode,
      });
    }

    const cfg = getPayPalConfig(db);
    const targetPayPalId = paypalOrderId || order.paypal_order_id;
    const capture = await capturePayPalOrder(cfg, targetPayPalId);

    db.prepare(
      `UPDATE orders
       SET payment_status = 'paid',
           status = 'paid',
           paypal_order_id = ?,
           paypal_capture_id = ?,
           paypal_mode = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(capture.paypalOrderId, capture.captureId, capture.mode, order.id);

    // Decrement variant stock & increment sales_count
    const items = JSON.parse(order.items_json || '[]');
    for (const item of items) {
      const prod = toPlain(db.prepare('SELECT id, variants_json, sales_count FROM products WHERE id = ?').get(item.productId));
      if (prod) {
        const variants = JSON.parse(prod.variants_json || '[]');
        const updatedVariants = variants.map((v) => {
          if (v.id === item.variantId || v.name === item.variantName) {
            return { ...v, stock: Math.max(0, Number(v.stock || 0) - Number(item.quantity || 1)) };
          }
          return v;
        });
        db.prepare('UPDATE products SET variants_json = ?, sales_count = sales_count + ? WHERE id = ?').run(
          JSON.stringify(updatedVariants),
          Number(item.quantity || 1),
          prod.id
        );
      }
    }

    if (order.coupon_code) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code) = UPPER(?)').run(order.coupon_code);
    }

    res.json({
      orderNumber: order.order_number,
      paymentStatus: 'paid',
      status: 'paid',
      paypalOrderId: capture.paypalOrderId,
      paypalCaptureId: capture.captureId,
      mode: capture.mode,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to capture PayPal payment' });
  }
});

// Reserved PayPal Webhook endpoint (ready for PAYMENT.CAPTURE.COMPLETED / REFUNDED events)
publicRouter.post('/payments/paypal/webhook', (req, res) => {
  const event = req.body || {};
  const eventType = event.event_type || '';
  const resource = event.resource || {};

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && resource.supplementary_data?.related_ids?.order_id) {
    const ppOrderId = resource.supplementary_data.related_ids.order_id;
    db.prepare(
      `UPDATE orders SET payment_status = 'paid', status = CASE WHEN status = 'pending' THEN 'paid' ELSE status END, paypal_capture_id = ?, updated_at = CURRENT_TIMESTAMP WHERE paypal_order_id = ?`
    ).run(resource.id || '', ppOrderId);
  } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED' && resource.id) {
    db.prepare(
      `UPDATE orders SET payment_status = 'refunded', status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE paypal_capture_id = ?`
    ).run(resource.id);
  }

  res.status(200).json({ received: true, eventType });
});

// Track order by order number + email
publicRouter.get('/orders/track', (req, res) => {
  const { orderNumber = '', email = '' } = req.query;
  if (!orderNumber.trim() || !email.trim()) {
    return res.status(400).json({ error: 'Order number and email are required.' });
  }
  const order = toPlain(
    db
      .prepare('SELECT * FROM orders WHERE UPPER(order_number) = UPPER(?) AND LOWER(customer_email) = LOWER(?)')
      .get(orderNumber.trim(), email.trim())
  );
  if (!order) {
    return res.status(404).json({ error: 'No matching order found. Please check your order number and email.' });
  }
  res.json({
    order: {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      shippingAddress: JSON.parse(order.shipping_address_json || '{}'),
      shippingMethod: order.shipping_method,
      items: JSON.parse(order.items_json || '[]'),
      subtotal: order.subtotal,
      discountAmount: order.discount_amount,
      shippingFee: order.shipping_fee,
      total: order.total,
      couponCode: order.coupon_code,
      paymentStatus: order.payment_status,
      paypalMode: order.paypal_mode,
      paypalOrderId: order.paypal_order_id,
      status: order.status,
      trackingCarrier: order.tracking_carrier,
      trackingNumber: order.tracking_number,
      createdAt: order.created_at,
    },
  });
});

// Newsletter subscription
publicRouter.post('/newsletter/subscribe', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  db.prepare('INSERT OR IGNORE INTO subscribers (email) VALUES (?)').run(email);
  res.json({ ok: true, message: 'Thank you for subscribing to our mailing list!' });
});

// Customer inquiries / Contact / Ask a question
publicRouter.post('/inquiries', (req, res) => {
  const { name = '', email = '', subject = '', productId = null, message = '' } = req.body || {};
  if (!name.trim() || !email.trim() || !message.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  db.prepare(
    'INSERT INTO inquiries (name, email, subject, product_id, message, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), email.trim(), subject.trim(), productId || null, message.trim(), 'unread');
  res.status(201).json({ ok: true, message: 'Your message has been sent! We will reply shortly.' });
});

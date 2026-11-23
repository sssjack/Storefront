import crypto from 'node:crypto';

const PAYPAL_BASE_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
};

export function getPayPalConfig(db) {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('paypal');
  const saved = row ? JSON.parse(row.value_json) : {};

  const mode = saved.mode || process.env.PAYPAL_MODE || 'demo';
  const clientId = (saved.clientId ?? process.env.PAYPAL_CLIENT_ID ?? '').trim();
  const clientSecret = (saved.clientSecret ?? process.env.PAYPAL_CLIENT_SECRET ?? '').trim();
  const webhookId = (saved.webhookId ?? process.env.PAYPAL_WEBHOOK_ID ?? '').trim();
  const currency = (saved.currency || process.env.PAYPAL_CURRENCY || 'USD').toUpperCase();
  const enabled = saved.enabled !== undefined ? Boolean(saved.enabled) : true;
  const expressCheckoutEnabled =
    saved.expressCheckoutEnabled !== undefined ? Boolean(saved.expressCheckoutEnabled) : true;
  const brandName = saved.brandName || 'StampsBox';

  const isConfigured = Boolean(clientId && clientSecret && (mode === 'sandbox' || mode === 'live'));

  return {
    mode,
    clientId,
    clientSecret,
    webhookId,
    currency,
    enabled,
    expressCheckoutEnabled,
    brandName,
    isConfigured,
    effectiveMode: isConfigured ? mode : 'demo',
  };
}

export function getPublicPayPalConfig(db) {
  const cfg = getPayPalConfig(db);
  return {
    enabled: cfg.enabled,
    expressCheckoutEnabled: cfg.expressCheckoutEnabled,
    mode: cfg.mode,
    effectiveMode: cfg.effectiveMode,
    isConfigured: cfg.isConfigured,
    clientId: cfg.isConfigured ? cfg.clientId : '',
    currency: cfg.currency,
    brandName: cfg.brandName,
  };
}

export function getAdminPayPalConfig(db) {
  const cfg = getPayPalConfig(db);
  return {
    ...cfg,
    hasClientSecret: Boolean(cfg.clientSecret),
    clientSecretMasked: cfg.clientSecret
      ? `${cfg.clientSecret.slice(0, 4)}${'•'.repeat(Math.max(8, cfg.clientSecret.length - 8))}${cfg.clientSecret.slice(-4)}`
      : '',
  };
}

async function getAccessToken(cfg) {
  const baseUrl = PAYPAL_BASE_URLS[cfg.mode] || PAYPAL_BASE_URLS.sandbox;
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.message || 'Failed to authenticate with PayPal API');
  }
  return { accessToken: data.access_token, baseUrl };
}

export async function testPayPalConnection(cfg) {
  if (!cfg.clientId || !cfg.clientSecret) {
    return {
      ok: false,
      mode: cfg.mode,
      message: '尚未填写 PayPal Client ID 或 Client Secret，当前处于预留演示模式。',
    };
  }
  if (cfg.mode === 'demo') {
    return {
      ok: false,
      mode: 'demo',
      message: '当前模式为 Demo 演示模式；请切换为 Sandbox 或 Live 后再测试真实连通性。',
    };
  }
  try {
    const { baseUrl } = await getAccessToken(cfg);
    return {
      ok: true,
      mode: cfg.mode,
      endpoint: baseUrl,
      message: `PayPal ${cfg.mode.toUpperCase()} OAuth2 凭证验证成功！`,
    };
  } catch (err) {
    return {
      ok: false,
      mode: cfg.mode,
      message: `连接失败: ${err.message}`,
    };
  }
}

export async function createPayPalOrder(cfg, order) {
  // Reserved Demo Simulation Mode when real PayPal credentials are not yet provided
  if (!cfg.isConfigured) {
    const demoPayPalOrderId = `PP-DEMO-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    return {
      mode: 'demo',
      paypalOrderId: demoPayPalOrderId,
      status: 'CREATED',
      approvalNote: 'PayPal credentials are reserved. Running in simulated PayPal Checkout mode.',
    };
  }

  const { accessToken, baseUrl } = await getAccessToken(cfg);
  const items = JSON.parse(order.items_json || '[]');
  const currency = cfg.currency || 'USD';

  const itemTotal = Number(order.subtotal).toFixed(2);
  const shippingTotal = Number(order.shipping_fee).toFixed(2);
  const discountTotal = Number(order.discount_amount || 0).toFixed(2);
  const grandTotal = Number(order.total).toFixed(2);

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.order_number,
        description: `${cfg.brandName} Order ${order.order_number}`,
        amount: {
          currency_code: currency,
          value: grandTotal,
          breakdown: {
            item_total: { currency_code: currency, value: itemTotal },
            shipping: { currency_code: currency, value: shippingTotal },
            ...(Number(discountTotal) > 0
              ? { discount: { currency_code: currency, value: discountTotal } }
              : {}),
          },
        },
        items: items.map((item) => ({
          name: `${item.title}${item.variantName ? ` (${item.variantName})` : ''}`.slice(0, 120),
          unit_amount: { currency_code: currency, value: Number(item.unitPrice).toFixed(2) },
          quantity: String(item.quantity),
        })),
      },
    ],
    application_context: {
      brand_name: cfg.brandName,
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || !data.id) {
    throw new Error(data.message || 'PayPal create order failed');
  }

  return {
    mode: cfg.mode,
    paypalOrderId: data.id,
    status: data.status,
    raw: data,
  };
}

export async function capturePayPalOrder(cfg, paypalOrderId) {
  if (!cfg.isConfigured || paypalOrderId.startsWith('PP-DEMO-')) {
    return {
      mode: 'demo',
      paypalOrderId,
      captureId: `CAP-DEMO-${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      status: 'COMPLETED',
    };
  }

  const { accessToken, baseUrl } = await getAccessToken(cfg);
  const response = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok || data.status !== 'COMPLETED') {
    throw new Error(data.message || `PayPal capture failed (status: ${data.status || response.status})`);
  }

  const captureId =
    data.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP-${paypalOrderId}`;

  return {
    mode: cfg.mode,
    paypalOrderId: data.id,
    captureId,
    status: data.status,
    raw: data,
  };
}

import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const SHOPIFY_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || '';
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

// Health Check
router.get("/health", (req, res) => {
  res.json({ status: "ok", serverTime: new Date().toISOString() });
});

// Shopify Diagnostics
router.get("/shopify/diagnostics", (req, res) => {
  const adminToken = SHOPIFY_ADMIN_TOKEN || (req.query.token as string);
  const storefrontToken = SHOPIFY_STOREFRONT_TOKEN || (req.query.sfToken as string);
  
  res.json({
    domain: SHOPIFY_DOMAIN,
    hasAdminToken: !!adminToken,
    adminTokenPrefix: adminToken ? adminToken.substring(0, 6) : null,
    isAdminTokenValidFormat: adminToken ? adminToken.startsWith('shpat_') : false,
    hasStorefrontToken: !!storefrontToken,
    storefrontTokenPrefix: storefrontToken ? storefrontToken.substring(0, 6) : null,
  });
});

// ImgBB Upload Proxy
router.post("/image/upload", async (req, res) => {
  const apiKey = IMGBB_API_KEY || req.body.apiKey;
  if (!apiKey) {
    return res.status(500).json({ error: "ImgBB API Key not configured." });
  }

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image data provided" });

  try {
    const formData = new URLSearchParams();
    formData.append('image', image.split(',')[1] || image);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();
    if (result.success) {
      res.json({ url: result.data.url });
    } else {
      res.status(500).json({ error: result.error?.message || "ImgBB upload failed" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shopify Storefront Proxy
router.post("/shopify/storefront", async (req, res) => {
  const storefrontToken = SHOPIFY_STOREFRONT_TOKEN || req.body.token;
  if (!SHOPIFY_DOMAIN || !storefrontToken) {
    return res.status(500).json({ error: "Shopify Storefront not configured." });
  }

  try {
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontToken,
      },
      body: JSON.stringify(req.body.payload || req.body),
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shopify Dynamic Checkout
router.post("/shopify/create-custom-checkout", async (req, res) => {
  const adminToken = SHOPIFY_ADMIN_TOKEN || req.body.adminToken;
  if (!SHOPIFY_DOMAIN || !adminToken) {
    return res.status(500).json({ error: "Shopify Admin API not configured." });
  }

  const { title, price, imageUrl, attributes, type } = req.body;

  let descriptionHtml = `<strong>Type: ${type === 'credits' ? 'Credit Top-up' : (type === 'sample' ? 'Sample' : 'Deposit')}</strong>`;
  descriptionHtml += `<br/><br/><ul>${attributes.map((a: any) => `<li><strong>${a.key}:</strong> ${a.value}</li>`).join('')}</ul>`;

  const productPayload = {
    product: {
      title: title || "Custom Rug Design",
      status: "active",
      body_html: descriptionHtml,
      images: imageUrl ? [{ src: imageUrl }] : [],
      variants: [
        {
          price: price.toString(),
          inventory_policy: "continue",
          requires_shipping: type !== 'credits',
          taxable: true
        }
      ]
    }
  };

  try {
    const shopifyUrl = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json`;
    const productResponse = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify(productPayload),
    });

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      let customMessage = `Shopify API error (${productResponse.status}).`;
      if (productResponse.status === 401) {
        customMessage = "Invalid Shopify Admin Token. Please ensure you are using the 'Admin API Access Token' (starts with 'shpat_').";
      }
      return res.status(productResponse.status).json({ error: customMessage, details: errorText });
    }

    const productResult = await productResponse.json();
    const variantId = `gid://shopify/ProductVariant/${productResult.product.variants[0].id}`;
    res.json({ variantId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Shopify Plan Upgrade
router.post("/shopify/create-plan-checkout", async (req, res) => {
  const adminToken = SHOPIFY_ADMIN_TOKEN || req.body.adminToken;
  if (!SHOPIFY_DOMAIN || !adminToken) {
    return res.status(500).json({ error: "Shopify Admin API not configured." });
  }

  const { email, userId } = req.body;

  const draftOrderPayload = {
    draft_order: {
      line_items: [
        {
          title: "Opul Pro Plan Upgrade",
          price: "20.00",
          quantity: 1,
          requires_shipping: false,
          taxable: false
        }
      ],
      customer: { email },
      use_customer_default_address: false,
      note: `User Upgrade: ${userId}`,
      tags: ["PlanUpgrade", userId]
    }
  };

  try {
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/draft_orders.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify(draftOrderPayload),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.errors ? JSON.stringify(result.errors) : "Failed to create draft order");

    res.json({ 
      invoiceUrl: result.draft_order.invoice_url,
      draftOrderId: result.draft_order.id 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Upgrade
router.get("/shopify/verify-upgrade/:id", async (req, res) => {
  const adminToken = SHOPIFY_ADMIN_TOKEN || (req.query.token as string);
  if (!SHOPIFY_DOMAIN || !adminToken) {
    return res.status(500).json({ error: "Shopify Admin API not configured." });
  }

  const { id } = req.params;

  try {
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/draft_orders/${id}.json`, {
      headers: {
        'X-Shopify-Access-Token': adminToken,
      }
    });

    const result = await response.json();
    if (!response.ok) throw new Error("Failed to fetch draft order");

    const isPaid = result.draft_order.status === 'completed' || result.draft_order.order_id !== null;
    res.json({ isPaid });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

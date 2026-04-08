
const rawDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '';
// Clean domain: remove https://, trailing slashes, and ensure .myshopify.com is present if it's just the store name
const SHOPIFY_DOMAIN = rawDomain
  ? (rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').includes('.') 
      ? rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '') 
      : `${rawDomain}.myshopify.com`)
  : '';

interface ShopifyCheckoutInput {
  variantId: string;
  quantity: number;
  customAttributes: { key: string; value: string }[];
}

export const shopifyService = {
  isConfigured: !!rawDomain,

  async createCheckout(input: ShopifyCheckoutInput) {
    if (!SHOPIFY_DOMAIN) {
      console.error('Shopify Configuration Missing:', { domain: !!SHOPIFY_DOMAIN });
      throw new Error('Shopify Configuration Missing. Please check your Settings for VITE_SHOPIFY_STORE_DOMAIN.');
    }

    const storefrontToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    console.log(`Creating Shopify checkout for domain: ${SHOPIFY_DOMAIN}`);

    const query = `
      mutation cartCreate($input: CartInput) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        lines: [
          {
            merchandiseId: input.variantId.includes('gid://shopify/') 
              ? input.variantId 
              : `gid://shopify/ProductVariant/${input.variantId}`,
            quantity: input.quantity,
            attributes: input.customAttributes,
          },
        ],
      },
    };

    try {
      let result;
      
      if (storefrontToken) {
        // Direct call if token is in frontend
        const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': storefrontToken,
          },
          body: JSON.stringify({ query, variables }),
        });
        result = await response.json();
      } else {
        // Fallback to server proxy
        const response = await fetch('/api/shopify/storefront', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        });
        result = await response.json();
      }

      if (result.errors) {
        console.error('Shopify GraphQL Errors:', result.errors);
        throw new Error(result.errors[0].message || 'Shopify API Error');
      }

      if (result.data?.cartCreate?.userErrors?.length > 0) {
        console.error('Shopify Cart Errors:', result.data.cartCreate.userErrors);
        const firstError = result.data.cartCreate.userErrors[0];
        throw new Error(`${firstError.message} (${firstError.field})`);
      }

      const checkoutUrl = result.data?.cartCreate?.cart?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Shopify did not return a checkout URL. Please check your product availability.');
      }

      return checkoutUrl;
    } catch (error: any) {
      console.error('Failed to create Shopify checkout:', error);
      throw error;
    }
  },

  // Helper to format rug config for Shopify attributes
  formatRugAttributes(config: any, imageUrl: string) {
    const attributes = [
      { key: '_image', value: imageUrl }, // Hidden attribute often used by Shopify themes/checkout
      { key: 'Design URL', value: imageUrl },
      { key: 'Prompt', value: config.prompt || 'Custom Design' },
      { key: 'Construction', value: config.construction || 'Hand-knotted' },
      { key: 'Material', value: config.materialTypes?.join(', ') || 'Wool' },
      { key: 'Size', value: `${config.width}x${config.length} ${config.shape}` },
      { key: 'Pile', value: `${config.pileType} (${config.pileHeight})` },
    ];
    return attributes;
  },

  async createDynamicCheckout(input: { title: string, price: number, imageUrl: string, attributes: any[], email?: string, type: 'deposit' | 'sample' | 'credits' }) {
    try {
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      let variantId;

      if (adminToken) {
        // Direct call if admin token is in frontend
        const descriptionHtml = `<strong>Type: ${input.type === 'credits' ? 'Credit Top-up' : (input.type === 'sample' ? 'Sample' : 'Deposit')}</strong><br/><br/><ul>${input.attributes.map((a: any) => `<li><strong>${a.key}:</strong> ${a.value}</li>`).join('')}</ul>`;
        
        const productPayload = {
          product: {
            title: input.title || "Custom Rug Design",
            status: "active",
            body_html: descriptionHtml,
            images: input.imageUrl ? [{ src: input.imageUrl }] : [],
            variants: [
              {
                price: input.price.toString(),
                inventory_policy: "continue",
                requires_shipping: input.type !== 'credits',
                taxable: true
              }
            ]
          }
        };

        const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': adminToken,
          },
          body: JSON.stringify(productPayload),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.errors ? JSON.stringify(result.errors) : 'Shopify Admin API Error');
        variantId = `gid://shopify/ProductVariant/${result.product.variants[0].id}`;
      } else {
        // Fallback to server proxy
        const response = await fetch('/api/shopify/create-custom-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create custom product');
        }
        variantId = result.variantId;
      }

      // 2. Create a checkout using the new variant (Storefront API)
      const checkoutUrl = await this.createCheckout({
        variantId,
        quantity: 1,
        customAttributes: input.attributes,
      });

      return checkoutUrl;
    } catch (error: any) {
      console.error('Dynamic Checkout Error:', error);
      throw error;
    }
  },

  async createPlanUpgradeCheckout(email: string, userId: string) {
    try {
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
      
      if (adminToken) {
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

        return { 
          invoiceUrl: result.draft_order.invoice_url,
          draftOrderId: result.draft_order.id 
        };
      }

      const response = await fetch('/api/shopify/create-plan-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create upgrade checkout');
      return result; // { invoiceUrl, draftOrderId }
    } catch (error) {
      console.error('Plan Upgrade Error:', error);
      throw error;
    }
  },

  async verifyUpgrade(draftOrderId: string) {
    try {
      const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

      if (adminToken) {
        const response = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/draft_orders/${draftOrderId}.json`, {
          headers: {
            'X-Shopify-Access-Token': adminToken,
          }
        });

        const result = await response.json();
        if (!response.ok) throw new Error("Failed to fetch draft order");

        const isPaid = result.draft_order.status === 'completed' || result.draft_order.order_id !== null;
        return isPaid;
      }

      const response = await fetch(`/api/shopify/verify-upgrade/${draftOrderId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to verify upgrade');
      return result.isPaid;
    } catch (error) {
      console.error('Verify Upgrade Error:', error);
      throw error;
    }
  }
};

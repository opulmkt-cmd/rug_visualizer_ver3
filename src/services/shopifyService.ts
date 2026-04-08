const rawDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN || '';

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

  // ✅ CREATE CHECKOUT (FIXED)
  async createCheckout(input: ShopifyCheckoutInput) {
    if (!SHOPIFY_DOMAIN) {
      throw new Error('Shopify domain missing');
    }

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
      const response = await fetch('/api/shopify/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }), // ✅ FIXED (no token)
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Shopify HTML error:", text);
        throw new Error("Shopify API failed");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Shopify request failed");
      }

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      if (result.data?.cartCreate?.userErrors?.length > 0) {
        const err = result.data.cartCreate.userErrors[0];
        throw new Error(`${err.message} (${err.field})`);
      }

      const checkoutUrl = result.data?.cartCreate?.cart?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error("Checkout URL not returned");
      }

      return checkoutUrl;

    } catch (error) {
      console.error("Checkout Error:", error);
      throw error;
    }
  },

  // ✅ FORMAT ATTRIBUTES
  formatRugAttributes(config: any, imageUrl: string) {
    return [
      { key: '_image', value: imageUrl },
      { key: 'Design URL', value: imageUrl },
      { key: 'Prompt', value: config.prompt || 'Custom Design' },
      { key: 'Construction', value: config.construction || 'Hand-knotted' },
      { key: 'Material', value: config.materialTypes?.join(', ') || 'Wool' },
      { key: 'Size', value: `${config.width}x${config.length} ${config.shape || ''}` },
      { key: 'Pile', value: `${config.pileType} (${config.pileHeight})` },
    ];
  },

  // ✅ DYNAMIC CHECKOUT (FIXED)
  async createDynamicCheckout(input: {
    title: string;
    price: number;
    imageUrl: string;
    attributes: any[];
    email?: string;
    type: 'deposit' | 'sample' | 'credits';
  }) {
    try {
      const response = await fetch('/api/shopify/create-custom-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input), // ✅ FIXED (no adminToken)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create product");
      }

      const variantId = result.variantId;

      const checkoutUrl = await this.createCheckout({
        variantId,
        quantity: 1,
        customAttributes: input.attributes,
      });

      return checkoutUrl;

    } catch (error) {
      console.error("Dynamic Checkout Error:", error);
      throw error;
    }
  },

  // ✅ PLAN UPGRADE (FIXED)
  async createPlanUpgradeCheckout(email: string, userId: string) {
    try {
      const response = await fetch('/api/shopify/create-plan-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId }), // ✅ FIXED
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upgrade failed");
      }

      return result;

    } catch (error) {
      console.error("Plan Upgrade Error:", error);
      throw error;
    }
  },

  // ✅ VERIFY UPGRADE (FIXED)
  async verifyUpgrade(draftOrderId: string) {
    try {
      const response = await fetch(`/api/shopify/verify-upgrade/${draftOrderId}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Verification failed");
      }

      return result.isPaid;

    } catch (error) {
      console.error("Verify Upgrade Error:", error);
      throw error;
    }
  }
};

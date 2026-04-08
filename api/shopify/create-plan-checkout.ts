export default async function handler(req, res) {
  try {
    const { email, userId } = req.body;

    const domain = process.env.SHOPIFY_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!domain || !adminToken) {
      return res.status(500).json({ error: "Shopify config missing" });
    }

    const payload = {
      draft_order: {
        line_items: [
          {
            title: "Pro Plan Upgrade",
            price: "20.00",
            quantity: 1,
            requires_shipping: false,
            taxable: false,
          },
        ],
        customer: { email },
        note: `User Upgrade: ${userId}`,
        tags: ["PlanUpgrade", userId],
      },
    };

    const response = await fetch(
      `https://${domain}/admin/api/2024-01/draft_orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminToken,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to create draft order",
        details: data,
      });
    }

    return res.status(200).json({
      invoiceUrl: data.draft_order.invoice_url,
      draftOrderId: data.draft_order.id,
    });

  } catch (error) {
    console.error("Plan Checkout Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

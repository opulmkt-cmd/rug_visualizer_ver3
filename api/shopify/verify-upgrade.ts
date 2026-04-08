export default async function handler(req, res) {
  try {
    const { id } = req.query;

    const domain = process.env.SHOPIFY_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!domain || !adminToken) {
      return res.status(500).json({ error: "Shopify config missing" });
    }

    const response = await fetch(
      `https://${domain}/admin/api/2024-01/draft_orders/${id}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": adminToken,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch order" });
    }

    const isPaid =
      data.draft_order.status === "completed" ||
      data.draft_order.order_id !== null;

    return res.status(200).json({ isPaid });

  } catch (error) {
    console.error("Verify Upgrade Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

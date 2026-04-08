export default async function handler(req, res) {
  try {
    const { query, variables } = req.body;

    const domain = process.env.SHOPIFY_DOMAIN;
    const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (!domain || !token) {
      return res.status(500).json({ error: "Shopify config missing" });
    }

    const response = await fetch(
      `https://${domain}/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Shopify Storefront Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

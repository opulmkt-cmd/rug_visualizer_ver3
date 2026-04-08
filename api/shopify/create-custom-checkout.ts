export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { title, price, imageUrl, attributes, type } = req.body;

    const domain = process.env.SHOPIFY_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

    if (!domain || !adminToken) {
      return res.status(500).json({ error: "Shopify config missing" });
    }

    let descriptionHtml = `<strong>Type: ${
      type === "credits" ? "Credit Top-up" : type === "sample" ? "Sample" : "Deposit"
    }</strong>`;

    descriptionHtml += `<br/><br/><ul>${
      attributes?.map((a: any) => `<li><strong>${a.key}:</strong> ${a.value}</li>`).join("") || ""
    }</ul>`;

    const payload = {
      product: {
        title: title || "Custom Product",
        status: "active",
        body_html: descriptionHtml,
        images: imageUrl ? [{ src: imageUrl }] : [],
        variants: [
          {
            price: price.toString(),
            inventory_policy: "continue",
            requires_shipping: type !== "credits",
            taxable: true,
          },
        ],
      },
    };

    const response = await fetch(
      `https://${domain}/admin/api/2024-01/products.json`,
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
        error: "Shopify product creation failed",
        details: data,
      });
    }

    const variantId = `gid://shopify/ProductVariant/${data.product.variants[0].id}`;

    return res.status(200).json({ variantId });

  } catch (error) {
    console.error("Create Custom Checkout Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

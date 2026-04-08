export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ImgBB API key missing" });
    }

    const base64 = image.split(',')[1] || image;

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `image=${encodeURIComponent(base64)}`,
      }
    );

    const data = await response.json();

    if (!data.success) {
      return res.status(500).json({ error: "ImgBB upload failed" });
    }

    return res.status(200).json({ url: data.data.url });

  } catch (error) {
    console.error("ImgBB API Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

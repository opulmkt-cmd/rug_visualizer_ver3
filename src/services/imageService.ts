export const imageService = {
  /**
   * Uploads a base64 image to ImgBB (Free image hosting)
   */
  async uploadToImgBB(base64Data: string): Promise<string> {
    try {
      // 🔐 Get API key from env
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

      if (!apiKey) {
        throw new Error("ImgBB API key missing. Add VITE_IMGBB_API_KEY in Vercel.");
      }

      if (!base64Data) {
        throw new Error("No image data provided");
      }

      // 📦 Prepare form data
      const formData = new FormData();
      formData.append("image", base64Data);

      // 🚀 Call ImgBB API directly
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
          method: "POST",
          body: formData,
        }
      );

      // ❌ Handle HTTP errors
      if (!res.ok) {
        const text = await res.text();
        console.error("ImgBB raw error:", text);
        throw new Error("ImgBB request failed");
      }

      // ✅ Parse response
      const data = await res.json();

      // ❌ Handle API-level failure
      if (!data?.success) {
        console.error("ImgBB response:", data);
        throw new Error(data?.error?.message || "ImgBB upload failed");
      }

      // ✅ Return image URL
      return data.data.url;

    } catch (error) {
      console.error("ImgBB Upload Error:", error);
      throw error;
    }
  }
};

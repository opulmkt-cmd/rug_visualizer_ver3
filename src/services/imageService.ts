export const imageService = {
  /**
   * Uploads a base64 image to ImgBB
   */
  async uploadToImgBB(base64Data: string): Promise<string> {
    try {
      // ✅ Correct env usage
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY;

      if (!apiKey) {
        throw new Error("ImgBB API key missing. Add VITE_IMGBB_API_KEY in Vercel.");
      }

      // ✅ Clean base64 (important)
      const cleanBase64 = base64Data.split(',')[1] || base64Data;

      const formData = new FormData();
      formData.append('image', cleanBase64);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error("ImgBB raw error:", text);
        throw new Error("ImgBB request failed");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || "ImgBB upload failed");
      }

      return result.data.url;

    } catch (error) {
      console.error("ImgBB Upload Error:", error);
      throw error;
    }
  }
};

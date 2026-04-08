
export const imageService = {
  /**
   * Uploads a base64 image to ImgBB (Free image hosting)
   * This is an alternative to Firebase Storage if it's not enabled.
   */
  async uploadToImgBB(base64Data: string): Promise<string> {
    try {
      const apiKey = process.env.IMGBB_API_KEY;
      
      // Try direct call first if we have the key
      if (apiKey) {
        try {
          const formData = new FormData();
          formData.append('image', base64Data.split(',')[1] || base64Data);
          
          const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) return result.data.url;
          }
        } catch (e) {
          console.warn("Direct ImgBB upload failed, trying proxy...", e);
        }
      }

      // Fallback to server proxy
      const response = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, apiKey }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from server:', text);
        throw new Error(`Server Error: Received HTML instead of JSON. The backend route might be missing or the server might be restarting.`);
      }

      const result = await response.json();
      if (response.ok && result.url) return result.url;
      throw new Error(result.error || 'Failed to upload to ImgBB');
    } catch (error: any) {
      console.error('ImgBB Upload Error:', error);
      throw error;
    }
  }
};

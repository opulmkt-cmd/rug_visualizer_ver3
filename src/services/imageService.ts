export const imageService = {
  async uploadToImgBB(base64Data: string): Promise<string> {
    try {
      const response = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data }),
      });

      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Backend route missing or failed');
      }

      const result = await response.json();

      if (response.ok && result.url) {
        return result.url;
      }

      throw new Error(result.error || 'Upload failed');

    } catch (error) {
      console.error('ImgBB Upload Error:', error);
      throw error;
    }
  }
};

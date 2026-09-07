export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageValidationError';
  }
}

export interface ValidatedImage {
  bytes: ArrayBuffer;
  contentType: string;
  size: number;
}

export class ImageProcessor {
  private static MAX_SIZE_BYTES = 20 * 1024 * 1024; // Pinterest limit 20MB (often 10MB practically)

  /**
   * Fetches an image, checks content length, and reads magic bytes.
   */
  static async fetchAndValidate(url: string): Promise<ValidatedImage> {
    const res = await fetch(url, { headers: { 'User-Agent': 'Pinterest-Automation-Bot' } });
    if (!res.ok) {
      throw new ImageValidationError(`Failed to fetch image: HTTP ${res.status}`);
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > this.MAX_SIZE_BYTES) {
      throw new ImageValidationError(`Image exceeds maximum size of 20MB`);
    }

    const buffer = await res.arrayBuffer();

    if (buffer.byteLength > this.MAX_SIZE_BYTES) {
      throw new ImageValidationError(`Image bytes exceed maximum size of 20MB`);
    }

    const contentType = this.detectMimeType(buffer);
    if (!contentType) {
      throw new ImageValidationError('Unsupported image format or invalid magic bytes. Only JPEG/PNG/WebP are allowed.');
    }

    return {
      bytes: buffer,
      contentType,
      size: buffer.byteLength,
    };
  }

  /**
   * Sniffs magic bytes to prevent spoofing
   */
  private static detectMimeType(buffer: ArrayBuffer): string | null {
    const view = new Uint8Array(buffer.slice(0, 12));

    // JPEG (FF D8 FF)
    if (view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG (89 50 4E 47)
    if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) {
      return 'image/png';
    }

    // WebP (RIFF ... WEBP)
    if (
      view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
      view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  }

  static toBase64(buffer: ArrayBuffer): string {
    // btoa expects binary string
    let binary = '';
    const bytes = new Uint8Array(buffer);
    // process in chunks to avoid JS stack overflow on large images
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

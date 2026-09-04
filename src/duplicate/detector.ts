export class DuplicateDetector {
  /**
   * Generates a stable and simple hash for duplicate checking.
   * Subtle crypto is natively supported in Cloudflare Workers.
   */
  static async generateContentHash(title: string, description: string, destinationUrl?: string | null): Promise<string> {
    const raw = `${title.trim().toLowerCase()}|${description.trim().toLowerCase()}|${destinationUrl?.trim().toLowerCase() || ''}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static async generateImageHash(imageBytes: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', imageBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export interface GeneratedPinContent {
  title: string;
  description: string;
  keywords: string[];
  alt_text?: string;
}

export interface AIProvider {
  generatePinContent(topic: string, brandName?: string, niche?: string): Promise<GeneratedPinContent>;
  generatePinVariant(productTitle: string, description: string, brandName?: string, niche?: string): Promise<GeneratedPinContent>;
}

export class HeuristicAIProvider implements AIProvider {
  async generatePinContent(topic: string, brandName?: string, niche?: string): Promise<GeneratedPinContent> {
    const brand = brandName ? ` | ${brandName}` : '';
    const nicheSuffix = niche ? ` for ${niche}` : '';

    const title = `Top Ideas & Inspiration: ${topic}${brand}`.substring(0, 100);
    const description = (
      `Looking for the best tips and guide on ${topic}${nicheSuffix}? ` +
      `Check out this curated idea! Save this Pin to your board for later and follow for more daily inspiration.`
    ).substring(0, 500);

    return {
      title,
      description,
      keywords: [topic, niche || 'lifestyle', 'ideas', 'inspiration', 'tips'].filter(Boolean),
      alt_text: `Visual guide and inspiration for ${topic}`,
    };
  }

  async generatePinVariant(productTitle: string, description: string, brandName?: string, niche?: string): Promise<GeneratedPinContent> {
    const title = `Check out this ${productTitle}${brandName ? ` | ${brandName}` : ''}`.substring(0, 100);
    const desc = `${description.substring(0, 450)} Check out the details here!`.substring(0, 500);

    return {
      title,
      description: desc,
      keywords: [productTitle.split(' ')[0], niche || 'shopping', 'amazon', 'finds'].filter(Boolean),
      alt_text: `Image of ${productTitle}`,
    };
  }
}

export class AnthropicAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private fallback: HeuristicAIProvider;

  constructor(apiKey: string, model = 'claude-3-haiku-20240307') {
    this.apiKey = apiKey;
    this.model = model;
    this.fallback = new HeuristicAIProvider();
  }

  async generatePinContent(topic: string, brandName?: string, niche?: string): Promise<GeneratedPinContent> {
    try {
      const prompt = `You are an expert Pinterest SEO creator. Create a high-ranking, engaging Pin for:
Topic: "${topic}"
Brand: "${brandName || 'General'}"
Niche: "${niche || 'General'}"

Return ONLY a valid JSON object without markdown fences, with these exact keys:
- "title": string (engaging, catchy, max 95 characters)
- "description": string (natural, keyword-rich, call to action, max 480 characters)
- "keywords": array of 5 relevant keyword tags
- "alt_text": string (descriptive alt text for accessibility, max 100 characters)`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`Anthropic API returned ${res.status}`);
      }

      const data: any = await res.json();
      const contentText = data.content?.[0]?.text?.trim();
      const parsed = JSON.parse(contentText);

      return {
        title: String(parsed.title || topic).substring(0, 100),
        description: String(parsed.description || topic).substring(0, 500),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [topic],
        alt_text: parsed.alt_text ? String(parsed.alt_text).substring(0, 500) : undefined,
      };
    } catch (err) {
      console.warn('Anthropic generation failed, using heuristic fallback:', err);
      return this.fallback.generatePinContent(topic, brandName, niche);
    }
  }
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private fallback: HeuristicAIProvider;

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
    this.fallback = new HeuristicAIProvider();
  }

  async generatePinContent(topic: string, brandName?: string, niche?: string): Promise<GeneratedPinContent> {
    try {
      const prompt = `You are an expert Pinterest SEO creator. Create a high-ranking, engaging Pin for:
Topic: "${topic}"
Brand: "${brandName || 'General'}"
Niche: "${niche || 'General'}"

Respond in JSON format with: title (max 95 chars), description (max 480 chars), keywords (array of strings), alt_text.`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI API returned ${res.status}`);
      }

      const data: any = await res.json();
      const contentText = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(contentText);

      return {
        title: String(parsed.title || topic).substring(0, 100),
        description: String(parsed.description || topic).substring(0, 500),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [topic],
        alt_text: parsed.alt_text ? String(parsed.alt_text).substring(0, 500) : undefined,
      };
    } catch (err) {
      console.warn('OpenAI generation failed, using heuristic fallback:', err);
      return this.fallback.generatePinContent(topic, brandName, niche);
    }
  }
}

export function createAIProvider(provider?: string, apiKey?: string, model?: string): AIProvider {
  const p = (provider || 'heuristic').toLowerCase();
  if (p === 'anthropic' && apiKey) {
    return new AnthropicAIProvider(apiKey, model);
  }
  if (p === 'openai' && apiKey) {
    return new OpenAIProvider(apiKey, model);
  }
  return new HeuristicAIProvider();
}

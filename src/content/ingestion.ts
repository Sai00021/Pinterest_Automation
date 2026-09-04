import { ContentItem } from "../types";

export interface ContentSource {
  fetchContent(env: Env): Promise<ContentItem[]>;
}

export class ManualContentSource implements ContentSource {
  private items: ContentItem[];

  constructor(items: ContentItem[]) {
    this.items = items;
  }

  async fetchContent(_env: Env): Promise<ContentItem[]> {
    return this.items;
  }
}

// TODO: Implement CSV, JSON, RSS, etc. sources if needed for specific use cases.
// For now, a manual source or a simplified direct AI generation is assumed.

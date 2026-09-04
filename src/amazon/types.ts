export interface AmazonSearchItem {
  ASIN: string;
  DetailPageURL: string;
  Offers?: { Listings: [{ Price: { Amount: number; Currency: string; } }] };
  ItemInfo: {
    Title: { DisplayValue: string; };
    Features?: { DisplayValues: string[]; };
    ProductInfo?: { Color?: { DisplayValue: string; }; Size?: { DisplayValue: string; }; };
    ContentInfo?: { Audience?: { DisplayValues: string[]; }; };
    ExternalIds?: { EANs?: { DisplayValues: string[]; }; UPCs?: { DisplayValues: string[]; }; };
    ManufactureInfo?: { ItemPartNumber?: { DisplayValue: string; }; };
  };
  Images?: { Primary: { Large: { URL: string; }; }; };
  BrowseNodeInfo?: { BrowseNodes: [{ SalesRank: { Rank: number; }; DisplayName: string; };] };
}

export interface AmazonSearchResponse {
  SearchItemsResponse: {
    SearchResult: {
      TotalResultCount: number;
      Items: AmazonSearchItem[];
    };
  };
}
export const ASSET_CACHE_NAME = "flair-game-assets-v1";

export type CachedAssetMap = Record<string, string>;

export const uniqueAssetUrls = (urls: string[]) => Array.from(new Set(urls));

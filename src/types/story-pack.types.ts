/**
 * Story Pack Type Definitions
 * Maps to story.schema.json for strict validation
 */

// --- Page Types ---

export interface CoverPage {
  type: "cover";
  headline: string;
  subheadline?: string;
  image: string;
}

export interface HighlightPage {
  type: "highlight";
  minute: number; // 0-130
  headline: string;
  caption: string;
  image?: string;
  explanation?: string;
}

export interface InfoPage {
  type: "info";
  headline: string;
  body?: string;
}

// Union of all page types
export type StoryPage = CoverPage | HighlightPage | InfoPage;

// --- Metrics ---

export interface StoryMetrics {
  goals?: number;
  highlights?: number;
  [key: string]: number | undefined;
}

// --- Root Story Pack ---

export interface StoryPack {
  story_id: string;
  title: string;
  pages: StoryPage[];
  metrics?: StoryMetrics;
  source: string;
  created_at: string; // ISO 8601 datetime
}

// For internal construction, you might want a mutable version:
export interface MutableStoryPack {
  story_id: string;
  title: string;
  pages: StoryPage[];
  metrics?: StoryMetrics;
  source: string;
  created_at: string;
}

// Deep readonly version for strict immutability (optional, but consistent with your approach)
export type DeepReadonlyStoryPack = DeepReadonly<StoryPack>;

type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
  ? T
  : T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

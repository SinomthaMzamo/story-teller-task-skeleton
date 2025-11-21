import { FileService } from "./services/fileService.js";
import { StoryPackService } from "./services/service.js";
import type {
  DeepReadonly,
  MatchEvent,
  MatchFeed,
} from "./types/match-feed.types.js";
import type { ScoredEvent } from "./types/scoring.types.js";
import type { SquadFeed } from "./types/squad.types.js";

const logPretty = (data: unknown) =>
  console.log(JSON.stringify(data, null, 2), "extracted data");

// 1. Load the Match Data
console.log("Loading match data...");
const matchFeed: MatchFeed = await FileService.load<MatchFeed>(
  "./data/match_events.json"
);

// 2. Load the two separate Team Squad files
const teamOneFeed = await FileService.load<SquadFeed>(
  "./data/kilmarnock-squad.json"
);
const teamTwoFeed = await FileService.load<SquadFeed>(
  "./data/celtic-squad.json"
);

// 3. BUILD THE MASTER SQUAD DATA
// We create a new object that combines the 'squad' arrays from both files.
const combinedSquadFeed: SquadFeed = {
  lastUpdated: new Date().toISOString(),
  squad: [...teamOneFeed.squad, ...teamTwoFeed.squad],
};

// 4. Initialize Service
const service = new StoryPackService(matchFeed, combinedSquadFeed);

// 5. Load Heuristics Configuration (CRITICAL NEW STEP)
// This loads weights.json so the ScoringEngine knows how to score
await service.loadConfiguration("./src/configuration/weights.json");

// 6. Extract Events
const matchEvents: DeepReadonly<MatchEvent[]> = service.extractMatchEventData();
// logPretty(matchEvents);

// 7. Run the Scoring Engine
// We capture the result here because we need to pass it to the story creator
const rankedEvents: ScoredEvent[] = service.rankMatchEventData(matchEvents);

// 8. Create the Story Pack
// We pass the ranked events and ask for the top N highlights
const storySlides = service.createStoryPack(rankedEvents, 5);
logPretty(storySlides);
console.log("HERE ARE UR STORIES");

// 9. Write to Disk
service.outputStoryPack(storySlides);


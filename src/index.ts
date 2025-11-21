import { FileService } from "./fileService.js";
import { StoryPackService } from "./service.js";
import type { DeepReadonly, MatchEvent, MatchFeed } from "./types/match-feed.types.js";
import type { SquadFeed } from "./types/squad.types.js";





const matchFeed:MatchFeed = await FileService.load<MatchFeed>("./data/match_events.json");
// 2. Load the two separate Team Squad files
// Make sure to include the .json extension if your file system requires it
const teamOneFeed = await FileService.load<SquadFeed>(
  "./data/kilmarnock-squad.json"
);
const teamTwoFeed = await FileService.load<SquadFeed>("./data/celtic-squad.json");

// 3. BUILD THE MASTER SQUAD DATA
// We create a new object that combines the 'squad' arrays from both files.
const combinedSquadFeed: SquadFeed = {
  // Use the latest timestamp, or just the current date
  lastUpdated: new Date().toISOString(), 
  
  // Spread both arrays into one list. 
  // Now this array contains both Kilmarnock AND Celtic.
  squad: [
    ...teamOneFeed.squad,
    ...teamTwoFeed.squad
  ]
};
const service = new StoryPackService(matchFeed, combinedSquadFeed);

const logPretty = (data: unknown) => console.log(JSON.stringify(data, null, 2), "extracted data");

const matchEvents: DeepReadonly<MatchEvent[]> = service.extractMatchEventData();
logPretty(matchEvents);
service.rankMatchEventData(matchEvents);
service.createStoryPack(10);
service.outputStoryPack();
// This tells Node: "Show me everything, no matter how deep."
// console.dir(feed, { depth: null, colors: true });
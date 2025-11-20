import { FileService } from "./fileService.js";
import { StoryPackService } from "./service.js";
import type { DeepReadonly, MatchEvent, MatchFeed } from "./types/match-feed.types.js";





const feed:MatchFeed = await FileService.load<MatchFeed>("./data/match_events.json");
const service = new StoryPackService(feed);

const logPretty = (data: unknown) => console.log(JSON.stringify(data, null, 2), "extracted data");

const matchEvents: DeepReadonly<MatchEvent[]> = service.extractMatchEventData();
logPretty(matchEvents);
service.rankMatchEventData(matchEvents);
service.createStoryPack(10);
service.outputStoryPack();
// This tells Node: "Show me everything, no matter how deep."
// console.dir(feed, { depth: null, colors: true });
// this is where we set up our express server which:
// • Reads all the match events
// • Ranks them by importance (your heuristic)
// • Selects the top N highlights
// • Packages them as slides in a Story Pack

import type { DeepReadonly, MatchEvent, MatchFeed, MessageBlock } from "./types/match-feed.types.js";

export class StoryPackService {
  matchData:MatchFeed;

  constructor(matchData: any){
    this.matchData = matchData;
  }

  extractMatchEventData(): DeepReadonly<MatchEvent[]>{
    console.log(
      "This method extract the actual events of the match and gets them ready for heuristics processing"
    );
    return this.matchData.messages.flatMap((block) => block.message);
  }

  rankMatchEventData(allMatchEvents: DeepReadonly<MatchEvent[]>): MessageBlock[] {
    console.log(
      "This method ranks the match events according to a heuristic algorithm"
    );
    return [];
  }

  createStoryPack(numberOfHighlights: number): MessageBlock[] {
    console.log(
      `This method extracts the top N highlights according to the number of highlights passed into it and packages them as slides, showing ${numberOfHighlights} highlights.`
    );
    return [];
  }

  outputStoryPack() {
    console.log("This method writes the slides information to out/story.json");
  }
}
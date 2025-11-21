// this is where we set up our express server which:
// • Reads all the match events
// • Ranks them by importance (your heuristic)
// • Selects the top N highlights
// • Packages them as slides in a Story Pack

import type { DeepReadonly, MatchEvent, MatchFeed, MessageBlock } from "./types/match-feed.types.js";
import type { SquadFeed, SquadPerson } from "./types/squad.types.js"; 

export class StoryPackService {
  private matchData: MatchFeed;
  private squadData: SquadFeed;

  private playerLookup = new Map<string, DeepReadonly<SquadPerson>>();

  constructor(matchData: MatchFeed, squadData: SquadFeed) {
    this.matchData = matchData;
    this.squadData = squadData;

    // Build the fast lookup map immediately on startup
    this.indexPlayers();
  }

  /**
   * Flattens the nested Squad data into a quick lookup map.
   * This makes your Heuristic Algorithm much faster and cleaner.
   */
  private indexPlayers() {
    // The squad feed contains an array of squads (Home/Away)
    for (const team of this.squadData.squad) {
      for (const person of team.person) {
        // We only care about people with IDs
        if (person.id) {
          this.playerLookup.set(person.id, person);
        }
      }
    }
    console.log(`Indexed ${this.playerLookup.size} players and coaches.`);
  }

  extractMatchEventData(): DeepReadonly<MatchEvent[]> {
    console.log(
      "This method extract the actual events of the match and gets them ready for heuristics processing"
    );
    const flatEvents = this.matchData.messages.flatMap(
      (block) => block.message
    );
    // Sort chronologically (Crucial for the "Sequence" heuristics later)
    return [...flatEvents].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  rankMatchEventData(
    allMatchEvents: DeepReadonly<MatchEvent[]>
  ): MessageBlock[] {
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
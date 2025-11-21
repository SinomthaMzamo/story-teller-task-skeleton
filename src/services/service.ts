// this is where we set up our express server which:
// • Reads all the match events
// • Ranks them by importance (your heuristic)
// • Selects the top N highlights
// • Packages them as slides in a Story Pack

import type {
  DeepReadonly,
  MatchEvent,
  MatchFeed,
  MessageBlock,
} from "../types/match-feed.types.js";
import type { ScoredEvent, ScoringConfig } from "../types/scoring.types.js";
import type { SquadFeed, SquadPerson } from "../types/squad.types.js";
import { FileService } from "./fileService.js";
import { ScoringEngine } from "./scoring/engine.js";

export class StoryPackService {
  private matchData: MatchFeed;
  private squadData: SquadFeed;

  private playerLookup = new Map<string, DeepReadonly<SquadPerson>>();
  // Configuration loaded from external JSON
  private scoringConfig: ScoringConfig | null = null;

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

  /**
   * Loads the heuristics weights from disk.
   */
  async loadConfiguration(path: string = "./data/weights.json") {
    this.scoringConfig = await FileService.load<ScoringConfig>(path);
    console.log("Scoring configuration loaded.");
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
  ): ScoredEvent[] {
    console.log(
      "This method ranks the match events according to a heuristic algorithm"
    );

    if (!this.scoringConfig) {
      throw new Error(
        "Scoring configuration not loaded. Please call loadConfiguration() first."
      );
    }

    console.log("Running Heuristic Scoring Engine...");

    // 1. Identify Home and Away Team IDs for the State Machine
    const homeTeam = this.matchData.matchInfo.contestant.find(
      (c) => c.position === "home"
    );
    const awayTeam = this.matchData.matchInfo.contestant.find(
      (c) => c.position === "away"
    );

    // Fallback to generic strings if IDs are missing (Strict Mode safety)
    const homeId = homeTeam?.id ?? "home";
    const awayId = awayTeam?.id ?? "away";

    // 2. Instantiate the Engine
    const engine = new ScoringEngine(this.scoringConfig, this.playerLookup);

    // 3. Run the Scoring (O(N) pass)
    const scoredEvents = engine.scoreEvents(allMatchEvents, homeId, awayId);

    // 4. Sort by Final Score (Descending)
    // If scores are tied, you might want a secondary sort by timestamp (optional)
    const sortedEvents = scoredEvents.sort(
      (a, b) => b.breakdown.finalScore - a.breakdown.finalScore
    );

    // 5. Debug Output
    // this.logTopPicks(sortedEvents);

    return sortedEvents;
  }

  createStoryPack(rankedEvents: ScoredEvent[], numberOfHighlights: number): MessageBlock[] {
    console.log(
      `This method extracts the top N highlights according to the number of highlights passed into it and packages them as slides, showing ${numberOfHighlights} highlights.`
    );
    this.logTopPicks(rankedEvents, 10)
    return [];
  }

  outputStoryPack() {
    console.log("This method writes the slides information to out/story.json");
  }

  // --- Helper for Debugging ---
  private logTopPicks(scored: ScoredEvent[], numberOfHighlights: number) {
    console.log(`\n--- TOP ${numberOfHighlights} CALCULATED HIGHLIGHTS ---`);

    scored.slice(0, numberOfHighlights).forEach((s, i) => {
      const { finalScore, multipliers, bonuses } = s.breakdown;

      // Format debug strings
      const multStr = multipliers
        .map((m) => `${m.name}(x${m.value})`)
        .join(", ");
      const bonusStr = bonuses.map((b) => `${b.name}(+${b.value})`).join(", ");

      // Handle potentially long comments
      const comment =
        s.event.comment.length > 50
          ? s.event.comment.substring(0, 300) + "..."
          : s.event.comment;

      console.log(`#${i + 1} [Score: ${finalScore.toFixed(0)}] ${comment}`);
      if (multStr) console.log(`    Multipliers: ${multStr}`);
      if (bonusStr) console.log(`    Bonuses:     ${bonusStr}`);
    });

    console.log("-----------------------------------\n");
  }
}

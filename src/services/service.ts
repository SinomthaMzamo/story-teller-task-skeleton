import type {
  DeepReadonly,
  MatchEvent,
  MatchFeed,
  MessageBlock,
} from "../types/match-feed.types.js";
import type { ScoreBreakdown, ScoredEvent, ScoringConfig } from "../types/scoring.types.js";
import type { SquadFeed, SquadPerson } from "../types/squad.types.js";
import type { HighlightPage, StoryMetrics, StoryPack, StoryPage } from "../types/story-pack.types.js";
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

    // 4. FILTER OUT LINEUP EVENTS
    // Lineup events are metadata, not highlights. They don't have minute/player/team refs.
    // After filtering, we can safely treat remaining events as GameEvents.
    const gameScores = scoredEvents.filter((s) => s.event.type !== "lineup");

    console.log(
      `Filtered to ${gameScores.length} game events (removed ${
        scoredEvents.length - gameScores.length
      } lineup events).`
    );

    // 5. Sort by Final Score (Descending)
    // If scores are tied, you might want a secondary sort by timestamp (optional)
    const sortedEvents = gameScores.sort(
      (a, b) => b.breakdown.finalScore - a.breakdown.finalScore
    );

    // 6. Debug Output
    // this.logTopPicks(sortedEvents);

    return sortedEvents;
  }

  createStoryPack(
    rankedEvents: ScoredEvent[],
    numberOfHighlights: number
  ): StoryPack {
    console.log(
      `This method extracts the top N highlights according to the number of highlights passed into it and packages them as slides, showing ${numberOfHighlights} highlights.`
    );
    // 1. Slice the top N events (by importance/score)
    const topPicks = rankedEvents.slice(0, numberOfHighlights);

    // 2. Re-sort them chronologically by minute for story flow
    // Now we can safely access 'minute' since LineupEvents are filtered out
    topPicks.sort((a, b) => {
      const minuteA = "minute" in a.event ? parseInt(a.event.minute, 10) : 0;
      const minuteB = "minute" in b.event ? parseInt(b.event.minute, 10) : 0;
      return minuteA - minuteB;
    });

    // 3. Get teams for metadata
    const homeTeam = this.matchData.matchInfo.contestant.find(
      (c) => c.position === "home"
    );
    const awayTeam = this.matchData.matchInfo.contestant.find(
      (c) => c.position === "away"
    );
    const homeName = homeTeam?.name ?? "Home";
    const awayName = awayTeam?.name ?? "Away";

    // 4. Build the Story Pack
    const pages: StoryPage[] = [];

    // Cover Page
    pages.push({
      type: "cover",
      headline: `${homeName} vs ${awayName}`,
      image: "../assets/placeholder.png", // TODO: Use real match image
    });

    // Highlight Pages
    const highlightPages: HighlightPage[] = topPicks.map((scored) => {
      const minute =
        "minute" in scored.event ? parseInt(scored.event.minute, 10) : 0;
      const headline = this.generateHeadline(scored.event);
      const caption = this.generateCaption(scored.event);
      const explanation = this.generateExplanation(scored.breakdown);

      return {
        type: "highlight",
        minute,
        headline,
        caption,
        image: "../assets/placeholder.png", // TODO: Extract or fetch real images
        explanation,
      };
    });
    pages.push(...highlightPages);

    // Final Score Info Page
    const finalScore = this.extractFinalScore();
    pages.push({
      type: "info",
      headline: "Full-time",
      body: finalScore,
    });

    // 5. Calculate Metrics
    const metrics: StoryMetrics = {
      goals: topPicks.filter(
        (s) => s.event.type === "goal" || s.event.type === "penalty goal"
      ).length,
      highlights: topPicks.length,
    };

    // 6. Construct Story Pack
    const storyPack: StoryPack = {
      story_id: this.generateStoryId(homeName, awayName),
      title: `Top Moments — ${homeName} vs ${awayName}`,
      pages,
      metrics,
      source: "./data/match_events.json",
      created_at: new Date().toISOString(),
    };

    return storyPack;
  }

  async outputStoryPack(storyPack: StoryPack, outputPath:string = "./out/story.json"):Promise<void> {
    console.log("This method writes the slides information to out/story.json");
    console.log("Writing Story Pack to disk...");

    try {
      // Write to disk using FileService
      await FileService.dump(outputPath, storyPack);

      console.log(`✅ Story Pack successfully written to ${outputPath}`);
      console.log(`   Story ID: ${storyPack.story_id}`);
      console.log(`   Pages: ${storyPack.pages.length}`);
      console.log(`   Highlights: ${storyPack.metrics?.highlights ?? 0}`);
    } catch (error) {
      console.error(`❌ Failed to write Story Pack to ${outputPath}:`, error);
      throw error;
    }
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

  // --- Helper Methods ---

  private generateHeadline(event: DeepReadonly<MatchEvent>): string {
    const player =
      "playerRef1" in event && event.playerRef1
        ? this.playerLookup.get(event.playerRef1)?.matchName ?? "Player"
        : "Player";

    switch (event.type) {
      case "goal":
      case "penalty goal":
        return `GOAL — ${player}`;
      case "yellow card":
        return `YELLOW CARD — ${player}`;
      case "red card":
        return `RED CARD — ${player}`;
      case "penalty won":
        return `PENALTY — ${player}`;
      case "corner":
        return "CORNER";
      case "attempt saved":
        return `GREAT SAVE — ${player}`;
      case "post":
        return `WOODWORK — ${player}`;
      default:
        return event.comment.substring(0, 50);
    }
  }

  private generateCaption(event: DeepReadonly<MatchEvent>): string {
    // TODO: Parse the event comment to extract meaningful captions
    // For now, use the comment as-is
    return event.comment.substring(0, 100);
  }

  private generateExplanation(breakdown: ScoreBreakdown): string {
    const parts: string[] = [];

    parts.push(`base=${breakdown.base}`);

    if (breakdown.multipliers.length > 0) {
      const multStr = breakdown.multipliers
        .map((m) => `${m.name}(x${m.value})`)
        .join(", ");
      parts.push(`multipliers=[${multStr}]`);
    }

    if (breakdown.bonuses.length > 0) {
      const bonusStr = breakdown.bonuses
        .map((b) => `${b.name}(+${b.value})`)
        .join(", ");
      parts.push(`bonuses=[${bonusStr}]`);
    }

    return parts.join(" | ");
  }

  private generateStoryId(homeName: string, awayName: string): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const homeSlug = homeName.toLowerCase().replace(/\s+/g, "_");
    const awaySlug = awayName.toLowerCase().replace(/\s+/g, "_");
    return `${homeSlug}_${awaySlug}_${date}`;
  }

  private extractFinalScore(): string {
    // TODO: Parse the final score from match info or last goal event
    return "Final Score TBD";
  }
}

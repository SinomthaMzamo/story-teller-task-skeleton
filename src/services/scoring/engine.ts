import {
  type DeepReadonly,
  type MatchEvent,
  MatchEventType,
} from "../../types/match-feed.types.js";
import type { SquadPerson } from "../../types/squad.types.js";
import type {
    ScoringConfig,
    ScoredEvent,
    MatchState,
    ScoreBreakdown,
} from "../../types/scoring.types.js";
import { ContextRules, NarrativeRules, SequenceRules } from "./rules.js";

export class ScoringEngine {
  private config: ScoringConfig;
  private playerLookup: Map<string, DeepReadonly<SquadPerson>>;

  constructor(
    config: ScoringConfig,
    playerLookup: Map<string, DeepReadonly<SquadPerson>>
  ) {
    this.config = config;
    this.playerLookup = playerLookup;
  }

  public scoreEvents(
    events: DeepReadonly<MatchEvent[]>,
    homeTeamId: string,
    awayTeamId: string
  ): ScoredEvent[] {
    const state: MatchState = {
      homeScore: 0,
      awayScore: 0,
      homeTeamId,
      awayTeamId,
      substitutions: new Map(),
    };

    return events.map((event, index) => {
      const nextEvent = events[index + 1];

      const scoredEvent = this.calculateEventScore(event, nextEvent, state);

      this.updateState(state, event);

      return scoredEvent;
    });
  }

  private calculateEventScore(
    event: DeepReadonly<MatchEvent>,
    nextEvent: DeepReadonly<MatchEvent> | undefined,
    state: MatchState
  ): ScoredEvent {
    const { baseScores, multipliers, bonuses } = this.config;

    // FIX: Strict Index Access safety
    // baseScores[event.type] might be undefined, so we default to 'default', then to 0.
    const defaultBase = baseScores["default"] ?? 0;
    const base = baseScores[event.type] ?? defaultBase;

    const appliedMultipliers: { name: string; value: number }[] = [];
    const appliedBonuses: { name: string; value: number }[] = [];

    // FIX: Union Type safety
    // 'minute' does not exist on LineupEvent, so we check if it exists first.
    const rawMinute = "minute" in event ? event.minute : "0";
    const minute = parseInt(rawMinute, 10);

    // 'playerRef1' does not exist on LineupEvent
    const playerRef = "playerRef1" in event ? event.playerRef1 : undefined;
    const player = playerRef ? this.playerLookup.get(playerRef) : undefined;

    // --- Context Rules ---
    // We also use ?? 1.0 or ?? 0 for config lookups to satisfy strict null checks
    if (ContextRules.isLateGame(minute, this.config)) {
      appliedMultipliers.push({
        name: "Late Game",
        value: multipliers.lateGame ?? 1.0,
      });
    }
    if (ContextRules.isHalftimePush(minute)) {
      appliedMultipliers.push({
        name: "Halftime Push",
        value: multipliers.halftimePush ?? 1.0,
      });
    }

    if (ContextRules.isTieBreaker(event, state)) {
      appliedMultipliers.push({
        name: "Tie Breaker",
        value: multipliers.tieBreaker ?? 1.0,
      });
    } else if (ContextRules.isEqualizer(event, state)) {
      appliedMultipliers.push({
        name: "Equalizer",
        value: multipliers.equalizer ?? 1.0,
      });
    } else if (ContextRules.isGarbageTime(event, state, this.config)) {
      appliedMultipliers.push({
        name: "Garbage Time",
        value: multipliers.garbageTime ?? 1.0,
      });
    }

    // --- Narrative Rules ---
    if (NarrativeRules.isDefenderGoal(event, player)) {
      appliedBonuses.push({
        name: "Defender Goal",
        value: bonuses.defenderGoal ?? 0,
      });
    }
    if (NarrativeRules.isKeeperDrama(event, player)) {
      appliedBonuses.push({
        name: "Keeper Drama",
        value: bonuses.keeperDrama ?? 0,
      });
    }
    if (NarrativeRules.isSuperSub(event, minute, player, state, this.config)) {
      appliedMultipliers.push({
        name: "Super Sub",
        value: multipliers.superSub ?? 1.0,
      });
    }

    // --- Sequence Rules ---
    if (SequenceRules.isAssistSequence(event, nextEvent)) {
      appliedBonuses.push({
        name: "Assist Sequence",
        value: bonuses.assistSequence ?? 0,
      });
    }
    if (SequenceRules.isDisallowedGoal(event, nextEvent)) {
      appliedMultipliers.push({
        name: "Disallowed Goal",
        value: multipliers.disallowedGoal ?? 1.0,
      });
    }

    // --- Edge Cases ---
    if (event.comment && event.comment.toLowerCase().includes("red card")) {
      appliedBonuses.push({
        name: "Red Card Text",
        value: bonuses.redCardText ?? 0,
      });
    }

    // --- Final Calculation ---
    const totalMultiplier = appliedMultipliers.reduce(
      (acc, curr) => acc * curr.value,
      1
    );
    const totalBonus = appliedBonuses.reduce(
      (acc, curr) => acc + curr.value,
      0
    );

    const finalScore = base * totalMultiplier + totalBonus;

    const breakdown: ScoreBreakdown = {
      base,
      multipliers: appliedMultipliers,
      bonuses: appliedBonuses,
      finalScore,
    };

    return { event, breakdown };
  }

  private updateState(state: MatchState, event: DeepReadonly<MatchEvent>) {
    // FIX: Union Type safety for minute
    const rawMinute = "minute" in event ? event.minute : "0";
    const minute = parseInt(rawMinute, 10);

    // Update Score
    if (
      event.type === MatchEventType.Goal ||
      event.type === MatchEventType.PenaltyGoal
    ) {
      // FIX: Union Type safety for teamRef1 (doesn't exist on LineupEvent)
      if ("teamRef1" in event && event.teamRef1) {
        if (event.teamRef1 === state.homeTeamId) {
          state.homeScore++;
        } else if (event.teamRef1 === state.awayTeamId) {
          state.awayScore++;
        }
      }
    }

    // Update Substitutions
    if (event.type === MatchEventType.Substitution) {
      // FIX: Union Type safety for playerRef2
      if ("playerRef2" in event && event.playerRef2) {
        state.substitutions.set(event.playerRef2, minute);
      }
    }
  }
}

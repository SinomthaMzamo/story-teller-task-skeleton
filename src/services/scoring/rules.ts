import { MatchEventType, type MatchEvent } from "../../types/match-feed.types.js";
import { type SquadPerson } from "../../types/squad.types.js";
import { type MatchState, type ScoringConfig } from "../../types/scoring.types.js";

/**
 * CONTEXT RULES: Analyze the game state and timing
 */
export const ContextRules = {
  isLateGame: (minute: number, config: ScoringConfig) =>
    minute >= config.thresholds.lateGameMinute,

  isHalftimePush: (minute: number) => minute >= 40 && minute <= 45,

  isTieBreaker: (event: MatchEvent, state: MatchState) => {
    const isGoal =
      event.type === MatchEventType.Goal ||
      event.type === MatchEventType.PenaltyGoal;
    return isGoal && state.homeScore === state.awayScore;
  },

  isEqualizer: (event: MatchEvent, state: MatchState) => {
    const isGoal =
      event.type === MatchEventType.Goal ||
      event.type === MatchEventType.PenaltyGoal;
    const diff = Math.abs(state.homeScore - state.awayScore);
    return isGoal && diff === 1; // Currently 1 behind, so this goal equalizes
  },

  isGarbageTime: (
    event: MatchEvent,
    state: MatchState,
    config: ScoringConfig
  ) => {
    const diff = Math.abs(state.homeScore - state.awayScore);
    return diff >= config.thresholds.garbageTimeDiff;
  },
};

/**
 * NARRATIVE RULES: Analyze the specific players involved
 */
export const NarrativeRules = {
  isDefenderGoal: (event: MatchEvent, player?: SquadPerson) =>
    event.type === MatchEventType.Goal && player?.position === "Defender",

  isKeeperDrama: (event: MatchEvent, player?: SquadPerson) =>
    player?.position === "Goalkeeper" &&
    (event.type === MatchEventType.YellowCard ||
      event.type === MatchEventType.PenaltyWon),

  isSuperSub: (
    event: MatchEvent,
    minute: number,
    player: SquadPerson | undefined,
    state: MatchState,
    config: ScoringConfig
  ) => {
    if (!player) return false;
    const isScoringEvent =
      event.type === MatchEventType.Goal ||
      event.type === MatchEventType.PenaltyWon;
    if (!isScoringEvent) return false;

    const entryTime = state.substitutions.get(player.id);
    if (entryTime === undefined) return false;

    return minute - entryTime <= config.thresholds.superSubMinutes;
  },
};

/**
 * SEQUENCE RULES: Look ahead to the next event
 */
export const SequenceRules = {
  isAssistSequence: (current: MatchEvent, next: MatchEvent | undefined) => {
    if (!next) return false;
    const isSetup =
      current.type === MatchEventType.Corner ||
      current.type === MatchEventType.FreeKickWon;
    return isSetup && next.type === MatchEventType.Goal;
  },

  isDisallowedGoal: (current: MatchEvent, next: MatchEvent | undefined) => {
    if (!next) return false;
    return (
      current.type === MatchEventType.Goal &&
      next.type === MatchEventType.Offside
    );
  },
};

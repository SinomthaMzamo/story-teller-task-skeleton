import { type DeepReadonly, type MatchEvent } from "./match-feed.types.js";

export interface ScoringConfig {
  baseScores: Record<string, number>;
  multipliers: Record<string, number>;
  bonuses: Record<string, number>;
  thresholds: {
    lateGameMinute: number;
    superSubMinutes: number;
    garbageTimeDiff: number;
  };
}

export interface ScoreBreakdown {
  base: number;
  multipliers: { name: string; value: number }[];
  bonuses: { name: string; value: number }[];
  finalScore: number;
}

export interface ScoredEvent {
  event: DeepReadonly<MatchEvent>;
  breakdown: ScoreBreakdown;
}

export interface MatchState {
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
  // Map<PlayerID, MinuteEntered>
  substitutions: Map<string, number>;
}

// This recursively turns every property and nested object into readonly
// Explicitly handles Arrays to ensure they remain arrays
export type DeepReadonly<T> = 
  T extends (infer R)[] ? ReadonlyArray<DeepReadonly<R>> :
  T extends Function ? T :
  T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } :
  T;

interface Identifiable {
  id: string;
  name: string;
}

interface Competition extends Identifiable {
  knownName: string;
  sponsorName: string;
  competitionCode: string;
  competitionFormat: string;
  country: Identifiable;
}

interface TournamentCalendar extends Identifiable {
  startDate: string;
  endDate: string;
}

interface Stage extends Identifiable {
  formatId: string;
  startDate: string;
  endDate: string;
}

interface Contestant extends Identifiable {
  shortName: string;
  officialName: string;
  code: string;
  position: "home" | "away";
  country: Identifiable;
}

interface Venue {
  id: string;
  neutral: "yes" | "no";
  longName: string;
  shortName: string;
  latitude: string;
  longitude: string;
}

export enum MatchEventType {
  MatchEnd = "end 14",
  SecondHalfEnd = "end 2",
  FirstHalfEnd = "end 1",
  Start = "start",
  Lineup = "lineup",
  Goal = "goal",
  PenaltyGoal = "penalty goal",
  PenaltyWon = "penalty won",
  PenaltyLost = "penalty lost", // Conceded
  Miss = "miss", // Shot off target
  Post = "post", // Hit the woodwork
  AttemptSaved = "attempt saved",
  AttemptBlocked = "attempt blocked",
  Corner = "corner",
  Offside = "offside",
  FreeKickWon = "free kick won",
  FreeKickLost = "free kick lost", // Foul committed
  YellowCard = "yellow card",
  RedCard = "red card",
  Substitution = "substitution",
  AddedTime = "added time",
  StartDelay = "start delay",
  EndDelay = "end delay",
}

// Shared properties for all events
interface BaseMatchEvent {
  id: string;
  comment: string;
  timestamp: string;
  lastModified: string;
}

interface LineupEvent extends BaseMatchEvent {
  type: MatchEventType.Lineup;
  // Lineups in JSON do not have minute/period/second/time
}

interface GameEvent extends BaseMatchEvent {
  type: Exclude<MatchEventType, MatchEventType.Lineup>;

  // Optional references (present on most, but not all events)
  teamRef1?: string;
  teamRef2?: string;
  playerRef1?: string;
  playerRef2?: string;

  // In GameEvents, these fields are present (as strings)
  minute: string;
  period: string;
  second: string;
  time: string;
}

export type MatchEvent = LineupEvent | GameEvent;


interface MatchInfo {
  id: string;
  coverageLevel: string;
  date: string;
  time: string;
  localDate: string;
  localTime: string;
  week: string;
  numberOfPeriods: number;
  periodLength: number;
  var: string; 
  lastUpdated: string;
  description: string;

  // Nested objects
  sport: Identifiable;
  ruleset: Identifiable;
  competition: Competition;
  tournamentCalendar: TournamentCalendar;
  stage: Stage;
  contestant: Contestant[];
  venue: Venue;
}

export interface MessageBlock {
  language: string;
  message: MatchEvent[];
}

interface MutableMatchFeed {
  matchInfo: MatchInfo;
  messages: MessageBlock[];
}

// Export the Locked Down Version
// The user of this type sees everything as Readonly
export type MatchFeed = DeepReadonly<MutableMatchFeed>;


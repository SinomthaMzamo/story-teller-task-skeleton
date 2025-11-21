// Utility to keep things immutable (Consistency with your match feed types)
type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends Function
  ? T
  : T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

// 1. Enums and Literals for strict matching
export type PersonType = "player" | "coach" | "assistant coach";
export type Position = "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";
export type ActiveStatus = "yes" | "no";
export type KitType = "Home" | "Away" | "Third";

// 2. Kit Details
export interface Kit {
  type: KitType;
  shirtColour1: string;
  shortsColour1: string;
  socksColour1: string;
  // Secondary colors are optional in your JSON
  shirtColour2?: string;
  socksColour2?: string;
}

export interface TeamKits {
  kit: Kit[];
}

// 3. The Person (Player/Coach)
export interface SquadPerson {
  id: string;
  firstName: string;
  lastName: string;
  shortFirstName: string;
  shortLastName: string;
  matchName: string;
  knownName?: string; // e.g. "Jota", "Yang Hyun-Jun"

  gender: "Male" | "Female";
  nationality: string;
  nationalityId: string;
  secondNationality?: string;
  secondNationalityId?: string;
  placeOfBirth?: string; // Optional (missing on some coaches/players)

  type: PersonType;
  active: ActiveStatus;
  startDate: string;
  endDate?: string; // Optional (only for players who left or coaches)

  // Player Specific Fields
  // These are optional because 'coach' type doesn't have them
  position?: Position;
  shirtNumber?: number;
}

// 4. The Squad (Team wrapper)
export interface Squad {
  contestantId: string; // Matches 'teamRef' in MatchEvents
  contestantName: string;
  contestantShortName: string;
  contestantClubName: string;
  contestantCode: string; // e.g. "CEL", "KIL"

  tournamentCalendarId: string;
  tournamentCalendarStartDate: string;
  tournamentCalendarEndDate: string;

  competitionName: string;
  competitionId: string;

  venueName: string;
  venueId: string;

  person: SquadPerson[];
  teamKits?: TeamKits;
}

// 5. Root Object
export interface MutableSquadFeed {
  squad: Squad[];
  lastUpdated: string;
}

// Export the Readonly version for safety
export type SquadFeed = DeepReadonly<MutableSquadFeed>;

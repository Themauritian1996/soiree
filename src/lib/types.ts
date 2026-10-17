export type Kind = 'game' | 'movie' | 'series';
export type Lang = 'fr' | 'en';
export type Status = 'owned' | 'wishlist' | 'watchlist' | 'seen';

export interface Rules {
  goal?: string;
  setup?: string[];
  turn?: string[];
  end?: string;
  tips?: string[];
  variants?: string[];
}

/** Textes d'une fiche dans une langue donnée */
export interface LocText {
  title?: string;
  summary?: string;
  rules?: Rules;
  funFacts?: string[];
  mechanics?: string[];
}

export interface Item {
  id: string;
  kind: Kind;
  title: string;
  originalTitle?: string;
  year?: number;
  image?: string; // dataURL (photo recadrée) ou URL (affiche TMDB)
  status: Status;
  format?: string; // DVD, Blu-ray, 4K, numérique, boîte
  addedAt: number;
  enriched?: boolean;
  enrichError?: string;
  summary?: string;
  funFacts?: string[];
  tags?: string[];
  notes?: string;
  playCount?: number;
  lastPlayed?: number;
  // Jeux
  minPlayers?: number;
  maxPlayers?: number;
  bestPlayers?: string;
  minTime?: number;
  maxTime?: number;
  minAge?: number;
  weight?: number; // complexité 1-5
  categories?: string[];
  mechanics?: string[];
  designer?: string;
  publisher?: string;
  rules?: Rules;
  // Films / séries
  genres?: string[];
  director?: string;
  cast?: string[];
  runtime?: number;
  seasons?: number;
  moods?: string[];
  tmdbId?: number;
  tmdbRating?: number;
  whereToWatch?: string;
  loc?: Partial<Record<Lang, LocText>>; // versions FR / EN des textes
  imdbId?: string;
  wikiUrl?: string;
  wikiSummary?: string;
  externalUrl?: string;
  summaryEn?: string;
  lentTo?: string; // prêté à…
  lentAt?: number;
  freeLookupDone?: boolean;
}

/** Une partie jouée / un visionnement (journal) */
export interface Play {
  id: string;
  itemId: string;
  date: number;
  players: string[]; // ids de profils ou noms libres
  winners: string[];
  scores?: Record<string, number>;
  durationMin?: number;
  notes?: string;
  rating?: number;
}

export interface Prefs {
  game: Record<string, number>; // catégorie -> -2..2
  media: Record<string, number>; // genre -> -2..2
  weight: number; // complexité préférée 1-5
  maxTime: number; // minutes
  moods: Record<string, number>;
  about?: string; // texte libre pour l'IA
}

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  color: string;
  guest?: boolean;
  prefs: Prefs;
  ratings: Record<string, number>; // itemId -> 1..5
  createdAt: number;
}

export interface Settings {
  geminiKey?: string;
  geminiModel?: string;
  tmdbKey?: string;
  lang?: 'fr' | 'en';
}

export interface Household {
  id: string;
  name: string;
  members: string[];
  profiles: Profile[];
  settings: Settings;
}

export interface Detected {
  title: string;
  kind: Kind;
  box?: [number, number, number, number]; // ymin,xmin,ymax,xmax (0-1000)
  confidence?: number;
  selected: boolean;
  crop?: string;
}

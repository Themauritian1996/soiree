import { t } from './i18n';

// Vocabulaire commun : l'IA, les quiz et le calcul de compatibilité utilisent ces étiquettes.

export const GAME_CATEGORIES: { key: string; emoji: string; hint: string }[] = [
  { key: 'Stratégie', emoji: '♟️', hint: 'Planifier, optimiser' },
  { key: 'Party', emoji: '🎉', hint: 'Rires, grand groupe' },
  { key: 'Coopératif', emoji: '🤝', hint: 'Tous contre le jeu' },
  { key: 'Famille', emoji: '🏡', hint: 'Simple, tous âges' },
  { key: 'Ambiance', emoji: '🎭', hint: 'Bluff, social' },
  { key: 'Déduction', emoji: '🔎', hint: 'Indices, enquête' },
  { key: 'Mots', emoji: '🔤', hint: 'Vocabulaire, devinettes' },
  { key: 'Cartes', emoji: '🃏', hint: 'Jeux de cartes' },
  { key: 'Deck-building', emoji: '📚', hint: 'Construire son paquet' },
  { key: 'Placement', emoji: '👷', hint: "Placement d'ouvriers" },
  { key: 'Abstrait', emoji: '🔷', hint: 'Pur, sans thème' },
  { key: 'Dés', emoji: '🎲', hint: 'Hasard, lancers' },
  { key: 'Rapidité', emoji: '⚡', hint: 'Réflexes' },
  { key: 'Aventure', emoji: '🗺️', hint: 'Exploration, campagne' },
  { key: 'Enchères', emoji: '💰', hint: 'Négociation, économie' },
  { key: 'Duel', emoji: '⚔️', hint: 'Idéal à deux' },
  { key: 'Puzzle', emoji: '🧩', hint: 'Tuiles, combinaisons' },
  { key: 'Connaissances', emoji: '🧠', hint: 'Quiz, culture' },
];

export const MEDIA_GENRES: { key: string; emoji: string }[] = [
  { key: 'Action', emoji: '💥' },
  { key: 'Aventure', emoji: '🧭' },
  { key: 'Comédie', emoji: '😂' },
  { key: 'Drame', emoji: '🎭' },
  { key: 'Romance', emoji: '💕' },
  { key: 'Science-fiction', emoji: '🚀' },
  { key: 'Fantastique', emoji: '🐉' },
  { key: 'Thriller', emoji: '🔪' },
  { key: 'Horreur', emoji: '👻' },
  { key: 'Policier', emoji: '🕵️' },
  { key: 'Animation', emoji: '🎨' },
  { key: 'Documentaire', emoji: '🎥' },
  { key: 'Historique', emoji: '🏛️' },
  { key: 'Familial', emoji: '👨‍👩‍👧' },
  { key: 'Musical', emoji: '🎵' },
  { key: 'Guerre', emoji: '🎖️' },
  { key: 'Western', emoji: '🤠' },
  { key: 'Téléréalité', emoji: '📺' },
];

export const MOODS: { key: string; emoji: string }[] = [
  { key: 'Léger', emoji: '☀️' },
  { key: 'Intense', emoji: '🔥' },
  { key: 'Réflexion', emoji: '💭' },
  { key: 'Émouvant', emoji: '🥹' },
  { key: 'Feel-good', emoji: '🌈' },
  { key: 'Frissons', emoji: '😱' },
  { key: 'Épique', emoji: '🏔️' },
  { key: 'Cocooning', emoji: '🛋️' },
];

export const PROFILE_COLORS = ['#FF6B4A', '#8B5CF6', '#22D3EE', '#34D399', '#F59E0B', '#EC4899', '#3B82F6', '#A3E635'];
export const PROFILE_EMOJIS = ['🦊', '🐼', '🦉', '🐙', '🦄', '🐯', '🐸', '🐧', '🦁', '🐨', '🐳', '🌵', '🍕', '🎸', '🚀', '⭐'];

export const KIND_META = {
  game: { get label() { return t('Jeux'); }, get single() { return t('Jeu de société'); }, color: 'var(--c-game)', emoji: '🎲' },
  movie: { get label() { return t('Films'); }, get single() { return t('Film'); }, color: 'var(--c-movie)', emoji: '🎬' },
  series: { get label() { return t('Séries'); }, get single() { return t('Série télé'); }, color: 'var(--c-series)', emoji: '📺' },
};

export const FORMATS = ['DVD', 'Blu-ray', '4K', 'Numérique', 'Streaming'];

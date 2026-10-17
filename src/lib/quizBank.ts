import type { QuizQuestion } from './gemini';

// Quiz de secours (sans IA). Les tags correspondent au vocabulaire de vocab.ts.
export const GAME_QUIZ: QuizQuestion[] = [
  { q: 'Ce soir, ton énergie ressemble à…', options: [
    { label: 'Un feu d’artifice', emoji: '🎆', tags: { Party: 2, Rapidité: 1, Ambiance: 1, _lourd: -1 } },
    { label: 'Un bon café tranquille', emoji: '☕', tags: { Stratégie: 1, Puzzle: 1, Famille: 1 } },
    { label: 'Un cerveau en mode turbo', emoji: '🧠', tags: { Stratégie: 2, Placement: 1, _lourd: 2, _long: 1 } },
    { label: 'Un chat qui veut juste rire', emoji: '😹', tags: { Party: 1, Mots: 1, _lourd: -2 } },
  ] },
  { q: 'Tu préfères…', options: [
    { label: 'Gagner tous ensemble', emoji: '🤝', tags: { Coopératif: 2, Aventure: 1 } },
    { label: 'Écraser tout le monde (gentiment)', emoji: '😈', tags: { Stratégie: 1, Duel: 1, Enchères: 1 } },
    { label: 'Bluffer sans broncher', emoji: '🃏', tags: { Ambiance: 2, Déduction: 1, Cartes: 1 } },
    { label: 'On s’en fout, on rit', emoji: '🤪', tags: { Party: 2, Dés: 1 } },
  ] },
  { q: 'Les règles, pour toi, c’est…', options: [
    { label: '2 minutes max, sinon je décroche', emoji: '⏱️', tags: { _lourd: -2, Famille: 1, Party: 1 } },
    { label: 'Une petite lecture, ça va', emoji: '📖', tags: { _lourd: 0, Cartes: 1, Puzzle: 1 } },
    { label: 'Un livret épais ? J’adore', emoji: '📚', tags: { _lourd: 2, Stratégie: 1, Aventure: 1, _long: 1 } },
  ] },
  { q: 'Choisis un superpouvoir de soirée', options: [
    { label: 'Lire dans les pensées', emoji: '🔮', tags: { Déduction: 2, Mots: 1, Ambiance: 1 } },
    { label: 'Prévoir 5 coups d’avance', emoji: '♟️', tags: { Stratégie: 2, Abstrait: 1, _lourd: 1 } },
    { label: 'Réflexes de ninja', emoji: '🥷', tags: { Rapidité: 2, Party: 1 } },
    { label: 'Chance insolente', emoji: '🍀', tags: { Dés: 2, Famille: 1 } },
  ] },
  { q: 'Combien de temps on se donne ?', options: [
    { label: 'Plusieurs petites parties', emoji: '🔁', tags: { _long: -2, Party: 1, Cartes: 1 } },
    { label: 'Une bonne heure', emoji: '🕐', tags: { _long: 0 } },
    { label: 'Toute la soirée, on s’installe', emoji: '🛋️', tags: { _long: 2, Aventure: 1, Stratégie: 1 } },
  ] },
  { q: 'Ton type d’ambiance idéale', options: [
    { label: 'Cris, rires, chaos', emoji: '📣', tags: { Party: 2, Ambiance: 1 } },
    { label: 'Concentration et « hmm… »', emoji: '🤔', tags: { Stratégie: 1, Puzzle: 1, Placement: 1 } },
    { label: 'Histoire et immersion', emoji: '🗺️', tags: { Aventure: 2, Coopératif: 1 } },
    { label: 'Duel les yeux dans les yeux', emoji: '⚔️', tags: { Duel: 2, Abstrait: 1 } },
  ] },
];

export const MEDIA_QUIZ: QuizQuestion[] = [
  { q: 'Après le visionnement, tu veux te sentir…', options: [
    { label: 'Léger comme une plume', emoji: '🪶', tags: { Comédie: 2, 'Feel-good': 2, Léger: 1 } },
    { label: 'Le cœur en mille morceaux', emoji: '💔', tags: { Drame: 2, Émouvant: 2, Romance: 1 } },
    { label: 'Le pouls à 140', emoji: '🫀', tags: { Thriller: 2, Action: 1, Intense: 2 } },
    { label: 'La tête qui tourne', emoji: '🌀', tags: { 'Science-fiction': 2, Réflexion: 2 } },
  ] },
  { q: 'Choisis un décor', options: [
    { label: 'Vaisseau spatial', emoji: '🚀', tags: { 'Science-fiction': 2, Aventure: 1 } },
    { label: 'Château et dragons', emoji: '🏰', tags: { Fantastique: 2, Épique: 2 } },
    { label: 'Ruelle sombre la nuit', emoji: '🌃', tags: { Policier: 2, Thriller: 1, Frissons: 1 } },
    { label: 'Petit café à Paris', emoji: '🥐', tags: { Romance: 2, Comédie: 1, Cocooning: 1 } },
  ] },
  { q: 'Les films d’horreur…', options: [
    { label: 'Oui, fais-moi peur !', emoji: '👻', tags: { Horreur: 2, Frissons: 2 } },
    { label: 'Un petit frisson, pas plus', emoji: '😬', tags: { Thriller: 1, Horreur: -1 } },
    { label: 'Jamais de la vie', emoji: '🙅', tags: { Horreur: -2, Frissons: -1, 'Feel-good': 1 } },
  ] },
  { q: 'Format idéal ce soir ?', options: [
    { label: 'Un épisode ou deux', emoji: '📺', tags: { _long: -2 } },
    { label: 'Un film normal', emoji: '🎬', tags: { _long: 0 } },
    { label: 'Une épopée de 3 h', emoji: '🏔️', tags: { _long: 2, Épique: 2, Historique: 1 } },
  ] },
  { q: 'Ton snack représente ton humeur', options: [
    { label: 'Popcorn géant', emoji: '🍿', tags: { Action: 2, Aventure: 1, Épique: 1 } },
    { label: 'Chocolat chaud', emoji: '☕', tags: { Animation: 1, Familial: 1, Cocooning: 2 } },
    { label: 'Vin et fromage', emoji: '🍷', tags: { Drame: 1, Historique: 1, Réflexion: 1 } },
    { label: 'Bonbons qui piquent', emoji: '🍬', tags: { Comédie: 2, Léger: 1 } },
  ] },
  { q: 'Tu as envie d’apprendre quelque chose ?', options: [
    { label: 'Oui, épate-moi', emoji: '🤓', tags: { Documentaire: 2, Historique: 1, Réflexion: 1 } },
    { label: 'Non, je débranche', emoji: '🔌', tags: { Comédie: 1, Action: 1, Documentaire: -2 } },
    { label: 'Une vraie histoire romancée', emoji: '📜', tags: { Historique: 2, Drame: 1 } },
  ] },
];

// ---------------------------------------------------------------- English versions (same tags)
const GAME_QUIZ_EN: QuizQuestion[] = [
  { q: 'Tonight, your energy feels like…', options: [
    { label: 'Fireworks', emoji: '🎆', tags: { Party: 2, Rapidité: 1, Ambiance: 1, _lourd: -1 } },
    { label: 'A quiet cup of coffee', emoji: '☕', tags: { Stratégie: 1, Puzzle: 1, Famille: 1 } },
    { label: 'A brain in turbo mode', emoji: '🧠', tags: { Stratégie: 2, Placement: 1, _lourd: 2, _long: 1 } },
    { label: 'A cat that just wants to laugh', emoji: '😹', tags: { Party: 1, Mots: 1, _lourd: -2 } },
  ] },
  { q: 'You’d rather…', options: [
    { label: 'Win all together', emoji: '🤝', tags: { Coopératif: 2, Aventure: 1 } },
    { label: 'Crush everyone (nicely)', emoji: '😈', tags: { Stratégie: 1, Duel: 1, Enchères: 1 } },
    { label: 'Bluff with a straight face', emoji: '🃏', tags: { Ambiance: 2, Déduction: 1, Cartes: 1 } },
    { label: 'Who cares, let’s laugh', emoji: '🤪', tags: { Party: 2, Dés: 1 } },
  ] },
  { q: 'Rules, for you, are…', options: [
    { label: '2 minutes max or I’m out', emoji: '⏱️', tags: { _lourd: -2, Famille: 1, Party: 1 } },
    { label: 'A quick read is fine', emoji: '📖', tags: { _lourd: 0, Cartes: 1, Puzzle: 1 } },
    { label: 'A thick rulebook? Love it', emoji: '📚', tags: { _lourd: 2, Stratégie: 1, Aventure: 1, _long: 1 } },
  ] },
  { q: 'Pick a game-night superpower', options: [
    { label: 'Read minds', emoji: '🔮', tags: { Déduction: 2, Mots: 1, Ambiance: 1 } },
    { label: 'See 5 moves ahead', emoji: '♟️', tags: { Stratégie: 2, Abstrait: 1, _lourd: 1 } },
    { label: 'Ninja reflexes', emoji: '🥷', tags: { Rapidité: 2, Party: 1 } },
    { label: 'Outrageous luck', emoji: '🍀', tags: { Dés: 2, Famille: 1 } },
  ] },
  { q: 'How much time do we have?', options: [
    { label: 'Several quick games', emoji: '🔁', tags: { _long: -2, Party: 1, Cartes: 1 } },
    { label: 'A good hour', emoji: '🕐', tags: { _long: 0 } },
    { label: 'All night, let’s settle in', emoji: '🛋️', tags: { _long: 2, Aventure: 1, Stratégie: 1 } },
  ] },
  { q: 'Your ideal vibe', options: [
    { label: 'Shouting, laughing, chaos', emoji: '📣', tags: { Party: 2, Ambiance: 1 } },
    { label: 'Focus and “hmm…”', emoji: '🤔', tags: { Stratégie: 1, Puzzle: 1, Placement: 1 } },
    { label: 'Story and immersion', emoji: '🗺️', tags: { Aventure: 2, Coopératif: 1 } },
    { label: 'Eye-to-eye duel', emoji: '⚔️', tags: { Duel: 2, Abstrait: 1 } },
  ] },
];

const MEDIA_QUIZ_EN: QuizQuestion[] = [
  { q: 'After watching, you want to feel…', options: [
    { label: 'Light as a feather', emoji: '🪶', tags: { Comédie: 2, 'Feel-good': 2, Léger: 1 } },
    { label: 'Heartbroken in a good way', emoji: '💔', tags: { Drame: 2, Émouvant: 2, Romance: 1 } },
    { label: 'Pulse at 140', emoji: '🫀', tags: { Thriller: 2, Action: 1, Intense: 2 } },
    { label: 'Head spinning', emoji: '🌀', tags: { 'Science-fiction': 2, Réflexion: 2 } },
  ] },
  { q: 'Pick a setting', options: [
    { label: 'Spaceship', emoji: '🚀', tags: { 'Science-fiction': 2, Aventure: 1 } },
    { label: 'Castles and dragons', emoji: '🏰', tags: { Fantastique: 2, Épique: 2 } },
    { label: 'Dark alley at night', emoji: '🌃', tags: { Policier: 2, Thriller: 1, Frissons: 1 } },
    { label: 'Little café in Paris', emoji: '🥐', tags: { Romance: 2, Comédie: 1, Cocooning: 1 } },
  ] },
  { q: 'Horror movies…', options: [
    { label: 'Yes, scare me!', emoji: '👻', tags: { Horreur: 2, Frissons: 2 } },
    { label: 'A little chill, no more', emoji: '😬', tags: { Thriller: 1, Horreur: -1 } },
    { label: 'Not a chance', emoji: '🙅', tags: { Horreur: -2, Frissons: -1, 'Feel-good': 1 } },
  ] },
  { q: 'Ideal format tonight?', options: [
    { label: 'An episode or two', emoji: '📺', tags: { _long: -2 } },
    { label: 'A regular movie', emoji: '🎬', tags: { _long: 0 } },
    { label: 'A 3-hour epic', emoji: '🏔️', tags: { _long: 2, Épique: 2, Historique: 1 } },
  ] },
  { q: 'Your snack is your mood', options: [
    { label: 'Giant popcorn', emoji: '🍿', tags: { Action: 2, Aventure: 1, Épique: 1 } },
    { label: 'Hot chocolate', emoji: '☕', tags: { Animation: 1, Familial: 1, Cocooning: 2 } },
    { label: 'Wine and cheese', emoji: '🍷', tags: { Drame: 1, Historique: 1, Réflexion: 1 } },
    { label: 'Sour candy', emoji: '🍬', tags: { Comédie: 2, Léger: 1 } },
  ] },
  { q: 'Want to learn something?', options: [
    { label: 'Yes, amaze me', emoji: '🤓', tags: { Documentaire: 2, Historique: 1, Réflexion: 1 } },
    { label: 'No, I’m unplugging', emoji: '🔌', tags: { Comédie: 1, Action: 1, Documentaire: -2 } },
    { label: 'A true story, dramatized', emoji: '📜', tags: { Historique: 2, Drame: 1 } },
  ] },
];

export const classicQuiz = (kind: 'game' | 'media', lang: 'fr' | 'en') =>
  kind === 'game' ? (lang === 'en' ? GAME_QUIZ_EN : GAME_QUIZ) : lang === 'en' ? MEDIA_QUIZ_EN : MEDIA_QUIZ;

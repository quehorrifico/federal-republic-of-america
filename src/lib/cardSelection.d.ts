import type { AdvisorSelectionBias, Card, CardType } from '../types';

export const CARD_TYPES: CardType[];

export function inferCardType(card: Partial<Card>): CardType;

export function scoreCardWeight(params: {
  card: Card;
  advisorBias?: AdvisorSelectionBias;
}): number;

export function chooseWeightedCard<T>(
  items: T[],
  getWeight: (item: T) => number,
  rng?: () => number,
): T | null;

export function selectPolicyCardFromDeck(params: {
  deck: string[];
  cardsById: Map<string, Card>;
  advisorBias?: AdvisorSelectionBias;
  rng?: () => number;
}): {
  cardId: string;
  chosenType: CardType;
} | null;

export function applyDeckSelection(deck: string[], selectedCardId: string | null): string[];

export function createSeededRng(seed: number): () => number;

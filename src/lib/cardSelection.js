export const CARD_TYPES = [
  'governor_request',
  'federal_initiative',
  'fallout',
  'cross',
  'maintenance',
  'synth',
];

function isCardType(value) {
  return typeof value === 'string' && CARD_TYPES.includes(value);
}

export function inferCardType(card) {
  if (isCardType(card.type)) {
    return card.type;
  }

  const id = typeof card.id === 'string' ? card.id : '';
  if (id.startsWith('maint-')) {
    return 'maintenance';
  }
  if (id.startsWith('cross-')) {
    return 'cross';
  }
  if (id.startsWith('synth-')) {
    return 'synth';
  }
  if (id.startsWith('fed-')) {
    return 'federal_initiative';
  }
  return 'governor_request';
}

const HIDDEN_STAT_TO_PILLAR = {
  welfare_state: 'social_safety_net',
  public_services: 'social_safety_net',
  universal_healthcare: 'social_safety_net',
  poverty_relief: 'social_safety_net',
  environmentalism: 'green_stewardship',
  conservation: 'green_stewardship',
  sustainability: 'green_stewardship',
  world_peace: 'global_diplomacy',
  internationalism: 'global_diplomacy',
  global_justice: 'global_diplomacy',
  containing_immigration: 'hardline_nationalism',
  nationalism: 'hardline_nationalism',
  white_supremacy: 'hardline_nationalism',
  economic_growth: 'market_growth',
  free_market: 'market_growth',
  entrepreneurship: 'market_growth',
  civil_rights: 'identity_equity',
  social_justice: 'identity_equity',
  anti_racism: 'identity_equity',
  feminism: 'identity_equity',
  lgbt_rights: 'identity_equity',
  workers_rights: 'labor_power',
  job_creation: 'labor_power',
  unionization: 'labor_power',
  tax_cuts: 'fiscal_restraint',
  small_government: 'fiscal_restraint',
  austerity: 'fiscal_restraint',
  security: 'national_security',
  military_strength: 'national_security',
  fighting_crime_terrorism: 'national_security',
  tradition: 'traditional_values',
  christianity: 'traditional_values',
  rural_life: 'traditional_values',
};

const PILLAR_KEYS = new Set([
  'social_safety_net',
  'green_stewardship',
  'global_diplomacy',
  'hardline_nationalism',
  'market_growth',
  'identity_equity',
  'labor_power',
  'fiscal_restraint',
  'national_security',
  'traditional_values',
]);

function getPillarForTag(tag) {
  if (PILLAR_KEYS.has(tag)) {
    return tag;
  }
  return HIDDEN_STAT_TO_PILLAR[tag] ?? null;
}

export function scoreCardWeight(params) {
  const { card, advisorBias } = params;

  let weight = 1;
  const multipliers = advisorBias?.pillarMultipliers ?? {};
  const cardTags = Array.isArray(card.pillarTags) ? card.pillarTags : [];
  const seenPillars = new Set();

  for (const tag of cardTags) {
    const pillar = getPillarForTag(tag);
    if (!pillar || seenPillars.has(pillar)) {
      continue;
    }
    seenPillars.add(pillar);

    const multiplier = multipliers[pillar];
    // Advisors only add positive bias; they never reduce draw odds.
    if (typeof multiplier === 'number' && Number.isFinite(multiplier) && multiplier > 1) {
      weight *= multiplier;
    }
  }

  return Math.max(0.001, weight);
}

export function chooseWeightedCard(items, getWeight, rng = Math.random) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  let totalWeight = 0;
  const weighted = items.map((item) => {
    const weight = Math.max(0, Number(getWeight(item)) || 0);
    totalWeight += weight;
    return { item, weight };
  });

  if (totalWeight <= 0) {
    return items[0] ?? null;
  }

  let threshold = rng() * totalWeight;
  for (const entry of weighted) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.item;
    }
  }

  return weighted[weighted.length - 1]?.item ?? null;
}

export function selectPolicyCardFromDeck(params) {
  const { deck, advisorBias, cardsById, rng = Math.random } = params;

  const candidates = [];
  for (const cardId of deck) {
    const card = cardsById.get(cardId);
    if (!card) {
      continue;
    }
    candidates.push({ cardId, card, cardType: inferCardType(card) });
  }

  if (candidates.length === 0) {
    return null;
  }

  const selected = chooseWeightedCard(
    candidates,
    (entry) =>
      scoreCardWeight({
        card: entry.card,
        advisorBias,
      }),
    rng,
  );

  if (!selected) {
    return null;
  }

  return {
    cardId: selected.cardId,
    chosenType: selected.cardType,
  };
}

export function applyDeckSelection(deck, selectedCardId) {
  if (!selectedCardId) {
    return [...deck];
  }
  return deck.filter((cardId) => cardId !== selectedCardId);
}

export function createSeededRng(seed) {
  let state = Math.floor(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const positive = Math.abs(state);
    return (positive % 1_000_000) / 1_000_000;
  };
}

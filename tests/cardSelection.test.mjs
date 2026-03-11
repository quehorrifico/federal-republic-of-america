import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDeckSelection,
  inferCardType,
  scoreCardWeight,
  selectPolicyCardFromDeck,
} from '../src/lib/cardSelection.js';

test('inferCardType uses explicit type first and conventions otherwise', () => {
  assert.equal(inferCardType({ id: 'x', type: 'cross' }), 'cross');
  assert.equal(inferCardType({ id: 'maint-a' }), 'maintenance');
  assert.equal(inferCardType({ id: 'cross-a' }), 'cross');
  assert.equal(inferCardType({ id: 'synth-a' }), 'synth');
  assert.equal(inferCardType({ id: 'fed-a' }), 'federal_initiative');
  assert.equal(inferCardType({ id: 'gov-a' }), 'governor_request');
});

test('advisor bias boosts cards tagged with favored hidden-stat group', () => {
  const alignedCard = {
    id: 'aligned-card',
    type: 'governor_request',
    pillarTags: ['conservation'],
  };
  const nonAlignedCard = {
    id: 'non-aligned-card',
    type: 'governor_request',
    pillarTags: ['economic_growth'],
  };

  const advisorBias = {
    pillarMultipliers: {
      green_stewardship: 1.6,
    },
  };

  const alignedWeight = scoreCardWeight({ card: alignedCard, advisorBias });
  const nonAlignedWeight = scoreCardWeight({ card: nonAlignedCard, advisorBias });

  assert.ok(alignedWeight > nonAlignedWeight);
});

test('advisor multipliers below 1 do not reduce card weight', () => {
  const card = {
    id: 'card-a',
    type: 'governor_request',
    pillarTags: ['economic_growth'],
  };

  const neutral = scoreCardWeight({ card, advisorBias: undefined });
  const withNegativeMultiplier = scoreCardWeight({
    card,
    advisorBias: {
      pillarMultipliers: {
        market_growth: 0.4,
      },
    },
  });

  assert.equal(withNegativeMultiplier, neutral);
});

test('selectPolicyCardFromDeck selects one card and applyDeckSelection prevents repeats', () => {
  const cardsById = new Map([
    ['a', { id: 'a', type: 'governor_request', pillarTags: ['economic_growth'] }],
    ['b', { id: 'b', type: 'governor_request', pillarTags: ['conservation'] }],
  ]);

  const first = selectPolicyCardFromDeck({
    deck: ['a', 'b'],
    cardsById,
    advisorBias: {
      pillarMultipliers: {
        green_stewardship: 1.6,
      },
    },
    rng: () => 0.9,
  });

  assert.ok(first);
  assert.equal(first.cardId, 'b');

  const remainingDeck = applyDeckSelection(['a', 'b'], first.cardId);
  assert.deepEqual(remainingDeck, ['a']);

  const second = selectPolicyCardFromDeck({
    deck: remainingDeck,
    cardsById,
    rng: () => 0.3,
  });

  assert.ok(second);
  assert.equal(second.cardId, 'a');
});

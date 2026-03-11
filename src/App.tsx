import { useCallback, useEffect, useMemo, useState } from 'react';
import { DecisionCard } from './components/DecisionCard';
import { GameOver } from './components/GameOver';
import { StatsBar } from './components/StatsBar';
import { ADVISOR_LIST, getAdvisorById } from './data/advisors';
import cardsData from './data/cards.json';
import { GOVERNORS } from './data/governors';
import {
  applyDeckSelection,
  createSeededRng,
  inferCardType,
  selectPolicyCardFromDeck,
} from './lib/cardSelection.js';
import {
  applyChoiceToStats,
  logResolutionDebug,
  normalizeCard,
  resolveCardDecision,
  type DecisionResolutionResult,
} from './lib/cardResolution';
import { resolveEnding } from './lib/endings';
import { createInitialHiddenStats } from './lib/hiddenStats';
import { clearGameState, loadGameState, saveGameState } from './lib/storage';
import {
  REGION_KEYS,
  getRegionLoyaltyState,
  isAdvisorId,
  type AdvisorId,
  type AdvisorSelectionBias,
  type Card,
  type Direction,
  type GameOverReason,
  type GameState,
  type HiddenStats,
  type RawCard,
  type RegionLoyaltyByRegion,
  type StatKey,
  type Stats,
} from './types';

const ALL_POLICY_CARDS = (cardsData as RawCard[])
  .map((rawCard) => normalizeCard(rawCard))
  .filter((card): card is Card => Boolean(card))
  .map((card) => ({
    ...card,
    type: card.type ?? inferCardType(card),
  }));

const HEADLINE_DURATION_MS = 3000;
const FULL_TERM_TURNS = 75;
const TERM_CARD_COUNT = 25;
const ELECTION_INTERVAL = 25;
const ELECTION_MAJORITY = Math.floor(REGION_KEYS.length / 2) + 1;
const ELECTION_CHECKPOINTS = [25, 50] as const;

const POLICY_CARD_BY_ID = new Map(ALL_POLICY_CARDS.map((card) => [card.id, card]));

const INITIAL_STATS: Stats = {
  authority: 80,
  capital: 80,
  sentiment: 80,
  sustainability: 30,
};

const INITIAL_HIDDEN_STATS: HiddenStats = createInitialHiddenStats();

interface GovernorMood {
  emoji: string;
  label: string;
}

interface ElectionVote {
  region: (typeof REGION_KEYS)[number];
  loyalty: number;
  mood: GovernorMood;
}

interface ElectionResult {
  turn: number;
  votesFor: number;
  votesAgainst: number;
  passed: boolean;
  forVotes: ElectionVote[];
  againstVotes: ElectionVote[];
}

function getGovernorMood(loyalty: number): GovernorMood {
  const state = getRegionLoyaltyState(loyalty);
  if (state === 'revolt') {
    return { emoji: '🤬', label: 'Revolt' };
  }
  if (state === 'angry') {
    return { emoji: '😠', label: 'Angry' };
  }
  if (state === 'neutral') {
    return { emoji: '😐', label: 'Neutral' };
  }
  if (state === 'supportive') {
    return { emoji: '😃', label: 'Supportive' };
  }
  return { emoji: '😍', label: 'Loyalist' };
}

function getCurrentTerm(turn: number): number {
  return Math.floor(turn / TERM_CARD_COUNT) + 1;
}

function getTurnsUntilNextElection(turn: number): number | null {
  const nextCheckpoint = ELECTION_CHECKPOINTS.find((checkpoint) => turn < checkpoint);
  if (!nextCheckpoint) {
    return null;
  }
  return nextCheckpoint - turn;
}

function createInitialRegionLoyalty(): RegionLoyaltyByRegion {
  const loyalty = {} as RegionLoyaltyByRegion;
  for (const region of REGION_KEYS) {
    loyalty[region] = 45 + Math.floor(Math.random() * 21);
  }
  return loyalty;
}

function createPolicyDeck(): string[] {
  return ALL_POLICY_CARDS.map((card) => card.id);
}

function selectNextCard(
  deck: string[],
  advisorBias: AdvisorSelectionBias | undefined,
  rng: () => number,
): { deck: string[]; cardId: string | null } {
  if (deck.length === 0) {
    return { deck, cardId: null };
  }

  const selected = selectPolicyCardFromDeck({
    deck,
    advisorBias,
    cardsById: POLICY_CARD_BY_ID,
    rng,
  });

  if (!selected?.cardId) {
    return { deck, cardId: null };
  }

  return {
    deck: applyDeckSelection(deck, selected.cardId),
    cardId: selected.cardId,
  };
}

function createNewGameState(advisorId: AdvisorId | null = null): GameState {
  const deck = createPolicyDeck();
  const advisor = getAdvisorById(advisorId);
  const firstSelection = selectNextCard(deck, advisor?.bias, Math.random);

  return {
    advisorId,
    stats: { ...INITIAL_STATS },
    hiddenStats: { ...INITIAL_HIDDEN_STATS },
    regionLoyalty: createInitialRegionLoyalty(),
    turn: 0,
    deck: firstSelection.deck,
    currentCardId: firstSelection.cardId,
    headline: null,
    endingSummary: null,
    gameOver: false,
    gameOverReason: null,
  };
}

type StatFailureReason = 'authority' | 'capital' | 'sustainability' | 'sentiment';

function getCollapseReason(stats: Stats): StatFailureReason | null {
  if (stats.authority <= 0) {
    return 'authority';
  }
  if (stats.capital <= -100) {
    return 'capital';
  }
  if (stats.sustainability <= 0) {
    return 'sustainability';
  }
  if (stats.sentiment <= 0) {
    return 'sentiment';
  }
  return null;
}

function getCollapseHeadline(reason: StatFailureReason): string {
  if (reason === 'authority') {
    return 'The regions stop taking federal calls. The republic starts to splinter.';
  }
  if (reason === 'capital') {
    return "Capital hit -100. Federal credit imploded and asset fire-sales began immediately.";
  }
  if (reason === 'sustainability') {
    return 'Grid failures and breakdowns outrun federal response capacity.';
  }
  return 'Sentiment collapsed so hard that even your allies turned into rivals.';
}

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function getStatHintLabel(statKey: StatKey): string {
  if (statKey === 'authority') {
    return 'Authority';
  }
  if (statKey === 'capital') {
    return 'Capital';
  }
  if (statKey === 'sustainability') {
    return 'Sustainability';
  }
  return 'Sentiment';
}

function buildOutcomeHint(resolution: DecisionResolutionResult, card: Card): string | null {
  if (!resolution.ok) {
    return null;
  }

  const parts: string[] = [];
  const topStats = [...resolution.changes.visibleStatChanges]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 2);
  if (topStats.length > 0) {
    parts.push(
      topStats
        .map((change) => `${getStatHintLabel(change.key)} ${formatSigned(change.delta)}`)
        .join(', '),
    );
  }

  if (card.governor) {
    const governorShift = resolution.changes.regionSupportChanges.find((change) => change.key === card.governor);
    if (governorShift && governorShift.delta !== 0) {
      const governor = GOVERNORS[card.governor];
      parts.push(`${governor.futureRegionName} loyalty ${formatSigned(governorShift.delta)}`);
    }
  }

  return parts.length > 0 ? `Outcome: ${parts.join(' • ')}` : null;
}

function getEndingSummary(params: {
  reason: GameOverReason;
  stats: Stats;
  hiddenStats: HiddenStats;
  turn: number;
}): string {
  const { reason, stats, hiddenStats, turn } = params;
  const ending = resolveEnding({ stats, hiddenStats });
  const tenure = reason === 'completed' ? 'Mandate complete.' : `Mandate ended on card ${turn}.`;
  return `${ending.definition.title}: ${ending.definition.summary} ${tenure}`;
}

function getNoConfidenceResult(turn: number, regionLoyalty: RegionLoyaltyByRegion): ElectionResult {
  const forVotes: ElectionVote[] = [];
  const againstVotes: ElectionVote[] = [];
  for (const region of REGION_KEYS) {
    const loyalty = regionLoyalty[region] ?? 0;
    const mood = getGovernorMood(loyalty);
    const state = getRegionLoyaltyState(loyalty);
    if (state === 'neutral' || state === 'supportive' || state === 'loyalist') {
      forVotes.push({ region, loyalty, mood });
    } else {
      againstVotes.push({ region, loyalty, mood });
    }
  }

  const votesFor = forVotes.length;
  const votesAgainst = againstVotes.length;
  return {
    turn,
    votesFor,
    votesAgainst,
    passed: votesFor >= ELECTION_MAJORITY,
    forVotes,
    againstVotes,
  };
}

function getElectionRegionLabel(region: (typeof REGION_KEYS)[number]): string {
  return GOVERNORS[region]?.futureRegionName ?? region.replace(/_/g, ' ');
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadGameState() ?? createNewGameState());
  const [previewDirection, setPreviewDirection] = useState<Direction | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [electionModal, setElectionModal] = useState<ElectionResult | null>(null);
  const drawRng = useMemo(() => {
    if (typeof window === 'undefined') {
      return Math.random;
    }
    try {
      const seedRaw = window.localStorage.getItem('fra-seed');
      if (!seedRaw) {
        return Math.random;
      }
      const seed = Number(seedRaw);
      if (!Number.isFinite(seed)) {
        return Math.random;
      }
      return createSeededRng(seed);
    } catch {
      return Math.random;
    }
  }, []);

  const drawDebugEnabled = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      return window.localStorage.getItem('fra-debug-draw') === '1';
    } catch {
      return false;
    }
  }, []);

  const resolutionDebugEnabled = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    try {
      return window.localStorage.getItem('fra-debug-resolution') === '1';
    } catch {
      return false;
    }
  }, []);

  const currentCard = useMemo(
    () => (game.currentCardId ? POLICY_CARD_BY_ID.get(game.currentCardId) ?? null : null),
    [game.currentCardId],
  );

  const selectedAdvisor = useMemo(
    () => (game.advisorId && isAdvisorId(game.advisorId) ? getAdvisorById(game.advisorId) : null),
    [game.advisorId],
  );

  const advisorBias = selectedAdvisor?.bias;
  const needsAdvisorSelection = !selectedAdvisor && game.turn === 0 && !game.gameOver;
  const currentYear = useMemo(() => Math.floor(game.turn / 12) + 1, [game.turn]);
  const currentTerm = useMemo(() => getCurrentTerm(game.turn), [game.turn]);
  const turnsUntilNextElection = useMemo(() => getTurnsUntilNextElection(game.turn), [game.turn]);

  const currentGovernorLoyalty = useMemo(() => {
    if (!currentCard?.governor) {
      return null;
    }
    return game.regionLoyalty[currentCard.governor] ?? null;
  }, [currentCard, game.regionLoyalty]);

  const currentGovernor = useMemo(
    () => (currentCard?.governor ? GOVERNORS[currentCard.governor] : null),
    [currentCard],
  );

  const currentGovernorMood = useMemo(
    () => (typeof currentGovernorLoyalty === 'number' ? getGovernorMood(currentGovernorLoyalty) : null),
    [currentGovernorLoyalty],
  );

  const advisorBuffSummary = useMemo(() => {
    if (!selectedAdvisor) {
      return 'Pick an advisor to bias card draw odds toward their agenda.';
    }
    return selectedAdvisor.benefit;
  }, [selectedAdvisor]);

  const previewStats = useMemo(() => {
    if (!previewDirection || !currentCard || game.gameOver) {
      return undefined;
    }

    const choice = previewDirection === 'left' ? currentCard.left : currentCard.right;
    return applyChoiceToStats(game.stats, choice);
  }, [currentCard, game.gameOver, game.stats, previewDirection]);

  const dismissElectionModal = useCallback(() => {
    setElectionModal(null);
  }, []);

  const electionModalUi = electionModal ? (
    <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Election results">
      <div className="settings-modal-panel">
        <h2>No-Confidence Vote Results</h2>
        <p>
          Turn {electionModal.turn}: {electionModal.passed ? 'Vote survived' : 'Vote failed'} (
          {electionModal.votesFor}-{electionModal.votesAgainst})
        </p>
        <p>Votes For (Neutral / Supportive / Loyalist)</p>
        <ul className="governor-standing-list">
          {electionModal.forVotes.map((vote) => (
            <li key={`for-${vote.region}`} className="governor-standing-item">
              <span className="governor-standing-left">
                <span>{vote.mood.emoji}</span>
                <span>{getElectionRegionLabel(vote.region)}</span>
              </span>
              <span className="governor-standing-right">{Math.round(vote.loyalty)}</span>
            </li>
          ))}
        </ul>
        <p>Votes Against (Angry / Revolt)</p>
        <ul className="governor-standing-list">
          {electionModal.againstVotes.map((vote) => (
            <li key={`against-${vote.region}`} className="governor-standing-item">
              <span className="governor-standing-left">
                <span>{vote.mood.emoji}</span>
                <span>{getElectionRegionLabel(vote.region)}</span>
              </span>
              <span className="governor-standing-right">{Math.round(vote.loyalty)}</span>
            </li>
          ))}
        </ul>
        <div className="settings-actions">
          <button className="primary-btn" type="button" onClick={dismissElectionModal}>
            Dismiss
          </button>
        </div>
      </div>
    </section>
  ) : null;

  const startNewGame = useCallback(() => {
    clearGameState();
    setSettingsOpen(false);
    setPreviewDirection(null);
    setElectionModal(null);
    setGame(createNewGameState(null));
  }, []);

  const selectAdvisor = useCallback((advisorId: AdvisorId) => {
    clearGameState();
    setSettingsOpen(false);
    setPreviewDirection(null);
    setElectionModal(null);
    setGame(createNewGameState(advisorId));
  }, []);

  const onChoose = useCallback(
    (direction: Direction) => {
      if (game.gameOver || !currentCard) {
        return;
      }

      const resolution = resolveCardDecision({
        state: {
          stats: game.stats,
          hiddenStats: game.hiddenStats,
          regionLoyalty: game.regionLoyalty,
        },
        card: currentCard,
        direction,
      });

      if (resolutionDebugEnabled) {
        logResolutionDebug(resolution, {
          cardId: currentCard.id,
          turn: game.turn,
          direction,
        });
      }

      if (!resolution.ok) {
        setGame((current) => ({
          ...current,
          headline: resolution.reason ?? 'Decision could not be resolved.',
        }));
        setPreviewDirection(null);
        return;
      }

      let nextStats = resolution.next.stats;
      const nextHiddenStats = resolution.next.hiddenStats;
      const nextRegionLoyalty = resolution.next.regionLoyalty;
      const nextTurn = game.turn + 1;
      const outcomeHint = buildOutcomeHint(resolution, currentCard);

      const collapseReason = getCollapseReason(nextStats);
      if (collapseReason) {
        const endingSummary = getEndingSummary({
          reason: collapseReason,
          stats: nextStats,
          hiddenStats: nextHiddenStats,
          turn: nextTurn,
        });

        setGame({
          ...game,
          stats: nextStats,
          hiddenStats: nextHiddenStats,
          regionLoyalty: nextRegionLoyalty,
          turn: nextTurn,
          currentCardId: null,
          headline: getCollapseHeadline(collapseReason),
          endingSummary,
          gameOver: true,
          gameOverReason: collapseReason,
        });
        setPreviewDirection(null);
        return;
      }

      let electionHeadline: string | null = null;
      if (nextTurn % ELECTION_INTERVAL === 0 && nextTurn < FULL_TERM_TURNS) {
        const noConfidence = getNoConfidenceResult(nextTurn, nextRegionLoyalty);
        setElectionModal(noConfidence);
        if (!noConfidence.passed) {
          const endingSummary = getEndingSummary({
            reason: 'no_confidence',
            stats: nextStats,
            hiddenStats: nextHiddenStats,
            turn: nextTurn,
          });

          setGame({
            ...game,
            stats: nextStats,
            hiddenStats: nextHiddenStats,
            regionLoyalty: nextRegionLoyalty,
            turn: nextTurn,
            currentCardId: null,
            headline: `Vote of no confidence failed (${noConfidence.votesFor}-${noConfidence.votesAgainst}).`,
            endingSummary,
            gameOver: true,
            gameOverReason: 'no_confidence',
          });
          setPreviewDirection(null);
          return;
        }

        electionHeadline = `No-confidence vote survived (${noConfidence.votesFor}-${noConfidence.votesAgainst}).`;
      }

      if (nextTurn >= FULL_TERM_TURNS) {
        const endingSummary = getEndingSummary({
          reason: 'completed',
          stats: nextStats,
          hiddenStats: nextHiddenStats,
          turn: nextTurn,
        });

        setGame({
          ...game,
          stats: nextStats,
          hiddenStats: nextHiddenStats,
          regionLoyalty: nextRegionLoyalty,
          turn: nextTurn,
          currentCardId: null,
          headline: 'Full term completed.',
          endingSummary,
          gameOver: true,
          gameOverReason: 'completed',
        });
        setPreviewDirection(null);
        return;
      }

      const nextSelection = selectNextCard(game.deck, advisorBias, drawRng);

      if (drawDebugEnabled) {
        // eslint-disable-next-line no-console
        console.debug('[draw]', {
          turn: nextTurn,
          cardId: nextSelection.cardId,
          remainingCards: nextSelection.deck.length,
        });
      }

      if (!nextSelection.cardId) {
        const endingSummary = getEndingSummary({
          reason: 'completed',
          stats: nextStats,
          hiddenStats: nextHiddenStats,
          turn: nextTurn,
        });

        setGame({
          ...game,
          stats: nextStats,
          hiddenStats: nextHiddenStats,
          regionLoyalty: nextRegionLoyalty,
          turn: nextTurn,
          deck: nextSelection.deck,
          currentCardId: null,
          headline: 'No more cards. Administration concluded.',
          endingSummary,
          gameOver: true,
          gameOverReason: 'completed',
        });
        setPreviewDirection(null);
        return;
      }

      const headline = [electionHeadline, outcomeHint].filter((part) => Boolean(part)).join(' ');

      setGame({
        advisorId: game.advisorId,
        stats: nextStats,
        hiddenStats: nextHiddenStats,
        regionLoyalty: nextRegionLoyalty,
        turn: nextTurn,
        deck: nextSelection.deck,
        currentCardId: nextSelection.cardId,
        headline: headline || null,
        endingSummary: null,
        gameOver: false,
        gameOverReason: null,
      });

      setPreviewDirection(null);
    },
    [advisorBias, currentCard, drawDebugEnabled, drawRng, game, resolutionDebugEnabled],
  );

  useEffect(() => {
    saveGameState(game);
  }, [game]);

  useEffect(() => {
    if (game.gameOver || currentCard) {
      return;
    }

    setGame((current) => {
      if (current.gameOver || current.currentCardId) {
        return current;
      }

      const currentAdvisor =
        current.advisorId && isAdvisorId(current.advisorId) ? getAdvisorById(current.advisorId) : null;
      const nextSelection = selectNextCard(current.deck, currentAdvisor?.bias, drawRng);

      if (!nextSelection.cardId) {
        const endingSummary = getEndingSummary({
          reason: 'completed',
          stats: current.stats,
          hiddenStats: current.hiddenStats,
          turn: current.turn,
        });

        return {
          ...current,
          gameOver: true,
          gameOverReason: 'completed',
          headline: current.headline ?? 'No more cards available.',
          endingSummary,
        };
      }

      return {
        ...current,
        deck: nextSelection.deck,
        currentCardId: nextSelection.cardId,
        headline: current.headline ?? 'Recovered decision flow from an outdated save.',
      };
    });
  }, [currentCard, drawRng, game.gameOver]);

  useEffect(() => {
    if (!game.headline || game.gameOver) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setGame((current) => (current.headline ? { ...current, headline: null } : current));
    }, HEADLINE_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [game.gameOver, game.headline]);

  if (game.gameOver) {
    return (
      <div className="app-shell">
        <GameOver
          reason={game.gameOverReason}
          turns={game.turn}
          year={currentYear}
          endingSummary={game.endingSummary}
          onRestart={startNewGame}
        />
        {electionModalUi}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="game-layout">
        <section className="top-strip">
          <article className="top-card">
            <h2>Advisor</h2>
            <p className="top-card-value">
              {selectedAdvisor ? `${selectedAdvisor.emoji} ${selectedAdvisor.name}` : 'Unassigned'}
            </p>
            <p className="top-card-subtext">{advisorBuffSummary}</p>
          </article>
          <article className="top-card">
            <h2>Term</h2>
            <p className="top-card-value">{currentTerm}/3</p>
            <p className="top-card-subtext">
              Card {Math.min(game.turn + 1, FULL_TERM_TURNS)} of {FULL_TERM_TURNS}
            </p>
          </article>
          <article className="top-card">
            <h2>Election</h2>
            <p className="top-card-value">
              {turnsUntilNextElection === null ? 'Final Term' : `${turnsUntilNextElection} turns`}
            </p>
            <p className="top-card-subtext">
              {turnsUntilNextElection === null ? 'No further no-confidence vote.' : 'Until next no-confidence vote'}
            </p>
          </article>
          <button
            type="button"
            className="settings-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open game settings"
          >
            ⚙ Settings
          </button>
        </section>

        <section className="card-stage">
          {currentCard ? (
            <DecisionCard
              card={currentCard}
              governorLoyalty={currentGovernorLoyalty}
              pressureHint={null}
              onChoose={onChoose}
              onPreviewDirection={setPreviewDirection}
            />
          ) : (
            <div className="fallback-card">No decision card available.</div>
          )}
        </section>

        <section className="bottom-strip">
          <aside className="governor-status-panel">
            <h2>Current Governor</h2>
            {currentGovernor && currentGovernorMood && typeof currentGovernorLoyalty === 'number' ? (
              <>
                <p className="governor-status-name">
                  {currentGovernor.emoji} {currentGovernor.governorName}
                </p>
                <div className="governor-status-row">
                  <div
                    className="governor-status-emoji"
                    aria-label={currentGovernorMood.label}
                    title={currentGovernorMood.label}
                  >
                    {currentGovernorMood.emoji}
                  </div>
                  <details className="governor-collapsible governor-collapsible-inline">
                    <summary>All Governors</summary>
                    <div className="governor-standing-popover">
                      <ul className="governor-standing-list">
                        {REGION_KEYS.map((region) => {
                          const governor = GOVERNORS[region];
                          const loyalty = game.regionLoyalty[region];
                          const mood = getGovernorMood(loyalty);
                          return (
                            <li key={region} className="governor-standing-item">
                              <span className="governor-standing-left">
                                <span>{governor.emoji}</span>
                                <span>{governor.governorName}</span>
                              </span>
                              <span className="governor-standing-right" title={`${mood.label} (${Math.round(loyalty)})`}>
                                {mood.emoji} {Math.round(loyalty)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </details>
                </div>
                <p className="governor-status-subtext">
                  {currentGovernor.futureRegionName}: {currentGovernorMood.label} ({Math.round(currentGovernorLoyalty)})
                </p>
              </>
            ) : (
              <p className="governor-status-subtext">No governor is currently requesting policy.</p>
            )}
          </aside>

          <aside className="metrics-panel">
            <h2>National Metrics</h2>
            <StatsBar stats={game.stats} previewStats={previewStats} />
          </aside>
        </section>

        {needsAdvisorSelection ? (
          <section className="advisor-modal" role="dialog" aria-modal="true" aria-label="Select an advisor">
            <div className="advisor-modal-panel">
              <h2>Choose Advisor</h2>
              <div className="advisor-options">
                {ADVISOR_LIST.map((advisor) => (
                  <button
                    key={advisor.id}
                    type="button"
                    className="advisor-option"
                    onClick={() => selectAdvisor(advisor.id)}
                  >
                    <span className="advisor-option-head">
                      {advisor.emoji} {advisor.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {settingsOpen ? (
          <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Game settings">
            <div className="settings-modal-panel">
              <h2>Settings</h2>
              <p>Start a fresh administration. This clears current progress and returns to advisor selection.</p>
              <div className="settings-actions">
                <button className="primary-btn" type="button" onClick={startNewGame}>
                  Start New Game
                </button>
                <button className="secondary-btn" type="button" onClick={() => setSettingsOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}
        {electionModalUi}
      </main>
    </div>
  );
}

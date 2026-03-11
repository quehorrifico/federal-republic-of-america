import type { GameOverReason } from '../types';

interface GameOverProps {
  reason: GameOverReason;
  turns: number;
  year: number;
  endingSummary?: string | null;
  onRestart(): void;
}

function getReasonText(reason: GameOverReason): string {
  if (reason === 'authority') {
    return 'Authority collapsed; regional blocs now refuse federal orders.';
  }
  if (reason === 'capital') {
    return 'Capital hit -100; federal checks bounced and asset liquidations began immediately.';
  }
  if (reason === 'sustainability') {
    return 'Sustainability failed; infrastructure and resource systems collapsed faster than response capacity.';
  }
  if (reason === 'sentiment') {
    return 'Sentiment crashed and your mandate dissolved overnight.';
  }
  if (reason === 'no_confidence') {
    return 'You lost the vote of no confidence. The regional bloc coalition removed your mandate.';
  }
  if (reason === 'completed') {
    return 'Your administration survived the full mandate.';
  }
  return 'The republic could not sustain your administration.';
}

export function GameOver({ reason, turns, year, endingSummary, onRestart }: GameOverProps) {
  return (
    <section className="game-over" role="dialog" aria-modal="true" aria-label="Administration summary">
      <div className="game-over-panel">
        <h2>{reason === 'completed' ? 'Mandate Complete' : 'Republic Collapsed'}</h2>
        <p>{getReasonText(reason)}</p>
        <p>Cards resolved: {turns}</p>
        <p>Reached Year {year}</p>
        {endingSummary ? <p>{endingSummary}</p> : null}
        <button className="primary-btn" type="button" onClick={onRestart}>
          Start New Administration
        </button>
      </div>
    </section>
  );
}

import type { GameOverReason } from '../types';

interface GameOverProps {
  reason: GameOverReason;
  turns: number;
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

export function GameOver({ reason, turns, endingSummary, onRestart }: GameOverProps) {
  return (
    <div className="intro-screen">
      <div className="intro-panel">
        <h1 className="intro-title glow-amber" style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: 'none' }}>
          {reason === 'completed' ? 'MANDATE COMPLETE' : 'REPUBLIC COLLAPSED'}
        </h1>

        {endingSummary && (
          <div className="intro-section" style={{ border: 'none', background: 'transparent', padding: '0 1rem', marginBottom: '2rem' }}>
            <p className="intro-body" style={{ fontStyle: 'italic', lineHeight: '1.8', whiteSpace: 'pre-line', fontSize: '1.05rem', textAlign: 'center' }}>
              {endingSummary}
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p className="intro-body" style={{ opacity: 0.7 }}>
            {getReasonText(reason)} — Cards Resolved: {turns}
          </p>
        </div>

        <button 
          className="advisor-action-btn intro-start-btn" 
          type="button" 
          onClick={onRestart}
          style={{ marginTop: '1rem' }}
        >
          [ START NEW ADMINISTRATION ]
        </button>
      </div>
    </div>
  );
}

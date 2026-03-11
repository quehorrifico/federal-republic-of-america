import {
  ACTIVE_STAT_KEYS,
  STAT_DISPLAY_LABELS,
  STAT_EMOJIS,
  type ActiveStatKey,
  type StatKey,
  type Stats,
} from '../types';

interface StatsBarProps {
  stats: Stats;
  previewStats?: Stats;
}

const STAT_ORDER: ActiveStatKey[] = [...ACTIVE_STAT_KEYS];
const SHORT_STAT_NAMES: Record<StatKey, string> = {
  authority: 'Authority',
  capital: 'Capital',
  sentiment: 'Sentiment',
  sustainability: 'Sustainability',
};

const STAT_COLORS: Record<StatKey, string> = {
  authority: 'var(--authority-color)',
  capital: 'var(--capital-color)',
  sentiment: 'var(--sentiment-color)',
  sustainability: 'var(--sustainability-color)',
};

function getMeterWidth(statKey: StatKey, value: number): number {
  if (statKey === 'capital') {
    // Capital runs from -100 to 100, mapped to 0-100% width.
    return Math.max(0, Math.min(100, ((value + 100) / 200) * 100));
  }
  return Math.max(0, Math.min(100, value));
}

export function StatsBar({ stats, previewStats }: StatsBarProps) {
  return (
    <section className={`metrics-horizontal${previewStats ? ' previewing' : ''}`} aria-label="National status">
      {STAT_ORDER.map((key) => {
        const currentValue = stats[key];
        const displayValue = previewStats ? previewStats[key] : currentValue;
        const delta = displayValue - currentValue;
        const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

        return (
          <article className="metric-row" key={key}>
            <header className="metric-row-header">
              <span
                className="metric-emoji"
                role="img"
                aria-label={STAT_DISPLAY_LABELS[key]}
                title={STAT_DISPLAY_LABELS[key]}
              >
                {STAT_EMOJIS[key]}
              </span>
              <span className="metric-name">{SHORT_STAT_NAMES[key]}</span>
              <span className="metric-value">{displayValue}</span>
            </header>
            <div className="metric-track" aria-hidden>
              <div
                className="metric-fill"
                style={{ width: `${getMeterWidth(key, displayValue)}%`, backgroundColor: STAT_COLORS[key] }}
              />
            </div>
            <span
              className={`metric-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'} ${delta === 0 ? 'hidden' : ''}`}
            >
              {deltaText}
            </span>
          </article>
        );
      })}
    </section>
  );
}

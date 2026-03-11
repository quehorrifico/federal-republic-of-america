import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react';
import { GOVERNORS } from '../data/governors';
import { getPolicyPillarLabel } from '../data/policyPillars';
import { type Card, type Direction } from '../types';

const SWIPE_THRESHOLD = 120;
const MIN_SWIPE_THRESHOLD = 110;
const MAX_SWIPE_THRESHOLD = 330;
const SWIPE_THRESHOLD_RATIO = 0.34;
const MAX_ROTATION = 10;
const PREVIEW_FALLBACK_RATIO = 0.62;
const MIN_PREVIEW_THRESHOLD = 72;
const PREVIEW_PROXIMITY_GAP = 44;
const BASE_CHOICE_OPACITY = 0.62;
const CHOICE_ACTIVE_OPACITY_GAIN = 0.38;

interface DecisionCardProps {
  card: Card;
  governorLoyalty?: number | null;
  pressureHint?: string | null;
  onChoose(direction: Direction): void;
  onPreviewDirection(direction: Direction | null): void;
}

interface PreviewThresholds {
  left: number;
  right: number;
}

function getDirectionFromX(x: number, thresholds: PreviewThresholds): Direction | null {
  if (x <= -thresholds.left) {
    return 'left';
  }
  if (x >= thresholds.right) {
    return 'right';
  }
  return null;
}

export function DecisionCard({
  card,
  governorLoyalty,
  pressureHint,
  onChoose,
  onPreviewDirection,
}: DecisionCardProps) {
  const [x, setX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [swipeThreshold, setSwipeThreshold] = useState(SWIPE_THRESHOLD);
  const [previewThresholds, setPreviewThresholds] = useState<PreviewThresholds>({
    left: Math.round(SWIPE_THRESHOLD * PREVIEW_FALLBACK_RATIO),
    right: Math.round(SWIPE_THRESHOLD * PREVIEW_FALLBACK_RATIO),
  });

  const shellRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const leftChoiceRef = useRef<HTMLDivElement | null>(null);
  const rightChoiceRef = useRef<HTMLDivElement | null>(null);
  const startOffsetRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const latestXRef = useRef(0);
  const outgoingDirectionRef = useRef<Direction | null>(null);
  const previewDirectionRef = useRef<Direction | null>(null);
  const isAnimatingRef = useRef(false);

  const setCardX = useCallback((value: number) => {
    latestXRef.current = value;
    setX(value);
  }, []);

  const updatePreviewDirection = useCallback(
    (direction: Direction | null) => {
      if (previewDirectionRef.current === direction) {
        return;
      }
      previewDirectionRef.current = direction;
      onPreviewDirection(direction);
    },
    [onPreviewDirection],
  );

  const triggerSwipe = useCallback(
    (direction: Direction) => {
      if (isAnimatingRef.current) {
        return;
      }
      isAnimatingRef.current = true;
      outgoingDirectionRef.current = direction;
      updatePreviewDirection(direction);
      setIsDragging(false);
      const flyOutDistance = Math.max(700, swipeThreshold + 640);
      setCardX(direction === 'left' ? -flyOutDistance : flyOutDistance);
    },
    [setCardX, swipeThreshold, updatePreviewDirection],
  );

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const updateThreshold = () => {
      const shellWidth = shell.getBoundingClientRect().width;
      const computedSwipe = Math.round(
        Math.max(MIN_SWIPE_THRESHOLD, Math.min(MAX_SWIPE_THRESHOLD, shellWidth * SWIPE_THRESHOLD_RATIO)),
      );
      setSwipeThreshold(computedSwipe);

      const fallbackPreview = Math.round(computedSwipe * PREVIEW_FALLBACK_RATIO);
      const maxPreview = Math.max(MIN_PREVIEW_THRESHOLD, computedSwipe - 12);
      let leftPreview = fallbackPreview;
      let rightPreview = fallbackPreview;

      const card = cardRef.current;
      const leftChoice = leftChoiceRef.current;
      const rightChoice = rightChoiceRef.current;

      if (card && leftChoice && rightChoice) {
        const shellRect = shell.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const leftChoiceRect = leftChoice.getBoundingClientRect();
        const rightChoiceRect = rightChoice.getBoundingClientRect();

        const cardLeftAtRest = (shellRect.width - cardRect.width) / 2;
        const cardRightAtRest = cardLeftAtRest + cardRect.width;
        const leftChoiceRight = leftChoiceRect.right - shellRect.left;
        const rightChoiceLeft = rightChoiceRect.left - shellRect.left;

        leftPreview = Math.max(cardLeftAtRest - (leftChoiceRight + PREVIEW_PROXIMITY_GAP), fallbackPreview);
        rightPreview = Math.max((rightChoiceLeft - PREVIEW_PROXIMITY_GAP) - cardRightAtRest, fallbackPreview);
      }

      const clampPreview = (value: number) =>
        Math.round(Math.max(MIN_PREVIEW_THRESHOLD, Math.min(maxPreview, value)));
      setPreviewThresholds({
        left: clampPreview(leftPreview),
        right: clampPreview(rightPreview),
      });
    };

    updateThreshold();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateThreshold);
      return () => window.removeEventListener('resize', updateThreshold);
    }

    const observer = new ResizeObserver(updateThreshold);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    isAnimatingRef.current = false;
    outgoingDirectionRef.current = null;
    pointerIdRef.current = null;
    setIsDragging(false);
    updatePreviewDirection(null);
    setCardX(0);
  }, [card.id, setCardX, updatePreviewDirection]);

  useEffect(() => {
    if (!showHint) {
      return;
    }
    const timeout = window.setTimeout(() => setShowHint(false), 900);
    return () => window.clearTimeout(timeout);
  }, [showHint]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        triggerSwipe('left');
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        triggerSwipe('right');
        return;
      }
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        setShowHint(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSwipe]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isAnimatingRef.current) {
      return;
    }
    pointerIdRef.current = event.pointerId;
    startOffsetRef.current = event.clientX - latestXRef.current;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) {
      return;
    }
    const nextX = event.clientX - startOffsetRef.current;
    setCardX(nextX);
    updatePreviewDirection(getDirectionFromX(nextX, previewThresholds));
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerIdRef.current = null;
    setIsDragging(false);

    const finalX = latestXRef.current;
    if (Math.abs(finalX) >= swipeThreshold) {
      triggerSwipe(finalX < 0 ? 'left' : 'right');
      return;
    }

    setCardX(0);
    updatePreviewDirection(null);
  };

  const onTransitionEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') {
      return;
    }
    const direction = outgoingDirectionRef.current;
    if (!direction) {
      return;
    }
    isAnimatingRef.current = false;
    outgoingDirectionRef.current = null;
    onChoose(direction);
  };

  const intensity = Math.min(Math.abs(x) / swipeThreshold, 1);
  const leftActive = x <= -previewThresholds.left;
  const rightActive = x >= previewThresholds.right;
  const leftOpacity = Math.min(1, BASE_CHOICE_OPACITY + (leftActive ? intensity * CHOICE_ACTIVE_OPACITY_GAIN : 0));
  const rightOpacity = Math.min(
    1,
    BASE_CHOICE_OPACITY + (rightActive ? intensity * CHOICE_ACTIVE_OPACITY_GAIN : 0),
  );
  const rotation = useMemo(() => {
    const ratio = Math.max(-1, Math.min(1, x / swipeThreshold));
    return ratio * MAX_ROTATION;
  }, [swipeThreshold, x]);

  const cardStyle: CSSProperties = {
    transform: `translateX(${x}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 220ms ease',
  };
  const requestGovernor = card.governor ? GOVERNORS[card.governor] : null;
  const isConsequence = card.type === 'fallout' || card.type === 'cross';
  const isCrisis = card.category?.toLowerCase() === 'crisis';

  return (
    <div className="decision-card-shell" ref={shellRef}>
      <div
        className={`choice-indicator left${leftActive ? ' active' : ''}`}
        style={{ opacity: leftOpacity }}
        ref={leftChoiceRef}
      >
        <div className="choice-indicator-content">
          <span className="choice-main-label">{card.left.label}</span>
        </div>
      </div>

      <article
        ref={cardRef}
        className="decision-card"
        style={cardStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onTransitionEnd={onTransitionEnd}
      >
        <div className="decision-content">
          <p className="decision-meta-pill">
            {requestGovernor
              ? `${requestGovernor.emoji} ${requestGovernor.governorName} • ${requestGovernor.futureRegionName}`
              : 'Federal Policy Council'}
          </p>
          {requestGovernor ? (
            <div className="decision-pillar-row" aria-label="Governor pro policy pillars">
              {requestGovernor.proPillars.map((pillar) => (
                <span key={pillar} className="policy-pill">
                  PRO: {getPolicyPillarLabel(pillar)}
                </span>
              ))}
            </div>
          ) : null}
          {requestGovernor && typeof governorLoyalty === 'number' ? (
            <p className="decision-context-text">
              {requestGovernor.futureRegionName} loyalty: {Math.round(governorLoyalty)}
            </p>
          ) : null}
          {pressureHint ? <p className="decision-pressure-text">{pressureHint}</p> : null}
          {isConsequence || isCrisis ? (
            <div className="decision-hint-row">
              {isConsequence ? <span className="decision-hint-pill">Consequence</span> : null}
              {isCrisis ? <span className="decision-hint-pill">Crisis</span> : null}
            </div>
          ) : null}
          <p className="decision-prompt">{card.prompt}</p>
        </div>
      </article>

      <div
        className={`choice-indicator right${rightActive ? ' active' : ''}`}
        style={{ opacity: rightOpacity }}
        ref={rightChoiceRef}
      >
        <div className="choice-indicator-content">
          <span className="choice-main-label">{card.right.label}</span>
        </div>
      </div>

      {showHint ? <p className="hint-text">Swipe the card or use arrow keys.</p> : null}
    </div>
  );
}

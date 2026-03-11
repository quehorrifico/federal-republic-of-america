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
import { type Card, type Direction } from '../types';

const SWIPE_THRESHOLD = 120;
const MIN_SWIPE_THRESHOLD = 110;
const MAX_SWIPE_THRESHOLD = 330;
const SWIPE_THRESHOLD_RATIO = 0.34;
const MAX_ROTATION = 10;
const PREVIEW_FALLBACK_RATIO = 0.62;
const MIN_PREVIEW_THRESHOLD = 72;
const PREVIEW_PROXIMITY_GAP = 44;

interface DecisionCardProps {
  card: Card;
  governorLoyalty?: number | null;
  pressureHint?: string | null;
  disabled?: boolean;
  malikRewriteActive?: boolean;
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
  disabled,
  malikRewriteActive,
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
      if (disabled) {
        return;
      }
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
  }, [triggerSwipe, disabled]);

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

  const rotation = useMemo(() => {
    const ratio = Math.max(-1, Math.min(1, x / swipeThreshold));
    return ratio * MAX_ROTATION;
  }, [swipeThreshold, x]);

  const cardStyle: CSSProperties = {
    transform: `translateX(${x}px) rotate(${rotation}deg)`,
    transition: isDragging ? 'none' : 'transform 220ms ease',
    zIndex: 10,
    position: 'relative',
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
    userSelect: 'none',
  };

  const requestGovernor = card.governor ? GOVERNORS[card.governor] : null;

  const displayLeftLabel = malikRewriteActive ? '[ REDACTED ]' : card.left.label;
  const displayRightLabel = malikRewriteActive ? '[ FULL ENDORSEMENT ]' : card.right.label;
  const displayPrompt = malikRewriteActive 
    ? `> ORIGINAL TEXT REDACTED\n> NEW PROPOSAL: INCREASE FEDERAL FUNDING TO ${requestGovernor?.futureRegionName.toUpperCase() ?? 'REGION'} IMMEDIATELY.`
    : card.prompt;

  return (
    <div className="decision-card-shell" ref={shellRef} style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
      
      {/* Left and Right hints removed from the sides as per user request, but their containers must remain for layout gap */}
      <div className="swipe-hint-left" style={{ flex: 1 }}></div>

      <article
        ref={cardRef}
        className="decision-terminal"
        style={cardStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onTransitionEnd={onTransitionEnd}
      >
        <div className="decision-terminal-header">
          {requestGovernor
            ? `GOVERNOR PROMPT | ${requestGovernor.futureRegionName.toUpperCase()}`
            : 'FEDERAL POLICY COUNCIL'}
          {malikRewriteActive && <span className="glow-green" style={{ float: 'right' }}>[ REWRITTEN ]</span>}
        </div>
        <div className="decision-terminal-body">
          {malikRewriteActive ? (
            <p className="glow-green" style={{ whiteSpace: 'pre-line' }}>{displayPrompt}</p>
          ) : (
            displayPrompt
          )}
        </div>
        <div className="decision-terminal-footer">
          <span style={{ color: '#ff003c', textShadow: '0 0 5px rgba(255, 0, 60, 0.5)' }}>&lt;&lt; [{displayLeftLabel.toUpperCase()}]</span>
          <span className="glow-green">[{displayRightLabel.toUpperCase()}] &gt;&gt;</span>
        </div>
      </article>

      <div className="swipe-hint-right" style={{ flex: 1 }}></div>

      {showHint ? <p className="hint-text glow-amber" style={{ position: 'absolute', bottom: '-40px' }}>[ SYSTEM: SWIPE CARD OR USE ARROW KEYS ]</p> : null}
    </div>
  );
}

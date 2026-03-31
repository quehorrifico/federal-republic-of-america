import { useEffect, useMemo, useRef } from 'react';
import fraRegionsMapSvg from '../assets/fra-regions-map.svg?raw';
import { getRegionLoyaltyState, normalizeRegionKey, type RegionKey } from '../types';

interface FraRegionMapProps {
  highlightedRegions: string[];
  pulsingRegions?: string[];
  regionLoyalty?: Partial<Record<RegionKey, number>>;
  className?: string;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getLoyaltyFillColor(loyalty: number): string {
  const state = getRegionLoyaltyState(clamp(loyalty));
  if (state === 'revolt') {
    return '#b71c1c';
  }
  if (state === 'angry') {
    return '#ef6c00';
  }
  if (state === 'neutral') {
    return '#e0ba5f';
  }
  if (state === 'supportive') {
    return '#4f79df';
  }
  return '#1b8f5a';
}

export function FraRegionMap({
  highlightedRegions,
  pulsingRegions = [],
  regionLoyalty,
  className,
}: FraRegionMapProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const highlightedSet = useMemo(
    () =>
      new Set(
        highlightedRegions
          .map((region) => normalizeRegionKey(region))
          .filter((region): region is RegionKey => Boolean(region)),
      ),
    [highlightedRegions],
  );
  const pulsingSet = useMemo(
    () =>
      new Set(
        pulsingRegions
          .map((region) => normalizeRegionKey(region))
          .filter((region): region is RegionKey => Boolean(region)),
      ),
    [pulsingRegions],
  );
  const classes = className ? `fra-region-map ${className}` : 'fra-region-map';

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const regionElements = root.querySelectorAll<SVGGElement>('[data-region]');
    for (const regionElement of regionElements) {
      const rawRegion = regionElement.getAttribute('data-region') ?? '';
      const regionKey = normalizeRegionKey(rawRegion);
      if (!regionKey) {
        continue;
      }

      if (regionLoyalty && typeof regionLoyalty[regionKey] === 'number') {
        const loyalty = regionLoyalty[regionKey] as number;
        regionElement.setAttribute('fill', getLoyaltyFillColor(loyalty));
      }

      regionElement.classList.toggle('is-highlighted', highlightedSet.has(regionKey));
      regionElement.classList.toggle('is-pulsing', pulsingSet.has(regionKey));
    }
  }, [highlightedSet, pulsingSet, regionLoyalty]);

  return (
    <div
      className={classes}
      ref={rootRef}
      aria-label="Mandate regional map"
      dangerouslySetInnerHTML={{ __html: fraRegionsMapSvg }}
    />
  );
}

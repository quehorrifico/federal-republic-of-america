import {
  HIDDEN_STAT_KEYS,
  POLICY_PILLAR_KEYS,
  type HiddenStatEffects,
  type HiddenStatKey,
  type HiddenStats,
  type PolicyPillarKey,
} from '../types';

/**
 * Hidden simulation model
 *
 * Pillar -> hidden stats
 * - social_safety_net: welfare_state, public_services, universal_healthcare, poverty_relief
 * - green_stewardship: environmentalism, conservation, sustainability
 * - global_diplomacy: world_peace, internationalism, global_justice
 * - hardline_nationalism: containing_immigration, nationalism, white_supremacy
 * - market_growth: economic_growth, free_market, entrepreneurship
 * - identity_equity: civil_rights, social_justice, anti_racism, feminism, lgbt_rights
 * - labor_power: workers_rights, job_creation, unionization
 * - fiscal_restraint: tax_cuts, small_government, austerity
 * - national_security: security, military_strength, fighting_crime_terrorism
 * - traditional_values: tradition, christianity, rural_life
 *
 * Metric intent
 * - Cards can target individual hidden metrics directly (e.g., conservation or entrepreneurship).
 * - Group averages are used for selection pressure and ending synthesis.
 * - Treasury remains separate and is intentionally not part of hidden groups.
 */

export const HIDDEN_STAT_MIN = 0;
export const HIDDEN_STAT_MAX = 100;
export const HIDDEN_STAT_DEFAULT = 50;

export const HIDDEN_STATS_BY_PILLAR: Record<PolicyPillarKey, readonly HiddenStatKey[]> = {
  social_safety_net: ['welfare_state', 'public_services', 'universal_healthcare', 'poverty_relief'],
  green_stewardship: ['environmentalism', 'conservation', 'sustainability'],
  global_diplomacy: ['world_peace', 'internationalism', 'global_justice'],
  hardline_nationalism: ['containing_immigration', 'nationalism', 'white_supremacy'],
  market_growth: ['economic_growth', 'free_market', 'entrepreneurship'],
  identity_equity: ['civil_rights', 'social_justice', 'anti_racism', 'feminism', 'lgbt_rights'],
  labor_power: ['workers_rights', 'job_creation', 'unionization'],
  fiscal_restraint: ['tax_cuts', 'small_government', 'austerity'],
  national_security: ['security', 'military_strength', 'fighting_crime_terrorism'],
  traditional_values: ['tradition', 'christianity', 'rural_life'],
};

export const HIDDEN_STAT_TO_PILLAR: Record<HiddenStatKey, PolicyPillarKey> = {
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

export function clampHiddenStat(value: number): number {
  return Math.max(HIDDEN_STAT_MIN, Math.min(HIDDEN_STAT_MAX, value));
}

export function clampHiddenStats(stats: HiddenStats): HiddenStats {
  const next = {} as HiddenStats;
  for (const key of HIDDEN_STAT_KEYS) {
    next[key] = clampHiddenStat(stats[key]);
  }
  return next;
}

export function createInitialHiddenStats(
  overrides: Partial<HiddenStats> = {},
): HiddenStats {
  const next = {} as HiddenStats;
  for (const key of HIDDEN_STAT_KEYS) {
    next[key] = clampHiddenStat(overrides[key] ?? HIDDEN_STAT_DEFAULT);
  }
  return next;
}

export function applyHiddenStatEffects(
  stats: HiddenStats,
  effects: HiddenStatEffects | undefined,
): HiddenStats {
  if (!effects) {
    return stats;
  }

  const next = { ...stats };
  for (const key of HIDDEN_STAT_KEYS) {
    const delta = effects[key] ?? 0;
    if (delta !== 0) {
      next[key] = clampHiddenStat(next[key] + delta);
    }
  }
  return next;
}

export function getHiddenStat(
  stats: HiddenStats,
  key: HiddenStatKey,
): number {
  return stats[key];
}

export function getPillarHiddenStats(
  stats: HiddenStats,
  pillar: PolicyPillarKey,
): Record<HiddenStatKey, number> {
  const keys = HIDDEN_STATS_BY_PILLAR[pillar];
  const result = {} as Record<HiddenStatKey, number>;
  for (const key of keys) {
    result[key] = stats[key];
  }
  return result;
}

export function getPillarAverage(
  stats: HiddenStats,
  pillar: PolicyPillarKey,
): number {
  const keys = HIDDEN_STATS_BY_PILLAR[pillar];
  const total = keys.reduce((sum, key) => sum + stats[key], 0);
  return total / keys.length;
}

export function isValidHiddenStatGroup(): boolean {
  const assignedStats = new Set<HiddenStatKey>();

  for (const pillar of POLICY_PILLAR_KEYS) {
    const stats = HIDDEN_STATS_BY_PILLAR[pillar];
    if (stats.length < 2) {
      return false;
    }
    for (const key of stats) {
      assignedStats.add(key);
      if (HIDDEN_STAT_TO_PILLAR[key] !== pillar) {
        return false;
      }
    }
  }

  return assignedStats.size === HIDDEN_STAT_KEYS.length;
}

import {
  POLICY_PILLAR_KEYS,
  type PolicyPillarDefinition,
  type PolicyPillarKey,
} from '../types';

export const POLICY_PILLARS: Record<PolicyPillarKey, PolicyPillarDefinition> = {
  social_safety_net: {
    key: 'social_safety_net',
    label: 'Social Safety-net',
    shortLabel: 'Safety-net',
    description: 'Welfare state reach, public services, healthcare access, and poverty relief.',
  },
  green_stewardship: {
    key: 'green_stewardship',
    label: 'Green Stewardship',
    shortLabel: 'Green',
    description: 'Conservation, sustainability, climate protection, and long-run ecological balance.',
  },
  global_diplomacy: {
    key: 'global_diplomacy',
    label: 'Global Diplomacy',
    shortLabel: 'Diplomacy',
    description: 'International cooperation, peace posture, and global justice alignment.',
  },
  hardline_nationalism: {
    key: 'hardline_nationalism',
    label: 'Hardline Nationalism',
    shortLabel: 'Nationalism',
    description: 'Immigration containment, nationalist pressure, and exclusionary identity politics.',
  },
  market_growth: {
    key: 'market_growth',
    label: 'Market Growth',
    shortLabel: 'Growth',
    description: 'Free-market expansion, entrepreneurship, private investment, and GDP push.',
  },
  identity_equity: {
    key: 'identity_equity',
    label: 'Identity Equity',
    shortLabel: 'Equity',
    description: 'Civil rights, anti-racism, gender/LGBT protections, and social justice policy.',
  },
  labor_power: {
    key: 'labor_power',
    label: 'Labor Power',
    shortLabel: 'Labor',
    description: "Worker rights, union leverage, job creation, and bargaining power.",
  },
  fiscal_restraint: {
    key: 'fiscal_restraint',
    label: 'Fiscal Restraint',
    shortLabel: 'Fiscal',
    description: 'Austerity, small-government spending posture, and tax-cut preference.',
  },
  national_security: {
    key: 'national_security',
    label: 'National Security',
    shortLabel: 'Security',
    description: 'Military strength, counter-terror posture, law-and-order, and domestic control.',
  },
  traditional_values: {
    key: 'traditional_values',
    label: 'Traditional Values',
    shortLabel: 'Tradition',
    description: 'Tradition-forward social order, Christianity influence, and rural community priorities.',
  },
};

export const POLICY_PILLAR_ORDER: PolicyPillarKey[] = [...POLICY_PILLAR_KEYS];

export function getPolicyPillarLabel(pillar: PolicyPillarKey): string {
  return POLICY_PILLARS[pillar].label;
}

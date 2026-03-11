import {
  ADVISOR_IDS,
  type AdvisorId,
  type AdvisorSelectionBias,
  type PolicyPillarKey,
} from '../types';

export interface AdvisorDefinition {
  id: AdvisorId;
  name: string;
  emoji: string;
  pitch: string;
  benefit: string;
  drawback: string;
  favoredPillars: readonly [PolicyPillarKey, PolicyPillarKey];
  bias: AdvisorSelectionBias;
}

/**
 * Advisors only apply draw bias around favored policy pillars.
 * They do not grant direct stat or region effects.
 */
export const ADVISORS: Record<AdvisorId, AdvisorDefinition> = {
  realpolitiker: {
    id: 'realpolitiker',
    name: 'Dr. Victor Kross (The Realpolitiker)',
    emoji: '🧪',
    pitch: 'Cold, clinical, and convinced every citizen is a controllable variable.',
    benefit: 'Strongly increases odds of National Security and Fiscal Restraint cards.',
    drawback: 'Only influences card draw odds.',
    favoredPillars: ['national_security', 'fiscal_restraint'],
    bias: {
      pillarMultipliers: {
        national_security: 1.6,
        fiscal_restraint: 1.6,
      },
    },
  },
  revolutionary: {
    id: 'revolutionary',
    name: 'Sade Malik (The Revolutionary)',
    emoji: '🧨',
    pitch: 'Sharp-tongued organizer who treats compromise as a temporary tool.',
    benefit: 'Strongly increases odds of Identity Equity and Labor Power cards.',
    drawback: 'Only influences card draw odds.',
    favoredPillars: ['identity_equity', 'labor_power'],
    bias: {
      pillarMultipliers: {
        identity_equity: 1.6,
        labor_power: 1.6,
      },
    },
  },
  vulture: {
    id: 'vulture',
    name: 'Silas Vane (The Vulture)',
    emoji: '🦅',
    pitch: 'Smug dealmaker who treats federal governance like an earnings call.',
    benefit: 'Strongly increases odds of Market Growth and Fiscal Restraint cards.',
    drawback: 'Only influences card draw odds.',
    favoredPillars: ['market_growth', 'fiscal_restraint'],
    bias: {
      pillarMultipliers: {
        market_growth: 1.6,
        fiscal_restraint: 1.6,
      },
    },
  },
  iron_vance: {
    id: 'iron_vance',
    name: 'Colonel "Iron" Vance (The Hawk)',
    emoji: '🪖',
    pitch: 'Decorated hardliner who sees unrest as an operational opportunity.',
    benefit: 'Strongly increases odds of National Security and Hardline Nationalism cards.',
    drawback: 'Only influences card draw odds.',
    favoredPillars: ['national_security', 'hardline_nationalism'],
    bias: {
      pillarMultipliers: {
        national_security: 1.6,
        hardline_nationalism: 1.6,
      },
    },
  },
  spin_doctor: {
    id: 'spin_doctor',
    name: '"Slick" Rick Santana (The Spin Doctor)',
    emoji: '📺',
    pitch: 'Media-obsessed fixer who can turn any scandal into a headline strategy.',
    benefit: 'Strongly increases odds of Global Diplomacy and Identity Equity cards.',
    drawback: 'Only influences card draw odds.',
    favoredPillars: ['global_diplomacy', 'identity_equity'],
    bias: {
      pillarMultipliers: {
        global_diplomacy: 1.6,
        identity_equity: 1.6,
      },
    },
  },
};

export const ADVISOR_LIST: AdvisorDefinition[] = ADVISOR_IDS.map((id) => ADVISORS[id]);

export function getAdvisorById(advisorId: AdvisorId | null | undefined): AdvisorDefinition | null {
  if (!advisorId) {
    return null;
  }
  return ADVISORS[advisorId] ?? null;
}

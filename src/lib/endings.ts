import type { HiddenStats, Stats } from '../types';

export const ENDING_AXES = [
  'SS',
  'GS',
  'GD',
  'HN',
  'MG',
  'IE',
  'LP',
  'FR',
  'NS',
  'TV',
] as const;

export type EndingAxis = (typeof ENDING_AXES)[number];

export interface EndingDefinition {
  title: string;
  summary: string;
}

export interface EndingResolution {
  primary: EndingAxis;
  secondary: EndingAxis;
  definition: EndingDefinition;
  scores: Record<EndingAxis, number>;
}

const AXIS_SORT_ORDER: Record<EndingAxis, number> = {
  SS: 0,
  GS: 1,
  GD: 2,
  HN: 3,
  MG: 4,
  IE: 5,
  LP: 6,
  FR: 7,
  NS: 8,
  TV: 9,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function mix(pairs: Array<[value: number, weight: number]>): number {
  const weightTotal = pairs.reduce((total, [, weight]) => total + weight, 0);
  if (weightTotal <= 0) {
    return 0;
  }
  const weightedTotal = pairs.reduce((total, [value, weight]) => total + value * weight, 0);
  return weightedTotal / weightTotal;
}

function pairKey(a: EndingAxis, b: EndingAxis): string {
  return AXIS_SORT_ORDER[a] < AXIS_SORT_ORDER[b] ? `${a}|${b}` : `${b}|${a}`;
}

const ENDINGS_BY_PAIR: Record<string, EndingDefinition> = {
  [pairKey('SS', 'GS')]: {
    title: 'The Eco-Commune',
    summary:
      'Universal housing and healthcare run on localized green grids in a peaceful zero-growth republic.',
  },
  [pairKey('SS', 'GD')]: {
    title: 'The Global Sanctuary',
    summary:
      'You opened the borders and offered universal care worldwide, creating a humanitarian beacon under constant logistical strain.',
  },
  [pairKey('SS', 'HN')]: {
    title: 'The Chauvinist Welfare State',
    summary:
      'The state guarantees generous welfare programs, but only for a tightly policed in-group.',
  },
  [pairKey('SS', 'MG')]: {
    title: 'The Nordic Monopoly',
    summary:
      "Megacorporations bankroll elite welfare through taxes, then run everything else however they want.",
  },
  [pairKey('SS', 'IE')]: {
    title: 'The Equitable Utopia',
    summary:
      'Redistribution is aggressive, identity-centered, and built to prioritize groups historically pushed to the margins.',
  },
  [pairKey('SS', 'LP')]: {
    title: "The Workers' Republic",
    summary:
      'Federal governance becomes a union machine: everyone has security, and almost nobody has optionality.',
  },
  [pairKey('SS', 'FR')]: {
    title: 'The Austere Rationing',
    summary:
      'The state guarantees only baseline survival with strict equal provisioning and joyless precision.',
  },
  [pairKey('SS', 'NS')]: {
    title: 'The Paternal Garrison',
    summary:
      'Welfare exists, but it is administered through military bureaucracy and civic duty pipelines.',
  },
  [pairKey('SS', 'TV')]: {
    title: 'The Neo-Feudal Parish',
    summary:
      'Federal welfare is dismantled and delegated to local traditional institutions and parish hierarchies.',
  },
  [pairKey('GS', 'GD')]: {
    title: 'The Earth Federation',
    summary:
      'National sovereignty is subordinated to global ecological treaties and transnational climate administration.',
  },
  [pairKey('GS', 'HN')]: {
    title: 'The Eco-Fascist State',
    summary:
      'Conservation is absolute, enforced by exclusionary borders and blood-and-soil doctrine.',
  },
  [pairKey('GS', 'MG')]: {
    title: 'The Green-Capital Monopoly',
    summary:
      'Sustainability is fully commodified; clean air and water are premium products sold by resource cartels.',
  },
  [pairKey('GS', 'IE')]: {
    title: 'The Climate Justice Coalition',
    summary:
      'Environmental policy is structured around ecological reparations and sovereignty restitution.',
  },
  [pairKey('GS', 'LP')]: {
    title: 'The Rust-to-Green Syndicate',
    summary:
      'Green grids are controlled by hardened labor blocs that replaced the old fossil order.',
  },
  [pairKey('GS', 'FR')]: {
    title: 'The Rewilded Wasteland',
    summary:
      'To save money and emissions, infrastructure funding was gutted and nature reclaimed the built world.',
  },
  [pairKey('GS', 'NS')]: {
    title: 'The Climate Fortress',
    summary:
      'Security forces exist to defend shrinking water, food, and arable land from escalating external pressure.',
  },
  [pairKey('GS', 'TV')]: {
    title: 'The Agrarian Return',
    summary:
      'Industrial modernity is rejected in favor of localized, low-tech, tradition-driven farming societies.',
  },
  [pairKey('GD', 'HN')]: {
    title: "The Hypocrite's Empire",
    summary:
      'Diplomatic language stays global while domestic policy turns aggressively nationalist and covertly coercive.',
  },
  [pairKey('GD', 'MG')]: {
    title: 'The Neoliberal Hegemony',
    summary:
      'Borders vanish for capital flows while people remain gated out of the same freedom.',
  },
  [pairKey('GD', 'IE')]: {
    title: 'The Cosmopolitan Open Society',
    summary:
      'A post-national model emerges where diversity is celebrated and old identity borders dissolve.',
  },
  [pairKey('GD', 'LP')]: {
    title: 'The Internationalist Union',
    summary:
      "Domestic governance is increasingly set by global labor coalitions and cross-border strike leverage.",
  },
  [pairKey('GD', 'FR')]: {
    title: 'The Hollowed State',
    summary:
      'Fiscal cuts outsourced core governance to NGOs and foreign contractors, leaving a shell state at home.',
  },
  [pairKey('GD', 'NS')]: {
    title: 'The World Police',
    summary:
      'Foreign intervention is permanent and framed as peace enforcement under your strategic doctrine.',
  },
  [pairKey('GD', 'TV')]: {
    title: 'The Holy Alliance',
    summary:
      'Foreign policy is routed through transnational religious blocs and doctrinal partnerships.',
  },
  [pairKey('HN', 'MG')]: {
    title: "The Oligarch's Ethnostate",
    summary:
      'Nationalist theater masks elite extraction while cronies consolidate wealth and public anger.',
  },
  [pairKey('HN', 'IE')]: {
    title: 'The Assimilationist Republic',
    summary:
      'Civil rights are broad on paper but conditional on total cultural conformity to the state.',
  },
  [pairKey('HN', 'LP')]: {
    title: 'The National Syndicalist Bloc',
    summary:
      'Domestic unions dominate policy while foreign labor and imports are treated as hostile threats.',
  },
  [pairKey('HN', 'FR')]: {
    title: 'The Starving Citadel',
    summary:
      'Isolationist purity politics outlasted the economy, producing walls, scarcity, and social decay.',
  },
  [pairKey('HN', 'NS')]: {
    title: 'The Totalitarian Junta',
    summary:
      'Security and border control become the entire logic of governance and citizenship.',
  },
  [pairKey('HN', 'TV')]: {
    title: 'The Theocratic Homeland',
    summary:
      'Citizenship is bound to strict orthodoxy, and national belonging is defined by inherited conformity.',
  },
  [pairKey('MG', 'IE')]: {
    title: 'Rainbow Capitalism',
    summary:
      'Identity-forward branding and social justice rhetoric thrive inside fully monetized corporate systems.',
  },
  [pairKey('MG', 'LP')]: {
    title: 'The Co-op Economy',
    summary:
      'Competitive markets survive, but ownership is pushed into legally mandated worker cooperatives.',
  },
  [pairKey('MG', 'FR')]: {
    title: 'The Anarcho-Capitalist Zone',
    summary:
      'Taxes and regulations collapse, and essential services are privatized into pay-per-use markets.',
  },
  [pairKey('MG', 'NS')]: {
    title: 'The Military-Industrial Complex',
    summary:
      'Growth is driven by weapons production, security contracts, and permanent proxy conflict.',
  },
  [pairKey('MG', 'TV')]: {
    title: 'The Gilded Age Revival',
    summary:
      'Extreme wealth concentration returns under a moral order that disciplines the working class.',
  },
  [pairKey('IE', 'LP')]: {
    title: 'The Intersectional Strike',
    summary:
      'Social justice and labor politics fuse into one organizing force controlling major economic levers.',
  },
  [pairKey('IE', 'FR')]: {
    title: 'The DIY Liberation',
    summary:
      'Identity recognition is expansive, but the state retreats from material support and public programs.',
  },
  [pairKey('IE', 'NS')]: {
    title: 'The Progressive Empire',
    summary:
      'An enormous security apparatus is used to export equality doctrine through coercive intervention.',
  },
  [pairKey('IE', 'TV')]: {
    title: 'The Reformed Tradition',
    summary:
      'Traditional institutions are remade to center marginalized voices within state-shaped orthodoxy.',
  },
  [pairKey('LP', 'FR')]: {
    title: 'The Self-Reliant Guilds',
    summary:
      'Federal programs shrink as local unions and neighborhood guilds take over social coordination.',
  },
  [pairKey('LP', 'NS')]: {
    title: 'The Drafted Workforce',
    summary:
      'Compulsory industrial labor and military service become the main route to civic legitimacy.',
  },
  [pairKey('LP', 'TV')]: {
    title: "The Yeoman's Republic",
    summary:
      'Blue-collar unions and cultural conservatism lock together around local industry protection.',
  },
  [pairKey('FR', 'NS')]: {
    title: 'The Mercenary State',
    summary:
      'Taxes are preserved mainly for police and defense while civil public services are stripped away.',
  },
  [pairKey('FR', 'TV')]: {
    title: 'The Puritanical Austerity',
    summary:
      'Frugality is moral law, luxury is suspect, and the state enforces austerity as virtue.',
  },
  [pairKey('NS', 'TV')]: {
    title: 'The Holy Inquisition',
    summary:
      'Security and surveillance power are turned inward to impose strict cultural and religious orthodoxy.',
  },
};

export function computeEndingAxisScores(params: {
  stats: Stats;
  hiddenStats: HiddenStats;
}): Record<EndingAxis, number> {
  const { stats, hiddenStats } = params;

  const scores: Record<EndingAxis, number> = {
    SS: mix([
      [hiddenStats.welfare_state, 0.24],
      [hiddenStats.public_services, 0.22],
      [hiddenStats.universal_healthcare, 0.22],
      [hiddenStats.poverty_relief, 0.16],
      [stats.sentiment, 0.08],
      [stats.sustainability, 0.08],
    ]),
    GS: mix([
      [hiddenStats.environmentalism, 0.34],
      [hiddenStats.conservation, 0.3],
      [hiddenStats.sustainability, 0.24],
      [stats.sustainability, 0.12],
    ]),
    GD: mix([
      [hiddenStats.world_peace, 0.32],
      [hiddenStats.internationalism, 0.32],
      [hiddenStats.global_justice, 0.26],
      [stats.authority, 0.1],
    ]),
    HN: mix([
      [hiddenStats.containing_immigration, 0.34],
      [hiddenStats.nationalism, 0.3],
      [hiddenStats.white_supremacy, 0.24],
      [stats.authority, 0.12],
    ]),
    MG: mix([
      [hiddenStats.economic_growth, 0.34],
      [hiddenStats.free_market, 0.28],
      [hiddenStats.entrepreneurship, 0.24],
      [stats.capital, 0.14],
    ]),
    IE: mix([
      [hiddenStats.civil_rights, 0.24],
      [hiddenStats.social_justice, 0.24],
      [hiddenStats.anti_racism, 0.18],
      [hiddenStats.feminism, 0.12],
      [hiddenStats.lgbt_rights, 0.12],
      [stats.sentiment, 0.1],
    ]),
    LP: mix([
      [hiddenStats.workers_rights, 0.34],
      [hiddenStats.job_creation, 0.26],
      [hiddenStats.unionization, 0.26],
      [stats.sentiment, 0.14],
    ]),
    FR: mix([
      [hiddenStats.tax_cuts, 0.28],
      [hiddenStats.small_government, 0.24],
      [hiddenStats.austerity, 0.24],
      [stats.capital, 0.14],
      [100 - hiddenStats.welfare_state, 0.1],
    ]),
    NS: mix([
      [hiddenStats.security, 0.32],
      [hiddenStats.military_strength, 0.28],
      [hiddenStats.fighting_crime_terrorism, 0.24],
      [stats.authority, 0.08],
      [stats.sustainability, 0.08],
    ]),
    TV: mix([
      [hiddenStats.tradition, 0.38],
      [hiddenStats.christianity, 0.32],
      [hiddenStats.rural_life, 0.2],
      [stats.sentiment, 0.1],
    ]),
  };

  for (const axis of ENDING_AXES) {
    scores[axis] = clamp(scores[axis], 0, 200);
  }

  return scores;
}

function getTopTwoAxes(scores: Record<EndingAxis, number>): [EndingAxis, EndingAxis] {
  const sorted = [...ENDING_AXES].sort((a, b) => {
    const byScore = scores[b] - scores[a];
    if (byScore !== 0) {
      return byScore;
    }
    return AXIS_SORT_ORDER[a] - AXIS_SORT_ORDER[b];
  });
  return [sorted[0], sorted[1]];
}

const FALLBACK_ENDING: EndingDefinition = {
  title: 'The Patchwork Republic',
  summary:
    'No bloc fully consolidated power. Your coalition survived through tactical compromises and improvised deals.',
};

export function resolveEnding(params: {
  stats: Stats;
  hiddenStats: HiddenStats;
}): EndingResolution {
  const scores = computeEndingAxisScores(params);
  const [primary, secondary] = getTopTwoAxes(scores);
  const definition = ENDINGS_BY_PAIR[pairKey(primary, secondary)] ?? FALLBACK_ENDING;
  return {
    primary,
    secondary,
    definition,
    scores,
  };
}

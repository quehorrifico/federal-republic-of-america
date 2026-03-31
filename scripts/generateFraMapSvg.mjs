import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { feature, mesh, merge } from 'topojson-client';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.resolve(repoRoot, 'src/assets/fra-regions-map.svg');
const atlasPath = require.resolve('us-atlas/states-10m.json');

const WIDTH = 1200;
const HEIGHT = 760;

// -----------------------------------------------------------------------------
// Mandate — 14 regions (whole states only)
// -----------------------------------------------------------------------------
const REGION_TO_STATES = {
  pacific_northwest: ['WA', 'OR', 'ID'],
  california: ['CA'],
  southwest: ['NV', 'AZ', 'NM', 'UT'],
  mountain_west: ['MT', 'WY', 'CO'],
  great_plains: ['ND', 'SD', 'NE', 'KS', 'OK'],
  texas: ['TX'],
  midwest_great_lakes: ['MN', 'WI', 'MI', 'IL', 'IN', 'OH', 'IA', 'MO'],
  appalachia: ['WV', 'KY', 'TN'],
  mid_atlantic: ['PA', 'NJ', 'DE', 'MD', 'DC', 'VA'],
  northeast: ['NY', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME'],
  southeast: ['NC', 'SC', 'GA'],
  deep_south_gulf_coast: ['FL', 'AL', 'MS', 'LA', 'AR'],
  alaska: ['AK'],
  hawaii: ['HI'],
};

const REGION_LABELS = {
  pacific_northwest: 'CASCADIA',
  california: 'CALIFORNIA',
  southwest: 'MESA',
  mountain_west: 'FRONTIER',
  great_plains: 'HEARTLAND',
  texas: 'TEXAS',
  midwest_great_lakes: 'SUPERIOR',
  appalachia: 'APPALACHIA',
  mid_atlantic: 'COMMONWEALTH',
  northeast: 'UNION',
  southeast: 'PIEDMONT',
  deep_south_gulf_coast: 'DIXIE',
  alaska: 'ALASKA',
  hawaii: 'HAWAII',
};

const REGION_EMOJI = {
  pacific_northwest: '🌲',
  california: '🌊',
  southwest: '🌵',
  mountain_west: '🏔️',
  great_plains: '🌾',
  texas: '🏙️',
  midwest_great_lakes: '🌽',
  appalachia: '⛰️',
  mid_atlantic: '🏛️',
  northeast: '🌆',
  southeast: '🌴',
  deep_south_gulf_coast: '🌞',
  alaska: '❄️',
  hawaii: '🌺',
};

// Nice, distinct, muted-ish palette (14 colors).
// (Chosen to keep adjacent regions visually distinct.)
const REGION_COLORS = {
  pacific_northwest: '#1F6F4A',        // deep green
  california: '#E67E22',              // orange
  southwest: '#8E44AD',               // purple
  mountain_west: '#7A4F2C',           // brown
  great_plains: '#D4A017',            // gold
  texas: '#C0392B',                   // red
  midwest_great_lakes: '#1F4E8C',     // blue
  appalachia: '#2E8B57',              // teal
  mid_atlantic: '#2C3E90',            // indigo
  northeast: '#34495E',               // blue-grey
  southeast: '#008C8C',               // cyan-teal
  deep_south_gulf_coast: '#6B8E23',   // olive-green
  alaska: '#5D3A9B',                  // dark umber
  hawaii: '#C2185B',                  // magenta
};

// Small nudges to keep labels out of awkward spots.
// With merged-geometry centroids, these are mostly minor.
const LABEL_OFFSETS = {
  pacific_northwest: [-6, -12],
  california: [-12, 10],
  southwest: [10, 10],
  mountain_west: [0, -10],
  great_plains: [0, 8],
  texas: [0, 18],
  midwest_great_lakes: [18, 0],
  appalachia: [18, 8],
  mid_atlantic: [20, -4],
  northeast: [18, -18],
  southeast: [12, 16],
  deep_south_gulf_coast: [8, 16],
  alaska: [0, 0],
  hawaii: [0, 0],
};

const FIPS_TO_POSTAL = {
  '01': 'AL',
  '02': 'AK',
  '04': 'AZ',
  '05': 'AR',
  '06': 'CA',
  '08': 'CO',
  '09': 'CT',
  '10': 'DE',
  '11': 'DC',
  '12': 'FL',
  '13': 'GA',
  '15': 'HI',
  '16': 'ID',
  '17': 'IL',
  '18': 'IN',
  '19': 'IA',
  '20': 'KS',
  '21': 'KY',
  '22': 'LA',
  '23': 'ME',
  '24': 'MD',
  '25': 'MA',
  '26': 'MI',
  '27': 'MN',
  '28': 'MS',
  '29': 'MO',
  '30': 'MT',
  '31': 'NE',
  '32': 'NV',
  '33': 'NH',
  '34': 'NJ',
  '35': 'NM',
  '36': 'NY',
  '37': 'NC',
  '38': 'ND',
  '39': 'OH',
  '40': 'OK',
  '41': 'OR',
  '42': 'PA',
  '44': 'RI',
  '45': 'SC',
  '46': 'SD',
  '47': 'TN',
  '48': 'TX',
  '49': 'UT',
  '50': 'VT',
  '51': 'VA',
  '53': 'WA',
  '54': 'WV',
  '55': 'WI',
  '56': 'WY',
};

// Explicit order (stable output + legend-friendly)
const REGION_ORDER = [
  'pacific_northwest',
  'california',
  'southwest',
  'mountain_west',
  'great_plains',
  'texas',
  'midwest_great_lakes',
  'appalachia',
  'mid_atlantic',
  'northeast',
  'southeast',
  'deep_south_gulf_coast',
  'alaska',
  'hawaii',
];

const STATE_TO_REGION = new Map(
  REGION_ORDER.flatMap((regionKey) =>
    REGION_TO_STATES[regionKey].map((stateCode) => [stateCode, regionKey]),
  ),
);

function getRegionFromGeometry(geometry) {
  if (!geometry || geometry.id === undefined || geometry.id === null) return null;
  const fips = String(geometry.id).padStart(2, '0');
  const postal = FIPS_TO_POSTAL[fips];
  if (!postal) return null;
  return STATE_TO_REGION.get(postal) ?? null;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0';
}

function validateRegionConfig() {
  const seen = new Map();
  for (const [regionKey, states] of Object.entries(REGION_TO_STATES)) {
    for (const st of states) {
      if (!/^[A-Z]{2}$/.test(st)) {
        throw new Error(`Invalid state code "${st}" in region "${regionKey}"`);
      }
      if (seen.has(st)) {
        throw new Error(`State "${st}" assigned to multiple regions: "${seen.get(st)}" and "${regionKey}"`);
      }
      seen.set(st, regionKey);
    }
  }

  for (const regionKey of REGION_ORDER) {
    if (!REGION_TO_STATES[regionKey]) throw new Error(`REGION_ORDER contains unknown regionKey "${regionKey}"`);
    if (!REGION_LABELS[regionKey]) throw new Error(`Missing REGION_LABELS for "${regionKey}"`);
    if (!REGION_COLORS[regionKey]) throw new Error(`Missing REGION_COLORS for "${regionKey}"`);
    if (!REGION_EMOJI[regionKey]) throw new Error(`Missing REGION_EMOJI for "${regionKey}"`);
  }
}

async function buildMap() {
  validateRegionConfig();

  const atlasRaw = await fs.readFile(atlasPath, 'utf8');
  const topology = JSON.parse(atlasRaw);

  if (!topology?.objects?.states) {
    throw new Error('Atlas topology missing objects.states');
  }

  const statesCollection = feature(topology, topology.objects.states);

  // Add postal codes to state properties
  const stateFeatures = statesCollection.features
    .map((stateFeature) => {
      const fips = String(stateFeature.id).padStart(2, '0');
      const postal = FIPS_TO_POSTAL[fips] ?? null;
      return {
        ...stateFeature,
        properties: { ...stateFeature.properties, postal },
      };
    })
    .filter((stateFeature) => {
      const postal = stateFeature.properties.postal;
      return typeof postal === 'string' && STATE_TO_REGION.has(postal);
    });

  const mapFeatureCollection = { type: 'FeatureCollection', features: stateFeatures };

  const projection = geoAlbersUsa();
  projection.fitExtent(
    [
      [46, 46],
      [WIDTH - 46, HEIGHT - 46],
    ],
    mapFeatureCollection,
  );

  const pathGenerator = geoPath(projection);

  // Region -> state features
  const regionToFeatures = Object.fromEntries(REGION_ORDER.map((regionKey) => [regionKey, []]));
  for (const stateFeature of stateFeatures) {
    const regionKey = STATE_TO_REGION.get(stateFeature.properties.postal);
    if (regionKey) regionToFeatures[regionKey].push(stateFeature);
  }

  // --- Borders / outlines -----------------------------------------------------

  // Thin internal state borders (includes region borders too; region borders will be drawn on top thicker)
  const stateBordersMesh = mesh(topology, topology.objects.states, (a, b) => {
    if (a === b) return false;
    const ra = getRegionFromGeometry(a);
    const rb = getRegionFromGeometry(b);
    return Boolean(ra && rb);
  });

  // Thick region borders
  const regionBordersMesh = mesh(topology, topology.objects.states, (a, b) => {
    const ra = getRegionFromGeometry(a);
    const rb = getRegionFromGeometry(b);
    return Boolean(ra && rb && ra !== rb);
  });

  // National outline (better than the earlier "coastlineMesh" approach)
  let nationOutlinePath = '';
  if (topology.objects.nation) {
    const nation = feature(topology, topology.objects.nation);
    const d = pathGenerator(nation);
    if (d) nationOutlinePath = d;
  }

  const stateBordersPath = pathGenerator(stateBordersMesh);
  const regionBordersPath = pathGenerator(regionBordersMesh);

  // --- Region fills -----------------------------------------------------------

  const regionGroups = REGION_ORDER.map((regionKey) => {
    const regionStates = regionToFeatures[regionKey] ?? [];
    const statePaths = regionStates
      .map((stateFeature) => {
        const d = pathGenerator(stateFeature);
        return d ? `<path class="state-fill" d="${d}" />` : '';
      })
      .filter(Boolean)
      .join('');

    return `<g class="region" data-region="${regionKey}" fill="${REGION_COLORS[regionKey]}">${statePaths}</g>`;
  }).join('');

  // --- Labels (merged region geometry centroid for better placement) ----------

  // Build quick lookup: postal -> geometry (topo geometry) to support topojson.merge
  const topoGeoms = topology.objects.states.geometries ?? [];
  const postalToTopoGeom = new Map(
    topoGeoms
      .map((g) => {
        const regionKey = getRegionFromGeometry(g);
        if (!regionKey) return null;
        const fips = String(g.id).padStart(2, '0');
        const postal = FIPS_TO_POSTAL[fips];
        return postal ? [postal, g] : null;
      })
      .filter(Boolean),
  );

  const labelElements = REGION_ORDER.map((regionKey) => {
    const states = REGION_TO_STATES[regionKey] ?? [];
    const geoms = states.map((st) => postalToTopoGeom.get(st)).filter(Boolean);
    let baseX = WIDTH / 2;
    let baseY = HEIGHT / 2;

    if (geoms.length > 0) {
      const mergedGeom = merge(topology, geoms);
      const centroid = pathGenerator.centroid(mergedGeom);
      if (Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])) {
        baseX = centroid[0];
        baseY = centroid[1];
      }
    }

    const [dx, dy] = LABEL_OFFSETS[regionKey] ?? [0, 0];
    const x = baseX + dx;
    const y = baseY + dy;

    const label = `${REGION_EMOJI[regionKey]} ${REGION_LABELS[regionKey]}`;
    return `<text class="region-label" x="${formatNumber(x)}" y="${formatNumber(y)}">${label}</text>`;
  }).join('');

  // --- SVG -------------------------------------------------------------------

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 ${WIDTH} ${HEIGHT}"
     role="img"
     aria-labelledby="fra-map-title fra-map-desc">
  <title id="fra-map-title">Mandate — Regions</title>
  <desc id="fra-map-desc">
    United States map grouped into 14 regions (whole-state membership), including Alaska and Hawaii.
  </desc>

  <defs>
    <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B9DBF4" />
      <stop offset="55%" stop-color="#CFE7FA" />
      <stop offset="100%" stop-color="#9FC9EC" />
    </linearGradient>
  </defs>

  <style>
    .ocean { fill: url(#oceanGradient); }

    /* Region fills: no per-state strokes here — borders are drawn as meshes below. */
    .state-fill { stroke: none; }

    /* Thin state borders (secondary) */
    .state-borders {
      fill: none;
      stroke: rgba(255, 255, 255, 0.60);
      stroke-width: 1.05;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    /* Thick region borders (primary) */
    .region-borders {
      fill: none;
      stroke: rgba(255, 255, 255, 0.96);
      stroke-width: 2.75;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    /* National outline (subtle) */
    .nation-outline {
      fill: none;
      stroke: rgba(15, 23, 42, 0.30);
      stroke-width: 1.25;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .region-label {
      fill: #ffffff;
      font-family: system-ui, -apple-system, "Avenir Next", "Trebuchet MS", sans-serif;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.045em;
      text-anchor: middle;
      paint-order: stroke;
      stroke: rgba(19, 61, 92, 0.65);
      stroke-width: 4.2;
      stroke-linejoin: round;
      pointer-events: none;
      user-select: none;
    }
  </style>

  <rect class="ocean" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" />

  <g class="regions">${regionGroups}</g>

  ${nationOutlinePath ? `<path class="nation-outline" d="${nationOutlinePath}" />` : ''}

  ${stateBordersPath ? `<path class="state-borders" d="${stateBordersPath}" />` : ''}

  ${regionBordersPath ? `<path class="region-borders" d="${regionBordersPath}" />` : ''}

  <g class="labels">${labelElements}</g>
</svg>
`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, svg, 'utf8');
  console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
}

buildMap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

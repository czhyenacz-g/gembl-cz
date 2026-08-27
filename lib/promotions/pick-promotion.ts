import { matchSpecificity, type RouteMatchSpecificity } from "./match-route.ts";

// Priorita: exact > wildcard > global, nikdy se nemixují skupiny (pokud
// existuje aspoň jeden exact match, vybírá se JEN mezi exact kandidáty).
// Uvnitř vítězné skupiny weighted-random podle `weight`.
const SPECIFICITY_RANK: Record<RouteMatchSpecificity, number> = {
  exact: 3,
  wildcard: 2,
  global: 1,
};

export function pickPromotion<T extends { pagePattern: string; weight: number }>(
  candidates: T[],
  pathname: string
): T | null {
  let bestRank = 0;
  let bestGroup: T[] = [];

  for (const candidate of candidates) {
    const specificity = matchSpecificity(candidate.pagePattern, pathname);
    if (!specificity) continue;

    const rank = SPECIFICITY_RANK[specificity];
    if (rank > bestRank) {
      bestRank = rank;
      bestGroup = [candidate];
    } else if (rank === bestRank) {
      bestGroup.push(candidate);
    }
  }

  if (bestGroup.length === 0) return null;
  if (bestGroup.length === 1) return bestGroup[0];

  return weightedRandom(bestGroup);
}

function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + Math.max(1, item.weight), 0);
  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= Math.max(1, item.weight);
    if (roll <= 0) return item;
  }

  return items[items.length - 1];
}

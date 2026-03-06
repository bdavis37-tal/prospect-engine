import type { CommandItem } from "../types/command-center";

/**
 * Fuzzy search across all command items with category-aware ranking.
 *
 * Scoring:
 * - Prefix match: 100
 * - Word boundary match: 75
 * - Substring match: 50
 * - Category match: 25
 * - Fuzzy char-in-order match: 10
 * - Recency boost: 5 * (recentActions.length - recencyIndex)
 *
 * When query is empty, returns recent actions (up to 5) followed by
 * top items (up to 10) for a max of 15 results.
 *
 * All matching is case-insensitive. At most 15 results returned.
 *
 * @param query - Search string (may be empty)
 * @param items - All available command items
 * @param recentActions - Ordered list of recent command item IDs (most recent first)
 * @returns Sorted command items matching the query
 */
export function searchCommands(
  query: string,
  items: CommandItem[],
  recentActions: string[],
): CommandItem[] {
  if (query.length === 0) {
    // Show recent actions first, then top items per category
    const recent = recentActions
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is CommandItem => item !== undefined)
      .slice(0, 5);

    const recentIds = new Set(recent.map((item) => item.id));
    const remaining = items
      .filter((item) => !recentIds.has(item.id))
      .slice(0, 10);

    return [...recent, ...remaining];
  }

  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.length === 0) {
    return items.slice(0, 15);
  }

  const scored = items.map((item) => {
    const label = item.label.toLowerCase();
    const category = item.category.toLowerCase();

    let score = 0;

    // Exact prefix match (highest priority)
    if (label.startsWith(normalizedQuery)) {
      score += 100;
    }
    // Word boundary match
    else if (
      label.split(/\s+/).some((word) => word.startsWith(normalizedQuery))
    ) {
      score += 75;
    }
    // Substring match
    else if (label.includes(normalizedQuery)) {
      score += 50;
    }
    // Category match
    else if (category.includes(normalizedQuery)) {
      score += 25;
    }
    // Fuzzy: all query chars appear in order
    else {
      let qi = 0;
      for (let i = 0; i < label.length && qi < normalizedQuery.length; i++) {
        if (label[i] === normalizedQuery[qi]) qi++;
      }
      if (qi === normalizedQuery.length) score += 10;
    }

    // Boost recent items
    const recencyIndex = recentActions.indexOf(item.id);
    if (recencyIndex !== -1) {
      score += 5 * (recentActions.length - recencyIndex);
    }

    return { item, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map((s) => s.item);
}

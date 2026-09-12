import type { PortfolioInput } from "../types/api.generated";

export function isPlaceholderPortfolioName(name: string): boolean {
  return /^(?:browser verification(?: \d+)?|production verification portfolio|untitled portfolio|new portfolio)$/i.test(name.trim());
}

export function suggestedPortfolioName(input: Pick<PortfolioInput, "prospects">): string {
  const basins = [...new Set(input.prospects.map((p) => p.basin))];
  if (basins.length === 1) {
    const basin = basins[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${basin} Portfolio`;
  }
  if (basins.length && basins.every((b) => b.startsWith("permian_"))) return "Permian Basin Portfolio";
  return "Multi-Basin Portfolio";
}

// Recover old test/placeholder drafts without overwriting an analyst's chosen name.
export function namedPortfolioInput(input: PortfolioInput, savedName?: string): PortfolioInput {
  if (!isPlaceholderPortfolioName(input.name)) return input;
  const name = savedName && !isPlaceholderPortfolioName(savedName) ? savedName : suggestedPortfolioName(input);
  return { ...input, name };
}

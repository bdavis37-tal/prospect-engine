import { describe, expect, it } from "vitest";
import { formatCurrency } from "./lib/formatters";

describe("formatters", () => {
  it("formats currency", () => {
    expect(formatCurrency(1200000)).toContain("$");
  });
});
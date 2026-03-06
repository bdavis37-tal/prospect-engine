import type { PortfolioState } from "../types/portfolio";
import type { ValidationResult } from "../types/command-center";

/**
 * Validates a wizard step and determines if the user can proceed.
 *
 * @param stepIndex - Step index (0-4)
 * @param state - Current portfolio state
 * @returns ValidationResult with valid flag, errors, and warnings
 */
export function validateStep(
  stepIndex: number,
  state: PortfolioState
): ValidationResult {
  const errors: { field: string; message: string }[] = [];
  const warnings: { field: string; message: string }[] = [];

  switch (stepIndex) {
    case 0: // Portfolio Setup
      if (!state.prospects.length) {
        errors.push({
          field: "prospects",
          message: "Add at least one prospect",
        });
      }
      if (state.budget <= 0) {
        errors.push({ field: "budget", message: "Budget must be positive" });
      }
      break;

    case 1: // Prospect Definition
      for (const p of state.prospects) {
        if (!p.name.trim()) {
          errors.push({
            field: `prospect.${p.prospect_id}.name`,
            message: "Prospect name required",
          });
        }
        if (p.latitude < -90 || p.latitude > 90) {
          errors.push({
            field: `prospect.${p.prospect_id}.lat`,
            message: "Latitude must be between -90 and 90",
          });
        }
        if (p.longitude < -180 || p.longitude > 180) {
          errors.push({
            field: `prospect.${p.prospect_id}.lon`,
            message: "Longitude must be between -180 and 180",
          });
        }
      }
      if (state.prospects.length === 1) {
        warnings.push({
          field: "prospects",
          message:
            "Portfolio optimization works best with 3+ prospects",
        });
      }
      break;

    case 2: // Commodity Pricing
      if (state.selectedScenarios.length === 0) {
        errors.push({
          field: "scenarios",
          message: "Select at least one price scenario",
        });
      }
      break;

    case 3: // Budget & Constraints
      if (state.discountRate < 0 || state.discountRate > 1) {
        errors.push({
          field: "discountRate",
          message: "Discount rate must be between 0% and 100%",
        });
      }
      break;

    case 4: // Run & Explore — no validation needed
      break;
  }

  return { valid: errors.length === 0, errors, warnings };
}

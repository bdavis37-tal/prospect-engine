from __future__ import annotations

from app.engine.models import SensitivityItem, TornadoResult


def generate_tornado(base_case_npv: float, variables_to_test: dict[str, tuple[float, float]]) -> TornadoResult:
    """Generate tornado sensitivity from low/high NPV perturbations."""
    sensitivities: list[SensitivityItem] = []
    for variable, (low_npv, high_npv) in variables_to_test.items():
        sensitivities.append(
            SensitivityItem(
                variable_name=variable,
                low_case_value=low_npv,
                low_case_npv=low_npv,
                high_case_value=high_npv,
                high_case_npv=high_npv,
                swing=abs(high_npv - low_npv),
            )
        )
    sensitivities.sort(key=lambda s: s.swing, reverse=True)
    return TornadoResult(base_case_npv=base_case_npv, sensitivities=sensitivities)
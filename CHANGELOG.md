# Changelog

## [Unreleased] — Production Readiness Audit

### Fixed
- **Recovery factors**: Corrected demo prospect recovery factors from OOIP-scale (~0.10) to EUR-scale (~0.70-0.95), fixing universally negative NPV across all demo prospects.
- **Decision modeler**: Rewrote divest economics to use capital-based valuation with transaction costs instead of NPV-based formula that made divest unrealistically attractive.
- **Scenario engine**: Added deal risk modeling (probability of closing + noise) to divest samples, preventing zero-variance divest from dominating the optimizer.
- **Tornado sensitivity**: Fixed swing calculations for prospects with negative base NPV where multiplicative offsets produced inverted charts.
- **GOM facility costs**: Reduced tieback facility costs to realistic levels; standalone prospects retain full platform costs.

### Added
- **CSV export**: Portfolio CSV and scenario comparison CSV export from the Executive Summary view.
- **Print styles**: Print-specific CSS for the Executive Summary (white background, readable colors, page break control).
- **Map tooltips**: SVG title elements on prospect pins showing name, decision, NPV, and probability of positive NPV.
- **Colorblind accessibility**: Decision letter icons (D/F/S/W) rendered inside map pins alongside color coding.
- **AUDIT_REPORT.md**: Comprehensive production readiness audit with P0-P3 severity ratings.
- **CHANGELOG.md**: This file.

### Changed
- **Shared constants**: Extracted `DECISION_COLORS`, `DECISION_LABELS`, and `DECISION_ICONS` to `frontend/src/lib/constants.ts`, replacing 6 duplicate definitions.
- **ARCHITECTURE.md**: Added 3D visualization pipeline and demo data generation sections.
- **README.md**: Updated demo walkthrough for pre-computed demos, fixed Unicode character, corrected tech stack (Three.js not Leaflet).

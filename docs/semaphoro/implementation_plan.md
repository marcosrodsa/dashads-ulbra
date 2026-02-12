# Advanced Performance Semaphore (Kill or Keep)

Implement a rule-based recommendation system for creative management, aligning with Meta Ads optimization windows and including financial impact metrics (COI).

## Proposed Changes

### [Creatives.tsx](file:///c:/Users/marco/OneDrive/Documents/GitHub/dashads-ulbra/src/pages/Creatives.tsx)

#### [MODIFY] [Creatives.tsx](file:///c:/Users/marco/OneDrive/Documents/GitHub/dashads-ulbra/src/pages/Creatives.tsx)

1.  **Helper Functions**:
    - Update `getCreativeStatus` to accept more context: `ctr`, `conversions`, `investimento`.
    - Implement Phase detection (Ignition, Optimization, Maturity) based on `dailyHistory.length`.
    - Implement "Custo da Inação" (COI) calculation logic: `(currentCpl - avgCpl) * projectedLeads`.

2.  **Semaphore Logic**:
    - **Fase 1 (Ignition, < 3 days)**: Status "Novo". No "Kill" active unless CTR < 0.15%.
    - **Fase 2 (Optimization, 3-14 days)**: Active Alerta/Pausar. Focus on Trend.
    - **Fase 3 (Maturity, > 14 days)**: Full rule application. 7-day lookback for stability.
    - **Gatilhos de Pausa**: Conversions = 0 AND Spend > 2x avgCPL.
    - **Gatilhos de Alerta**: CTR < 0.35% OR (Conversions = 0 AND Spend > 1x avgCPL).
    - **Gatilhos de Escala**: CPL < 80% avgCPL AND Conversions > 3.

3.  **UI Updates**:
    - Update `getStatusBadge` to render the COI value in the tooltip for Red/Amber statuses.
    - Update the badge labels to: "Escalar" (Green), "Observar" (Blue), "Alerta" (Amber), "Pausar" (Red).

## Verification Plan

### Automated Tests
- Run `npm run lint` to ensure no regressions in `Creatives.tsx`.

### Manual Verification
- Verify that creatives with 0 conversions and high spend show "Pausar".
- Verify that new creatives (< 3 days) show "Novo" or similar neutral status.
- Verify that tooltips for Pausar/Alerta show the estimated "Custo da Inação".
- Verify that clicking "Saúde & Tendência" header sorts the table by Diagnostic status.

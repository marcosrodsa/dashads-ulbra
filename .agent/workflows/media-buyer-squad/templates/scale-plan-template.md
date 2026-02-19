---
template: Scale Plan Template
type: strategy
usage: "Use this template to plan systematic campaign scaling"
---

# Scale Plan Template

## Campaign Information

**Campaign Name**: ************\_\_\_************  
**Current Daily Budget**: $**\_\_\_\_**  
**Target Daily Budget**: $**\_\_\_\_**  
**Current CPA**: $**\_\_\_\_**  
**Target CPA**: $**\_\_\_\_**  
**Current ROAS**: **\_\_\_\_**  
**Target ROAS**: **\_\_\_\_**  
**Start Date**: ************\_\_\_************  
**Target Date**: ************\_\_\_************

---

## Pre-Scale Validation

### Readiness Checklist

```bash
# Run scale readiness check:
node scripts/check-scale-readiness.js
```

- [ ] **Data Volume**: ≥ 50 conversions, ≥ 7 days running
- [ ] **Performance**: CPA < Target × 0.8, ROAS > 3.0
- [ ] **Consistency**: Daily conversions > 5, CPA stable
- [ ] **Tracking**: Pixel active, EMQ > 6.0
- [ ] **Economics**: LTV:CAC > 3:1
- [ ] **Creative**: Fresh (< 14 days), frequency < 3.0

**Overall Readiness**: [ ] READY [ ] READY WITH CAUTION [ ] NOT READY

**If NOT READY, fix these issues first**:

1. ***
2. ***
3. ***

---

## Baseline Performance

### Current Metrics (Document Before Scaling)

| Metric            | Value     | Date   |
| ----------------- | --------- | ------ |
| Daily Budget      | $\_\_\_\_ | **\_** |
| Daily Spend       | $\_\_\_\_ | **\_** |
| Daily Conversions | \_\_\_\_  | **\_** |
| CPA               | $\_\_\_\_ | **\_** |
| ROAS              | \_\_\_\_  | **\_** |
| CTR               | \_\_\_\_% | **\_** |
| CVR               | \_\_\_\_% | **\_** |
| Frequency         | \_\_\_\_  | **\_** |
| Hook Rate         | \_\_\_\_% | **\_** |

**Purpose**: Compare against this baseline after each scale increment

---

## Scale Method Selection

### Method 1: Vertical Scaling (Budget Increase)

**When to Use**:

- [ ] Frequency < 2.5
- [ ] Large audience (1M+)
- [ ] Consistent daily conversions
- [ ] No creative fatigue

**How**:

- Increase budget 20% every 3 days
- Monitor CPA closely
- Stop if CPA increases > 20%

**Selected**: [ ] YES [ ] NO

---

### Method 2: Horizontal Scaling (Audience Expansion)

**When to Use**:

- [ ] Frequency 2.5-3.5
- [ ] Audience approaching saturation
- [ ] Strong creative performance
- [ ] Multiple winning ad sets

**How**:

- Duplicate to new audiences
- Keep budget same per ad set
- Test 3-5 new audiences

**Selected**: [ ] YES [ ] NO

**Expansion Options**:

```bash
# Generate expansion options:
node scripts/expand-audience.js
```

- [ ] LAL 1% → LAL 2-3%
- [ ] LAL 1% → LAL 4-5%
- [ ] Interest → Related interests
- [ ] Narrow → Broad
- [ ] Single country → Tier 1 countries

---

### Method 3: Creative Scaling (More Variations)

**When to Use**:

- [ ] Frequency > 3.0
- [ ] Creative fatigue detected
- [ ] Need more volume
- [ ] Proven hooks/angles

**How**:

- Add 3-6 new creative variations
- Use winning hooks with new angles
- Distribute budget across variations

**Selected**: [ ] YES [ ] NO

---

## Scale Timeline

### Week-by-Week Plan

#### Week 1: Baseline

- **Budget**: $**\_\_\_\_**/day
- **Expected CPA**: $**\_\_\_\_**
- **Expected Conversions/Day**: **\_\_\_\_**
- **Actions**: Document baseline, prepare for scale

#### Week 2: First Increment

- **Budget**: $**\_\_\_\_** (+20%)
- **Expected CPA**: $**\_\_\_\_** (+10%)
- **Expected Conversions/Day**: **\_\_\_\_**
- **Actions**:
  - [ ] Increase budget 20%
  - [ ] Monitor daily
  - [ ] Evaluate after 3 days

#### Week 3: Second Increment

- **Budget**: $**\_\_\_\_** (+20%)
- **Expected CPA**: $**\_\_\_\_**
- **Expected Conversions/Day**: **\_\_\_\_**
- **Actions**:
  - [ ] If metrics hold, increase another 20%
  - [ ] If metrics degrade, hold or reduce
  - [ ] Monitor daily

#### Week 4: Horizontal Expansion

- **Budget**: $**\_\_\_\_** (add new ad sets)
- **Expected CPA**: $**\_\_\_\_**
- **Expected Conversions/Day**: **\_\_\_\_**
- **Actions**:
  - [ ] Launch 3-5 new audiences
  - [ ] Keep budget same per ad set
  - [ ] Monitor performance

#### Week 5-8: Continue Scaling

- **Target Budget**: $**\_\_\_\_**/day
- **Actions**:
  - [ ] Continue 20% increases every 3 days
  - [ ] Refresh creative as needed
  - [ ] Expand audiences monthly
  - [ ] Optimize budget allocation weekly

---

## Detailed Scale Schedule

### Vertical Scaling Schedule (20% Every 3 Days)

| Day   | Budget | Expected CPA | Expected Conv/Day | Actions       |
| ----- | ------ | ------------ | ----------------- | ------------- |
| 1-3   | $1,000 | $150         | 10                | Baseline      |
| 4-6   | $1,200 | $165         | 11                | +20%, monitor |
| 7-9   | $1,440 | $172         | 12                | +20%, monitor |
| 10-12 | $1,728 | $180         | 13                | +20%, monitor |
| 13-15 | $2,074 | $187         | 15                | +20%, monitor |
| 16-18 | $2,489 | $195         | 17                | +20%, monitor |
| 19-21 | $2,987 | $202         | 20                | +20%, monitor |

**Notes**:

- CPA expected to increase 10-15% as you scale
- If CPA increases > 20%, pause scaling
- Monitor frequency - if > 3.0, add creative or audiences

---

## Monitoring Plan

### Daily Monitoring (Every 24 Hours)

```bash
# Run daily monitoring:
node scripts/monitor-campaigns.js
```

**Check**:

- [ ] Spend pacing (on track?)
- [ ] CPA vs baseline (within 20%?)
- [ ] ROAS vs baseline (holding?)
- [ ] Conversions/day (increasing?)
- [ ] Frequency (< 3.0?)
- [ ] Creative performance (hook rate, CTR)

**Alert Thresholds**:

- 🚨 CPA increases > 30% → PAUSE SCALE
- ⚠️ CPA increases 20-30% → MONITOR CLOSELY
- ✅ CPA increases < 20% → CONTINUE

---

### 3-Day Evaluation

```bash
# Run comprehensive analysis:
node scripts/diagnose-metrics.js
node scripts/evaluate-kill-scale.js
```

**Compare to Baseline**:

- CPA change: **\_**%
- ROAS change: **\_**%
- Conversions/day change: **\_**%
- Frequency change: **\_**

**Decision**:

- [ ] ✅ **Metrics hold** (CPA within 20%) → Scale again
- [ ] ⚠️ **Metrics degrade slightly** (CPA +20-30%) → Hold, monitor 3 more days
- [ ] ❌ **Metrics degrade significantly** (CPA +30%+) → Reduce budget

---

### Weekly Optimization

```bash
# Optimize budget allocation:
node scripts/allocate-budget.js
```

**Actions**:

- [ ] Review all ad set performance
- [ ] Reallocate budget to best performers
- [ ] Pause underperformers
- [ ] Refresh creative if needed
- [ ] Plan next week's tests

---

## Budget Allocation Strategy

### Performance-Based Allocation

**Formula**: Budget ∝ Performance Score

**Performance Score** = (Target CPA / Actual CPA) × Conversions

**Example**:

```
Ad Set A: CPA $50, 25 conv → Score = (150/50) × 25 = 75
Ad Set B: CPA $80, 15 conv → Score = (150/80) × 15 = 28
Ad Set C: CPA $120, 8 conv → Score = (150/120) × 8 = 10

Total Score = 113

Ad Set A gets: (75/113) × $3000 = $1,991/day
Ad Set B gets: (28/113) × $3000 = $743/day
Ad Set C gets: (10/113) × $3000 = $266/day
```

---

## Creative Refresh Plan

### Refresh Triggers

- [ ] Frequency > 3.5
- [ ] Hook rate < 10%
- [ ] CTR drops 30%+ from peak
- [ ] Creative running 14+ days

### Refresh Actions

```bash
# Generate new creative:
@creative-analyst
*generate-hooks

# Or use scripts:
node scripts/generate-hooks.js
node scripts/generate-angles.js
```

**Cadence**:

- Test 3-6 new hooks every 2 weeks
- Rotate creatives when frequency > 3.0
- Build library of 20+ variations

---

## Audience Expansion Plan

### Expansion Sequence

**Month 1**: Core Audiences

- [ ] LAL 1% Purchasers
- [ ] LAL 1% Add to Cart
- [ ] Interest Stack 1

**Month 2**: Tier 2 Audiences

- [ ] LAL 2-3% Purchasers
- [ ] LAL 2-3% Add to Cart
- [ ] Interest Stack 2

**Month 3**: Broad Audiences

- [ ] LAL 4-5% Purchasers
- [ ] Broad + Advantage+
- [ ] Geographic expansion

**Month 4+**: Continuous Testing

- [ ] New interest stacks
- [ ] Behavioral targeting
- [ ] Retargeting segments

---

## Contingency Plans

### If CPA Spikes (> 30% increase)

**Immediate Actions**:

1. [ ] Reduce budget back to previous level
2. [ ] Check tracking (pixel, CAPI)
3. [ ] Check frequency (if > 3.5, refresh creative)
4. [ ] Analyze funnel (conversion issues?)
5. [ ] Wait 3 days, then try again

### If ROAS Drops (> 20% decrease)

**Immediate Actions**:

1. [ ] Pause new ad sets
2. [ ] Keep only proven winners
3. [ ] Check attribution window
4. [ ] Analyze audience quality
5. [ ] Tighten targeting

### If Frequency Spikes (> 3.5)

**Immediate Actions**:

1. [ ] Pause scaling
2. [ ] Refresh creative (6-9 new hooks)
3. [ ] Expand audiences
4. [ ] Resume scaling after refresh

---

## Success Criteria

### Week 1

- [ ] Budget increased 20-40%
- [ ] CPA within 20% of baseline
- [ ] No creative fatigue
- [ ] Daily monitoring in place

### Month 1

- [ ] Budget doubled
- [ ] CPA stable or improved
- [ ] 3+ winning ad sets
- [ ] 2+ audience expansions
- [ ] Creative refresh completed

### Month 3

- [ ] Budget 3-5x original
- [ ] Consistent performance
- [ ] Diversified audiences (5+ ad sets)
- [ ] Rotating creative library (20+ variations)
- [ ] Profitable at scale (LTV:CAC > 3:1)

---

## Scale Limits

### Maximum Scale Potential

```bash
# Calculate max scale:
node scripts/calculate-economics.js
```

**Based on LTV:CAC**:

- LTV:CAC 5:1+ → Can scale to $100K+/month
- LTV:CAC 4:1 → Can scale to $50K/month
- LTV:CAC 3:1 → Can scale to $25K/month
- LTV:CAC < 3:1 → Limited scaling potential

**Market Size Limits**:

- Audience size: **\_\_\_\_**
- Estimated max reach: **\_\_\_\_**
- Estimated max budget: $**\_\_\_\_**/month

---

## Reporting & Documentation

### Daily Report

- Date: **\_**
- Budget: $**\_**
- Spend: $**\_**
- CPA: $**\_**
- ROAS: **\_**
- Conversions: **\_**
- Notes: **************\_**************

### Weekly Summary

- Week: **\_**
- Total spend: $**\_**
- Total conversions: **\_**
- Avg CPA: $**\_**
- Avg ROAS: **\_**
- Key learnings: **************\_**************
- Next week plan: **************\_**************

---

## Related Resources

- Script: `check-scale-readiness.js` - Validate readiness
- Script: `diagnose-metrics.js` - Monitor performance
- Script: `allocate-budget.js` - Optimize allocation
- Script: `expand-audience.js` - Find expansions
- Script: `calculate-economics.js` - Estimate potential
- Script: `monitor-campaigns.js` - Daily monitoring
- Workflow: `scale-optimization-workflow.md`
- Framework: Jeremy Haynes 20% Rule

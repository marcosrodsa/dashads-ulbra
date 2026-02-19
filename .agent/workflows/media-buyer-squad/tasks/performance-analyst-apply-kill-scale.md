---
task: Apply Kill/Scale Rules
responsavel: "@performance-analyst"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - campaign_data: Campaign performance data (minimum 3 days)
  - target_cpa: Target CPA from strategy
  - target_roas: Target ROAS from strategy
  - minimum_conversions: Minimum conversions for decisions (default: 50)
Saida: |
  - kill_list: Ad sets/ads to pause
  - scale_list: Ad sets/ads to scale
  - hold_list: Ad sets/ads to monitor
  - recommendations: Detailed recommendations for each
  - action_plan: Step-by-step execution plan
Checklist:
  - "[ ] Gather performance data (minimum 3 days)"
  - "[ ] Calculate key metrics (CPA, ROAS, CVR, etc.)"
  - "[ ] Apply kill criteria"
  - "[ ] Apply scale criteria"
  - "[ ] Identify hold/monitor items"
  - "[ ] Create detailed recommendations"
  - "[ ] Provide execution plan to @ad-midas"
---

# \*apply-kill-scale

Apply systematic kill/scale rules based on performance data using frameworks from Jeremy Haynes, Brian Moncada, and Alex Hormozi.

## Purpose

Make data-driven decisions on which ad sets/ads to pause (kill) and which to scale. This prevents wasting money on underperformers and maximizes ROI by scaling winners.

**Critical**: Killing losers quickly and scaling winners aggressively is the key to profitable paid traffic.

## When to Use

- After 3-5 days of campaign running (minimum)
- When you have minimum 50 conversions (ideal)
- Daily/weekly optimization reviews
- When CPA is rising or ROAS is falling
- When creative fatigue is detected

## Prerequisites

### Data Requirements

- [ ] Minimum 3 days of data (5-7 days ideal)
- [ ] Minimum 50 conversions total (ideal, but can decide with less)
- [ ] Target CPA defined
- [ ] Target ROAS defined (if applicable)
- [ ] LTV:CAC ratio known

### Access Requirements

- [ ] Access to Meta Ads Manager
- [ ] Access to performance data
- [ ] Authority to pause/scale campaigns

## Process

### Phase 1: Data Collection & Analysis (15-30 minutes)

#### Step 1.1: Gather Performance Data

**Metrics to Collect** (per ad set/ad):

**Acquisition**:

- Spend
- Conversions
- CPA
- ROAS (if e-commerce)

**Engagement**:

- Impressions
- Clicks
- CTR
- Hook Rate (3-second video views / impressions)
- Frequency

**Conversion**:

- Landing Page Views
- CVR (Conversions / Clicks)

**Time Period**: Last 3-7 days

**Data Format**:

```
Ad Set: LAL 1% Purchasers
- Spend: $500
- Conversions: 5
- CPA: $100
- ROAS: 4.0
- CTR: 2.1%
- Hook Rate: 18%
- Frequency: 2.3
- CVR: 3.2%
```

#### Step 1.2: Calculate Key Metrics

**For Each Ad Set/Ad**:

**CPA vs. Target**:

```
CPA Ratio = Actual CPA / Target CPA

Example:
- Actual CPA: $120
- Target CPA: $150
- CPA Ratio: 0.80 (20% below target) ✅
```

**ROAS vs. Target**:

```
ROAS Ratio = Actual ROAS / Target ROAS

Example:
- Actual ROAS: 4.2
- Target ROAS: 3.0
- ROAS Ratio: 1.40 (40% above target) ✅
```

**Performance Trend**:

```
Compare last 3 days vs. previous 3 days:
- CPA trending up/down?
- ROAS trending up/down?
- Conversions increasing/decreasing?
```

### Phase 2: Apply Kill Criteria (20-30 minutes)

#### Step 2.1: Immediate Kill Criteria

**Kill Immediately If**:

**1. No Conversions After $500 Spend**

```
Criteria:
- Spend: > $500
- Conversions: 0
- Action: KILL IMMEDIATELY

Reason: Unlikely to convert, wasting budget
```

**2. CPA > Target × 2.0**

```
Criteria:
- CPA: > Target CPA × 2.0
- Example: Target $150, Actual $300+
- Action: KILL IMMEDIATELY

Reason: Too expensive, unlikely to improve
```

**3. Hook Rate < 10% (After 1000 Impressions)**

```
Criteria:
- Hook Rate: < 10%
- Impressions: > 1000
- Action: KILL IMMEDIATELY

Reason: Creative not resonating, won't improve
```

**4. CVR < 0.5% (After 200 Clicks)**

```
Criteria:
- CVR: < 0.5%
- Clicks: > 200
- Action: KILL IMMEDIATELY

Reason: Funnel/offer problem, won't convert
```

#### Step 2.2: Kill After 3 Days Criteria

**Kill After 3 Days If**:

**1. CPA > Target × 1.5**

```
Criteria:
- CPA: > Target CPA × 1.5
- Days Running: ≥ 3
- No improvement trend
- Action: KILL

Reason: Consistently too expensive
```

**2. ROAS < 1.5 (E-commerce)**

```
Criteria:
- ROAS: < 1.5
- Days Running: ≥ 3
- No improvement trend
- Action: KILL

Reason: Not profitable, unlikely to improve
```

**3. Declining Performance**

```
Criteria:
- CPA increasing 3 days in a row
- OR ROAS decreasing 3 days in a row
- No external factors (seasonality, etc.)
- Action: KILL

Reason: Trend is negative, will get worse
```

**4. Creative Fatigue**

```
Criteria:
- Frequency: > 4.0
- CTR dropped > 50% from peak
- Hook rate dropped > 50% from peak
- Action: KILL (or refresh creative)

Reason: Audience fatigued, performance will decline
```

#### Step 2.3: Create Kill List

**Format**:

```markdown
## KILL LIST

### Immediate Kills (Pause Today)

**Ad Set: Interest Stack - Marketing Tools**

- **Reason**: No conversions after $450 spend
- **Performance**:
  - Spend: $450
  - Conversions: 0
  - CTR: 0.8%
  - Hook Rate: 9%
- **Criteria Met**: No conversions after $500, Hook rate < 10%
- **Action**: PAUSE immediately
- **Estimated Savings**: $50-100/day

**Ad: Hook 3 - Angle 2**

- **Reason**: CPA too high ($280 vs. target $150)
- **Performance**:
  - Spend: $200
  - Conversions: 1 (not statistically significant)
  - CPA: $200
  - Hook Rate: 11%
- **Criteria Met**: CPA > Target × 1.5
- **Action**: PAUSE immediately
- **Estimated Savings**: $30-50/day

---

### Kill After Review (Pause This Week)

**Ad Set: Broad + Expansion**

- **Reason**: CPA trending up, no improvement
- **Performance**:
  - Spend: $300
  - Conversions: 2
  - CPA: $150 (at target, but trending up)
  - Day 1 CPA: $120
  - Day 2 CPA: $140
  - Day 3 CPA: $160
- **Criteria Met**: CPA increasing 3 days in a row
- **Action**: PAUSE if trend continues
- **Monitor**: 1-2 more days

---

**Total to Kill**: 2 immediate, 1 under review
**Budget to Reallocate**: $80-150/day
```

### Phase 3: Apply Scale Criteria (20-30 minutes)

#### Step 3.1: Scale Criteria

**Scale If ALL of the Following**:

**1. CPA < Target × 0.8**

```
Criteria:
- CPA: < Target CPA × 0.8
- Example: Target $150, Actual $120 or less
- Minimum 10 conversions (for statistical significance)

Reason: Performing better than target, room to scale
```

**2. ROAS > 3.0 (E-commerce)**

```
Criteria:
- ROAS: > 3.0
- Consistent over 3+ days

Reason: Highly profitable, should scale
```

**3. LTV:CAC > 3:1**

```
Criteria:
- LTV:CAC Ratio: > 3:1
- Example: LTV $600, CAC $150 = 4:1

Reason: Unit economics support scaling
```

**4. Consistent Performance**

```
Criteria:
- CPA stable or improving over 3+ days
- Conversion volume steady or increasing
- No major fluctuations

Reason: Predictable performance, safe to scale
```

**5. Conversion Volume > 10/day**

```
Criteria:
- Daily conversions: > 10
- Indicates sufficient volume to scale

Reason: Enough volume to support increased budget
```

#### Step 3.2: Scale Methods

**Three Scale Methods**:

**Method 1: Horizontal Scaling**

- **What**: Duplicate winning ad sets to new audiences
- **When**: Audience not saturated (frequency < 3.0)
- **How**: Create new ad sets with LAL 4-6%, new interest stacks
- **Risk**: Low (testing new audiences)
- **Expected**: 50-70% of original performance

**Method 2: Vertical Scaling**

- **What**: Increase budget on winning ad sets
- **When**: Ad set performing well, not saturated
- **How**: Increase budget 20% every 3 days
- **Risk**: Medium (may disrupt learning)
- **Expected**: Performance may dip initially, then stabilize

**Method 3: Creative Scaling**

- **What**: Add new creative variations to winning ad sets
- **When**: Creative fatigue detected or to prevent it
- **How**: Add 2-3 new hooks/angles to winning ad sets
- **Risk**: Low (diversifies creative)
- **Expected**: Extends ad set lifespan, maintains performance

#### Step 3.3: Create Scale List

**Format**:

```markdown
## SCALE LIST

### Horizontal Scaling (Duplicate to New Audiences)

**Ad Set: LAL 1% Purchasers**

- **Performance**:
  - Spend: $500
  - Conversions: 25
  - CPA: $20 (Target: $150) ✅
  - ROAS: 8.5 ✅
  - LTV:CAC: 6:1 ✅
  - Frequency: 2.1 (not saturated) ✅
  - Daily Conversions: 12 ✅
- **Criteria Met**: ALL scale criteria ✅
- **Scale Method**: Horizontal
- **Action**: Duplicate to LAL 2-4%, LAL 4-6%
- **Budget**: $100/day each (2 new ad sets = $200/day)
- **Expected Performance**: CPA $25-30, ROAS 6-7
- **Timeline**: Launch tomorrow

**Ad Set: Interest Stack - Online Business**

- **Performance**:
  - Spend: $400
  - Conversions: 18
  - CPA: $22 (Target: $150) ✅
  - ROAS: 7.2 ✅
  - LTV:CAC: 5.5:1 ✅
  - Frequency: 2.5 ✅
  - Daily Conversions: 9 ✅
- **Criteria Met**: ALL scale criteria ✅
- **Scale Method**: Horizontal
- **Action**: Create new interest stacks (Entrepreneurship, Marketing, etc.)
- **Budget**: $100/day each (2 new ad sets = $200/day)
- **Expected Performance**: CPA $28-35, ROAS 5-6
- **Timeline**: Launch tomorrow

---

### Vertical Scaling (Increase Budget)

**Ad Set: LAL 1% Purchasers**

- **Current Budget**: $100/day
- **Current Performance**: CPA $20, ROAS 8.5
- **Scale Method**: Vertical
- **Action**: Increase budget 20%
- **New Budget**: $120/day (+$20/day)
- **Expected**: CPA may increase to $22-25 initially
- **Timeline**: Implement tomorrow, monitor for 3 days

---

### Creative Scaling (Add New Variations)

**Ad Set: LAL 1% Purchasers**

- **Current Ads**: 3 (Hook 1, Hook 4, Hook 6)
- **Performance**: Hook 1 frequency = 3.2 (approaching fatigue)
- **Scale Method**: Creative
- **Action**: Add 2 new hook variations
- **New Hooks**: Hook 8 (social proof), Hook 11 (problem agitation)
- **Budget**: Keep at $100/day (or $120 if vertical scaling)
- **Expected**: Maintain or improve performance, extend lifespan
- **Timeline**: Creative production 2-3 days, launch next week

---

**Total Scale Actions**: 4 new ad sets, 1 budget increase, 2 new creatives
**Additional Budget Needed**: $400/day (new ad sets) + $20/day (vertical) = $420/day
**Expected Additional Conversions**: 20-30/day
**Expected Additional Revenue**: $6,000-9,000/day (at current ROAS)
```

### Phase 4: Hold/Monitor List (10-15 minutes)

#### Step 4.1: Hold Criteria

**Hold/Monitor If**:

**1. Insufficient Data**

```
Criteria:
- Days running: < 3
- OR Conversions: < 10
- Action: HOLD, monitor for 2-3 more days

Reason: Not enough data for decision
```

**2. Performance at Target**

```
Criteria:
- CPA: Within 20% of target (0.8-1.2×)
- ROAS: At or slightly above target
- Action: HOLD, monitor

Reason: Performing as expected, no action needed
```

**3. Improving Trend**

```
Criteria:
- CPA decreasing over last 3 days
- OR ROAS increasing over last 3 days
- Action: HOLD, let improve

Reason: Trend is positive, may become scaler
```

#### Step 4.2: Create Hold List

**Format**:

```markdown
## HOLD/MONITOR LIST

**Ad Set: LAL 2-3% Purchasers**

- **Status**: HOLD - Insufficient data
- **Performance**:
  - Spend: $150
  - Conversions: 3
  - CPA: $50 (looks good, but low volume)
  - Days Running: 2
- **Reason**: Only 2 days, only 3 conversions
- **Action**: Monitor for 3 more days
- **Decision Point**: Day 5
- **If CPA stays < $120**: Consider scaling
- **If CPA rises > $180**: Consider killing

**Ad Set: Retargeting - Website 30d**

- **Status**: HOLD - At target
- **Performance**:
  - Spend: $200
  - Conversions: 8
  - CPA: $25 (Target: $150) ✅
  - ROAS: 6.0 ✅
  - Daily Conversions: 4 (low volume)
- **Reason**: Performing well but low volume (retargeting)
- **Action**: Keep running, monitor
- **Note**: Retargeting audiences are smaller, low volume is normal

**Ad: Hook 7 - Angle 1**

- **Status**: HOLD - Improving trend
- **Performance**:
  - Spend: $180
  - Conversions: 6
  - CPA: Day 1: $45, Day 2: $35, Day 3: $30 (improving!)
  - Current CPA: $30
- **Reason**: CPA improving, may become winner
- **Action**: Monitor for 2 more days
- **Decision Point**: Day 5
- **If trend continues**: Scale
- **If trend reverses**: Hold or kill

---

**Total Hold**: 3 ad sets/ads
**Action**: Monitor daily, make decision in 2-5 days
```

### Phase 5: Recommendations & Action Plan (15-30 minutes)

#### Step 5.1: Summarize Decisions

**Summary**:

```markdown
# Kill/Scale Decisions Summary

**Analysis Period**: [Date range]
**Total Ad Sets Analyzed**: [X]
**Total Ads Analyzed**: [Y]

## Decisions

**KILL**: 2 ad sets, 1 ad

- Immediate kills: 2
- Review kills: 1
- Budget saved: $80-150/day

**SCALE**: 2 ad sets

- Horizontal scaling: 4 new ad sets
- Vertical scaling: 1 budget increase
- Creative scaling: 2 new creatives
- Additional budget: $420/day
- Expected additional conversions: 20-30/day

**HOLD**: 3 ad sets/ads

- Insufficient data: 1
- At target: 1
- Improving trend: 1
- Decision timeline: 2-5 days

## Net Impact

**Budget Reallocation**:

- Saved from kills: $80-150/day
- Needed for scaling: $420/day
- Net increase: $270-340/day

**Expected Performance**:

- Current conversions: 50/day
- Expected after optimization: 70-80/day (+40-60%)
- Current CPA: $150
- Expected CPA: $120-140 (improvement)
- Current ROAS: 4.0
- Expected ROAS: 4.5-5.0 (improvement)
```

#### Step 5.2: Create Action Plan

**Execution Plan**:

```markdown
# Action Plan

## Immediate Actions (Today)

### 1. Kill Underperformers

**Owner**: @ad-midas or @media-buyer

- [ ] Pause "Interest Stack - Marketing Tools" ad set
- [ ] Pause "Hook 3 - Angle 2" ad
- [ ] Document reason in Ads Manager notes
- [ ] Reallocate budget to winners

**Timeline**: Complete today
**Impact**: Save $80-150/day

---

### 2. Prepare Scale Actions

**Owner**: @media-buyer

- [ ] Create duplicate ad sets for LAL 1% Purchasers
  - [ ] LAL 2-4% Purchasers ($100/day)
  - [ ] LAL 4-6% Purchasers ($100/day)
- [ ] Create duplicate ad sets for Interest Stack
  - [ ] Interest: Entrepreneurship ($100/day)
  - [ ] Interest: Digital Marketing ($100/day)
- [ ] Increase budget on LAL 1% from $100 to $120/day

**Timeline**: Launch tomorrow
**Impact**: +$420/day budget, +20-30 conversions/day

---

### 3. Request New Creatives

**Owner**: @creative-analyst

- [ ] Generate 2 new hooks for LAL 1% ad set
  - [ ] Hook 8 (social proof)
  - [ ] Hook 11 (problem agitation)
- [ ] Create 2 angles for each hook
- [ ] Total: 4 new ads

**Timeline**: Production 2-3 days, launch next week
**Impact**: Prevent creative fatigue, extend ad set lifespan

---

## Short-term Actions (This Week)

### 4. Monitor Hold List

**Owner**: @performance-analyst

- [ ] Daily check on "LAL 2-3% Purchasers"
- [ ] Daily check on "Retargeting - Website 30d"
- [ ] Daily check on "Hook 7 - Angle 1"
- [ ] Make kill/scale decision by Day 5

**Timeline**: Daily monitoring, decision by [Date]

---

### 5. Monitor Scaled Ad Sets

**Owner**: @performance-analyst

- [ ] Monitor new LAL ad sets for first 3 days
- [ ] Monitor new Interest ad sets for first 3 days
- [ ] Monitor budget increase impact on LAL 1%
- [ ] Report performance to @ad-midas daily

**Timeline**: First 3 days after launch

---

## Medium-term Actions (Next 2 Weeks)

### 6. Continuous Optimization

**Owner**: @performance-analyst + @ad-midas

- [ ] Weekly kill/scale review
- [ ] Monitor creative fatigue (frequency > 3.5)
- [ ] Test new audiences as needed
- [ ] Refresh creatives as needed

**Timeline**: Ongoing

---

## Success Metrics

**Week 1 Targets**:

- [ ] Conversions increase 40-60% (50 → 70-80/day)
- [ ] CPA improves 10-20% ($150 → $120-140)
- [ ] ROAS improves 12-25% (4.0 → 4.5-5.0)
- [ ] No budget waste on underperformers

**Week 2 Targets**:

- [ ] Maintain or improve Week 1 performance
- [ ] Identify next round of scalers
- [ ] Continuous creative refresh
```

#### Step 5.3: Handoff to @ad-midas

**Handoff Message**:

```
@ad-midas

📊 Kill/Scale Analysis Complete

**Analysis Period**: Last 7 days
**Data Quality**: SUFFICIENT (50+ conversions)

## Summary

**KILL**: 3 items (2 immediate, 1 review)
- Budget saved: $80-150/day
- Reason: No conversions, high CPA, poor engagement

**SCALE**: 2 ad sets (multiple methods)
- Additional budget needed: $420/day
- Expected additional conversions: 20-30/day
- Methods: Horizontal (4 new ad sets), Vertical (1 increase), Creative (2 new)

**HOLD**: 3 items
- Monitor for 2-5 more days
- Decision pending more data

## Immediate Actions Needed

1. **Pause underperformers** (today)
   - Interest Stack - Marketing Tools
   - Hook 3 - Angle 2

2. **Launch scale actions** (tomorrow)
   - 4 new ad sets (@media-buyer)
   - 1 budget increase (@media-buyer)
   - 2 new creatives (@creative-analyst - 2-3 days)

3. **Monitor** (daily)
   - Hold list items
   - New scaled ad sets

## Expected Impact

**Current Performance**:
- Conversions: 50/day
- CPA: $150
- ROAS: 4.0

**Expected After Optimization**:
- Conversions: 70-80/day (+40-60%)
- CPA: $120-140 (improvement)
- ROAS: 4.5-5.0 (improvement)

## Detailed Report

Full analysis attached: [link/document]

## Next Steps

1. Review and approve kill/scale decisions
2. Execute immediate actions (pause underperformers)
3. Coordinate with @media-buyer for scale execution
4. Coordinate with @creative-analyst for new creatives
5. I will monitor and report daily

Ready for your approval to proceed.

— @performance-analyst 📊
```

## Output Format

### Kill/Scale Report

```markdown
# Kill/Scale Analysis Report

**Date**: [Date]
**Campaign**: [Campaign Name]
**Analysis Period**: [Date Range]
**Data Quality**: [SUFFICIENT / INSUFFICIENT]

---

## Executive Summary

**Total Items Analyzed**: [X] ad sets, [Y] ads

**Decisions**:

- KILL: [X] items
- SCALE: [Y] items
- HOLD: [Z] items

**Expected Impact**:

- Budget saved: $[amount]/day
- Additional budget needed: $[amount]/day
- Expected conversion increase: [X]%
- Expected CPA improvement: [X]%
- Expected ROAS improvement: [X]%

---

## KILL LIST

[Detailed kill list as shown above]

---

## SCALE LIST

[Detailed scale list as shown above]

---

## HOLD/MONITOR LIST

[Detailed hold list as shown above]

---

## Action Plan

[Detailed action plan as shown above]

---

## Approval

**Prepared by**: @performance-analyst
**Date**: [Date]

**Approved by**: @ad-midas
**Date**: ****\_****
**Signature**: ****\_****

---

**Next Review**: [Date] (7 days)
```

## Expert Frameworks Applied

### Jeremy Haynes - KiB/Scale Rules

- Kill it Baby (KiB): Kill losers fast
- Scale Rules: Scale winners aggressively
- 20% budget increases every 3 days

### Brian Moncada - Metric Thresholds

- Hook rate < 10% = kill
- CPA > Target × 1.5 = kill after 3 days
- ROAS > 3.0 = scale

### Alex Hormozi - Unit Economics

- LTV:CAC > 3:1 required for scaling
- Focus on economics, not vanity metrics
- Scale only when profitable

## Common Mistakes to Avoid

❌ **Making decisions too early**

- Need minimum 3 days, ideally 5-7
- Need minimum 50 conversions for confidence

❌ **Not killing losers fast enough**

- Wasting budget on underperformers
- Kill immediately if criteria met

❌ **Scaling too aggressively**

- Max 20% budget increase every 3 days
- Larger increases disrupt algorithm

❌ **Ignoring creative fatigue**

- Frequency > 3.5 = refresh needed
- CTR drop > 30% = fatigue

❌ **Not having clear criteria**

- Emotional decisions vs. data-driven
- Use frameworks consistently

## Success Criteria

✅ **Analysis Complete**:

- All ad sets/ads analyzed
- Kill/scale/hold decisions made
- Recommendations provided
- Action plan created

✅ **Decisions Data-Driven**:

- Based on frameworks (Haynes, Moncada, Hormozi)
- Minimum data requirements met
- Clear criteria applied consistently

✅ **Expected Outcomes**:

- Conversions increase 20-60%
- CPA improves or maintains
- ROAS improves
- Budget waste eliminated

## Related Tasks

- `performance-analyst-monitor-metrics.md` - Ongoing monitoring
- `performance-analyst-diagnose-metrics.md` - Metrics diagnostic
- `ad-midas-scale-optimize.md` - Execute scaling
- `creative-analyst-generate-hooks.md` - New creatives for scaling

---

**Agent**: @performance-analyst  
**Category**: Optimization  
**Complexity**: High  
**Estimated Time**: 1-2 hours  
**Critical**: YES - Determines campaign profitability

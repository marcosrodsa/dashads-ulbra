---
workflow: Scale Optimization Workflow
responsavel: "@ad-midas + @media-buyer + @performance-analyst"
trigger: "Campaign meets scale readiness criteria"
duration: "Ongoing (3-day cycles)"
---

# Scale Optimization Workflow

Systematic process for scaling profitable campaigns using the 20% rule and proven frameworks.

## When to Use

Campaign meets ALL criteria:

- ✅ CPA < Target × 0.8
- ✅ ROAS > 3.0 (if e-commerce)
- ✅ Minimum 50 conversions
- ✅ Minimum 7 days running
- ✅ Frequency < 3.0
- ✅ LTV:CAC > 3:1

## Pre-Scale Validation

### Step 1: Check Scale Readiness

```bash
@ad-midas
*check-scale-readiness

# Or use script:
node scripts/check-scale-readiness.js
```

**Validation Categories**:

1. Data Volume (conversions, days)
2. Performance (CPA, ROAS)
3. Consistency (daily conversions, stability)
4. Tracking (pixel health, EMQ)
5. Economics (LTV:CAC)
6. Creative (freshness, fatigue)

**Decision**:

- ✅ READY: Proceed to Phase 1
- ⚠️ READY WITH CAUTION: Proceed but monitor closely
- ❌ NOT READY: Fix issues first

---

## Phase 1: Baseline Documentation (Day 0)

### Step 2: Document Current Performance

```bash
@performance-analyst
*diagnose-metrics
```

**Document Baseline**:

- Current daily budget: $**\_\_**
- Current CPA: $**\_\_**
- Current ROAS: **\_\_**
- Current conversions/day: **\_\_**
- Current frequency: **\_\_**
- Current audience size: **\_\_**

**Purpose**: Compare against this baseline after each scale increment

---

## Phase 2: Select Scale Method (Day 0)

### Step 3: Determine Scale Method

**Three Methods**:

#### A. Vertical Scaling (Budget Increase)

**When to Use**:

- Frequency < 2.5
- Large audience (1M+)
- Consistent daily conversions
- No creative fatigue

**How**:

- Increase budget 20% every 3 days
- Monitor CPA closely
- Stop if CPA increases > 20%

#### B. Horizontal Scaling (Audience Expansion)

**When to Use**:

- Frequency 2.5-3.5
- Audience approaching saturation
- Strong creative performance
- Multiple winning ad sets

**How**:

- Duplicate to new audiences (LAL 2-3%, interests, broad)
- Keep budget same per ad set
- Test 3-5 new audiences

#### C. Creative Scaling (More Variations)

**When to Use**:

- Frequency > 3.0
- Creative fatigue detected
- Need more volume
- Proven hooks/angles

**How**:

- Add 3-6 new creative variations
- Use winning hooks with new angles
- Distribute budget across variations

**Decision Matrix**:

```
Frequency < 2.5 → Vertical
Frequency 2.5-3.5 + Large audience → Vertical
Frequency 2.5-3.5 + Small audience → Horizontal
Frequency > 3.0 → Creative
Multiple winning ad sets → Horizontal
```

---

## Phase 3: Execute Scale (Day 1)

### Step 4A: Vertical Scaling

```bash
@media-buyer
# In Ads Manager:
1. Identify winning ad sets (CPA < Target × 0.8)
2. Increase budget by 20%
3. Document new budget
```

**Example**:

- Current: $100/day
- New: $120/day (+$20)

**Rules**:

- Maximum 20% increase per 3 days
- Never increase more than 50% in one week
- Monitor for 3 days before next increase

### Step 4B: Horizontal Scaling

```bash
@media-buyer
# Use audience expansion script:
node scripts/expand-audience.js

# Then in Ads Manager:
1. Duplicate winning ad set
2. Change audience to expansion
3. Keep same budget as original
4. Launch
```

**Expansion Options**:

- LAL 1% → LAL 2-3%, LAL 4-5%
- Interest stack → Related interests
- Narrow → Broad
- Single country → Tier 1 countries

**Budget**:

- Same budget as original ad set
- Example: If LAL 1% has $100/day, give LAL 2-3% $100/day

### Step 4C: Creative Scaling

```bash
@creative-analyst
*generate-hooks

# Then:
@media-buyer
1. Create 3-6 new ad variations
2. Add to existing ad sets
3. Distribute budget evenly
```

**Creative Variations**:

- Keep winning hooks
- Test new angles
- Try different visuals
- Refresh copy

---

## Phase 4: Monitor (Day 1-3)

### Step 5: Daily Monitoring

```bash
@performance-analyst
*monitor-campaigns

# Check daily:
node scripts/monitor-campaigns.js
```

**Monitor Every 24 Hours**:

- CPA vs baseline
- ROAS vs baseline
- Conversions/day
- Frequency
- Spend pacing

**Alert Thresholds**:

- 🚨 CPA increases > 30% → Pause scale
- ⚠️ CPA increases 20-30% → Monitor closely
- ✅ CPA increases < 20% → Continue

### Step 6: 3-Day Evaluation

```bash
@performance-analyst
*diagnose-metrics
```

**Compare to Baseline**:

- CPA change: **\_**%
- ROAS change: **\_**%
- Conversions/day change: **\_**%
- Frequency change: **\_**

**Decision**:

- ✅ **CPA within 20% of baseline**: Scale again
- ⚠️ **CPA increased 20-30%**: Hold, monitor 3 more days
- ❌ **CPA increased > 30%**: Reduce budget back

---

## Phase 5: Iterate (Day 4+)

### Step 7: Continue Scaling or Adjust

**If Metrics Hold** (CPA within 20%):

```bash
# Repeat Phase 3-4:
1. Increase budget another 20%
2. Monitor for 3 days
3. Evaluate
4. Repeat
```

**Scaling Cadence**:

- Day 1: $100/day
- Day 4: $120/day (+20%)
- Day 7: $144/day (+20%)
- Day 10: $173/day (+20%)
- Day 13: $208/day (+20%)

**If Metrics Degrade**:

```bash
# Reduce budget:
1. Decrease 10-20%
2. Monitor for 3 days
3. Find stable point
```

---

## Phase 6: Optimize Budget Allocation (Weekly)

### Step 8: Reallocate Budget

```bash
@performance-analyst
# Use budget allocation script:
node scripts/allocate-budget.js
```

**Performance-Based Allocation**:

- Best performers get more budget
- Worst performers get less or paused
- Rebalance weekly

**Example**:

```
Ad Set A: CPA $50, ROAS 6.0 → Increase to $200/day
Ad Set B: CPA $80, ROAS 4.5 → Keep at $150/day
Ad Set C: CPA $120, ROAS 3.0 → Reduce to $100/day
Ad Set D: CPA $200, ROAS 1.5 → Pause
```

---

## Phase 7: Continuous Expansion (Ongoing)

### Step 9: Expand Audiences Monthly

```bash
@media-buyer
# Every 2-4 weeks:
node scripts/expand-audience.js
```

**Expansion Sequence**:

1. **Week 1-2**: LAL 1% Purchasers
2. **Week 3-4**: LAL 2-3% Purchasers
3. **Week 5-6**: Interest stacks
4. **Week 7-8**: Broad + Advantage+
5. **Week 9+**: Geographic expansion

### Step 10: Refresh Creative Monthly

```bash
@creative-analyst
# Every 2-4 weeks:
*generate-hooks
```

**Creative Refresh Cadence**:

- Test 3-6 new hooks every 2 weeks
- Rotate creatives when frequency > 3.0
- Build creative library (20+ variations)

---

## Scale Limits & Plateaus

### Recognizing Plateaus

**Signs**:

- CPA consistently increases despite optimizations
- Frequency > 3.5 across all ad sets
- Audience saturation
- Diminishing returns on budget increases

**Actions**:

1. **Pause scaling** - Hold current budget
2. **Refresh creative** - New hooks/angles
3. **Expand audiences** - New targeting
4. **Improve funnel** - Optimize landing page/offer
5. **Wait** - Let audience refresh (2-4 weeks)

### Maximum Scale Potential

```bash
# Use economics script to estimate:
node scripts/calculate-economics.js
```

**Based on LTV:CAC**:

- LTV:CAC 5:1+ → Scale to $100K+/month
- LTV:CAC 4:1 → Scale to $50K/month
- LTV:CAC 3:1 → Scale to $25K/month
- LTV:CAC < 3:1 → Limited scaling potential

---

## Success Criteria

✅ **Week 1**:

- Budget increased 20-40%
- CPA within 20% of baseline
- No creative fatigue

✅ **Month 1**:

- Budget doubled
- CPA stable or improved
- 3+ winning ad sets
- 2+ audience expansions

✅ **Month 3**:

- Budget 3-5x original
- Consistent performance
- Diversified audiences
- Rotating creative library

---

## Common Mistakes to Avoid

❌ **Scaling too fast**

- Never increase > 20% per 3 days
- Causes CPA spikes and instability

❌ **Scaling on insufficient data**

- Need minimum 50 conversions
- Need minimum 7 days running

❌ **Ignoring frequency**

- Don't scale if frequency > 3.0
- Refresh creative first

❌ **Not monitoring daily**

- Check metrics every 24 hours
- Catch issues early

❌ **Scaling losing campaigns**

- Only scale winners (CPA < Target × 0.8)
- Fix performance before scaling

❌ **Forgetting creative refresh**

- Creative fatigues as you scale
- Refresh every 2-4 weeks

---

## Emergency Procedures

### If CPA Spikes During Scale

**Immediate Actions**:

1. **Reduce budget** back to previous level
2. **Check tracking** - Ensure pixel firing
3. **Check frequency** - If > 3.5, refresh creative
4. **Analyze funnel** - Check for conversion issues
5. **Wait 3 days** - Let stabilize before trying again

### If ROAS Drops During Scale

**Immediate Actions**:

1. **Pause new ad sets** - Keep only proven winners
2. **Check attribution** - Verify conversion tracking
3. **Analyze audience quality** - May be reaching lower-intent users
4. **Tighten targeting** - Go back to core audiences
5. **Improve offer** - Add urgency/scarcity

---

## Handoff Points

**@ad-midas → @media-buyer**:

- After Step 3 (scale method selected)
- Deliverable: Scale plan

**@media-buyer → @performance-analyst**:

- After Step 4 (scale executed)
- Deliverable: New budget levels

**@performance-analyst → @media-buyer**:

- After Step 6 (evaluation complete)
- Deliverable: Continue/hold/reduce recommendation

---

## Tools & Resources

**Scripts**:

- `check-scale-readiness.js` - Validate readiness
- `diagnose-metrics.js` - Monitor performance
- `allocate-budget.js` - Optimize allocation
- `expand-audience.js` - Find expansion opportunities
- `calculate-economics.js` - Estimate scale potential
- `monitor-campaigns.js` - Daily monitoring

**Frameworks**:

- Jeremy Haynes: 20% rule, KiB rules
- Brian Moncada: Andromeda Method
- Alex Hormozi: Unit economics, LTV:CAC

---

## Scale Timeline Example

**Starting Point**: $1,000/day, CPA $150, 10 conversions/day

| Week | Action               | Budget | Expected CPA | Expected Conv/Day |
| ---- | -------------------- | ------ | ------------ | ----------------- |
| 1    | Baseline             | $1,000 | $150         | 10                |
| 2    | +20% vertical        | $1,200 | $165         | 11                |
| 3    | +20% vertical        | $1,440 | $172         | 12                |
| 4    | Horizontal expansion | $2,440 | $165         | 21                |
| 5    | +20% vertical        | $2,928 | $172         | 24                |
| 6    | Creative refresh     | $2,928 | $158         | 26                |
| 7    | +20% vertical        | $3,514 | $165         | 30                |
| 8    | Horizontal expansion | $4,514 | $165         | 38                |

**Result**: $1K → $4.5K/day in 8 weeks (4.5x growth)

---

## Related Resources

- Task: `ad-midas-scale-optimize.md` (if created)
- Workflow: `campaign-launch-workflow.md`
- Checklist: `scale-readiness-checklist.md` (if created)
- Framework: Jeremy Haynes Scale Rules

---
checklist: Scale Readiness Checklist
type: validation
usage: "Use before scaling any campaign"
---

# Scale Readiness Checklist

## Quick Validation

```bash
# Run automated readiness check:
node scripts/check-scale-readiness.js
```

**Overall Status**: [ ] READY [ ] READY WITH CAUTION [ ] NOT READY

---

## Category 1: Data Volume ✅

### Minimum Conversions

- [ ] **≥ 50 conversions** total
- [ ] **≥ 5 conversions/day** average
- [ ] **Consistent volume** (not sporadic)

**Current**:

- Total conversions: **\_**
- Conversions/day: **\_**
- Days with conversions: **\_**

**Status**: [ ] PASS [ ] FAIL

---

### Minimum Days Running

- [ ] **≥ 7 days** running
- [ ] **Out of learning phase** (50 conversions)
- [ ] **Stable performance** (no major fluctuations)

**Current**:

- Days running: **\_**
- Learning phase: [ ] Complete [ ] In progress
- Performance stability: [ ] Stable [ ] Volatile

**Status**: [ ] PASS [ ] FAIL

---

## Category 2: Performance Metrics ✅

### CPA (Cost Per Acquisition)

- [ ] **CPA < Target × 0.8** (20% below target)
- [ ] **CPA trending stable or down**
- [ ] **No sudden spikes** in last 7 days

**Current**:

- Current CPA: $**\_**
- Target CPA: $**\_**
- Ratio: **\_** (Target: < 0.8)
- 7-day trend: [ ] Down [ ] Stable [ ] Up

**Status**: [ ] PASS [ ] FAIL

---

### ROAS (Return on Ad Spend) - E-commerce

- [ ] **ROAS ≥ 3.0** (or your target)
- [ ] **ROAS trending stable or up**
- [ ] **Consistent across days**

**Current**:

- Current ROAS: **\_**
- Target ROAS: **\_**
- 7-day trend: [ ] Up [ ] Stable [ ] Down

**Status**: [ ] PASS [ ] FAIL [ ] N/A

---

### Frequency

- [ ] **Frequency < 3.0** (not saturated)
- [ ] **Frequency trending stable**
- [ ] **No creative fatigue detected**

**Current**:

- Current frequency: **\_**
- 7-day trend: [ ] Down [ ] Stable [ ] Up
- Creative age: **\_** days

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

## Category 3: Consistency ✅

### Daily Conversion Consistency

- [ ] **≥ 5 conversions/day** average
- [ ] **Conversions every day** (not sporadic)
- [ ] **Predictable volume**

**Current**:

- Avg conversions/day: **\_**
- Days with 0 conversions: **\_**
- Coefficient of variation: **\_** (Target: < 0.5)

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

### CPA Stability

- [ ] **CPA variation < 30%** day-to-day
- [ ] **No sudden spikes** (> 50% increase)
- [ ] **Predictable costs**

**Current**:

- CPA standard deviation: $**\_**
- CPA coefficient of variation: **\_** (Target: < 0.3)
- Largest daily spike: **\_**%

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

## Category 4: Tracking & Data Quality ✅

### Pixel Health

```bash
# Run tracking audit:
node scripts/audit-tracking.js
```

- [ ] **Pixel is ACTIVE**
- [ ] **No errors in Events Manager**
- [ ] **Purchase event firing correctly**
- [ ] **Test conversion successful**

**Current**:

- Pixel status: [ ] Active [ ] Warning [ ] Error
- Last event received: **\_**
- Events in last 24h: **\_**

**Status**: [ ] PASS [ ] FAIL

---

### Event Match Quality (EMQ)

- [ ] **EMQ ≥ 6.0** (good quality)
- [ ] **Customer information parameters** present
- [ ] **CAPI active** (if applicable)

**Current**:

- EMQ Score: **\_** (Target: ≥ 6.0)
- Parameters matched: **\_**/7
- CAPI status: [ ] Active [ ] Inactive

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

### Attribution Window

- [ ] **7-day click, 1-day view** (recommended)
- [ ] **Attribution window documented**
- [ ] **Conversion lag accounted for**

**Current**:

- Attribution window: **\_**
- Avg time to conversion: **\_**
- Delayed conversions: **\_**%

**Status**: [ ] PASS [ ] FAIL

---

## Category 5: Unit Economics ✅

### LTV:CAC Ratio

```bash
# Calculate economics:
node scripts/calculate-economics.js
```

- [ ] **LTV:CAC ≥ 3:1** (minimum for scaling)
- [ ] **LTV:CAC ≥ 4:1** (ideal for aggressive scaling)
- [ ] **LTV calculated correctly** (not just first purchase)

**Current**:

- LTV: $**\_**
- CAC: $**\_**
- LTV:CAC Ratio: **\_** (Target: ≥ 3:1)

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

### Payback Period

- [ ] **Payback < 6 months** (ideal)
- [ ] **Payback < 12 months** (acceptable)
- [ ] **Cash flow sustainable**

**Current**:

- Payback period: **\_** months
- Monthly cash flow: $**\_**
- Can sustain scale: [ ] Yes [ ] No

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

### Profit Margin

- [ ] **Profit margin > 20%** (after all costs)
- [ ] **Margin sustainable at scale**
- [ ] **COGS accounted for**

**Current**:

- Revenue per customer: $**\_**
- Total cost per customer: $**\_**
- Profit margin: **\_**%

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

## Category 6: Creative Health ✅

### Creative Freshness

- [ ] **Creative < 14 days old** (fresh)
- [ ] **No fatigue detected**
- [ ] **Hook rate > 15%**

**Current**:

- Creative age: **\_** days
- Hook rate: **\_**%
- Fatigue score: **\_**/100

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

### Creative Performance

- [ ] **Hook rate > 15%**
- [ ] **CTR > 1.5%**
- [ ] **Multiple winning variations** (3+)

**Current**:

- Hook rate: **\_**%
- CTR: **\_**%
- Winning ads: **\_**

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

### Creative Library

- [ ] **6+ ad variations** active
- [ ] **3+ hooks** tested
- [ ] **Backup creative** ready

**Current**:

- Active ads: **\_**
- Hooks tested: **\_**
- Backup ads ready: **\_**

**Status**: [ ] PASS [ ] WARNING [ ] FAIL

---

## Overall Readiness Score

### Category Scores

| Category    | Status            | Weight | Score     |
| ----------- | ----------------- | ------ | --------- |
| Data Volume | [ ] PASS [ ] FAIL | 20%    | **\_**/20 |
| Performance | [ ] PASS [ ] FAIL | 25%    | **\_**/25 |
| Consistency | [ ] PASS [ ] FAIL | 15%    | **\_**/15 |
| Tracking    | [ ] PASS [ ] FAIL | 15%    | **\_**/15 |
| Economics   | [ ] PASS [ ] FAIL | 20%    | **\_**/20 |
| Creative    | [ ] PASS [ ] FAIL | 5%     | **\_**/5  |

**Total Score**: **\_**/100

---

### Readiness Level

**90-100**: ✅ **READY TO SCALE AGGRESSIVELY**

- All systems go
- Scale 20% every 3 days
- Expand audiences
- Increase creative variations

**70-89**: ⚠️ **READY WITH CAUTION**

- Can scale, but monitor closely
- Scale 10-15% every 3 days
- Address warnings first
- Have contingency plan

**50-69**: ❌ **NOT READY - FIX ISSUES FIRST**

- Do not scale yet
- Fix critical issues
- Improve metrics
- Re-evaluate in 7 days

**< 50**: 🚨 **CRITICAL ISSUES - PAUSE & FIX**

- Pause campaign if needed
- Fix all critical issues
- May need to restart campaign
- Seek expert help

---

## Critical Blockers (Must Fix Before Scaling)

### Blocker 1: Insufficient Data

- [ ] < 50 conversions
- [ ] < 7 days running

**Action**: Wait for more data, do not scale yet

---

### Blocker 2: Poor Performance

- [ ] CPA > Target × 1.5
- [ ] ROAS < 2.0 (e-commerce)

**Action**: Optimize performance before scaling

---

### Blocker 3: Tracking Issues

- [ ] Pixel not firing
- [ ] EMQ < 4.0
- [ ] Missing conversions

**Action**: Fix tracking immediately

---

### Blocker 4: Bad Economics

- [ ] LTV:CAC < 2:1
- [ ] Payback > 12 months
- [ ] Negative profit margin

**Action**: Improve economics or don't scale

---

### Blocker 5: Creative Fatigue

- [ ] Frequency > 4.0
- [ ] Hook rate < 10%
- [ ] Creative > 21 days old

**Action**: Refresh creative before scaling

---

## Pre-Scale Action Items

### If READY (Score 90-100)

- [ ] Document baseline metrics
- [ ] Set up daily monitoring
- [ ] Prepare scale plan
- [ ] Brief team on scale strategy
- [ ] Set alert thresholds
- [ ] **Proceed to scale** ✅

---

### If READY WITH CAUTION (Score 70-89)

- [ ] Address all warnings
- [ ] Set up enhanced monitoring
- [ ] Prepare contingency plans
- [ ] Scale conservatively (10-15%)
- [ ] Review daily
- [ ] **Proceed with caution** ⚠️

---

### If NOT READY (Score 50-69)

- [ ] Identify all issues
- [ ] Create fix plan
- [ ] Implement fixes
- [ ] Wait 7 days
- [ ] Re-evaluate readiness
- [ ] **Do not scale yet** ❌

---

### If CRITICAL (Score < 50)

- [ ] Pause campaign (if needed)
- [ ] Fix critical issues immediately
- [ ] Audit entire setup
- [ ] Consider restarting campaign
- [ ] Get expert help
- [ ] **Do not scale** 🚨

---

## Scale Method Selection

### Based on Readiness Profile

**High Score + Low Frequency** (< 2.5):
→ **Vertical Scaling** (increase budget 20%)

**High Score + Medium Frequency** (2.5-3.5):
→ **Horizontal Scaling** (expand audiences)

**High Score + High Frequency** (> 3.0):
→ **Creative Scaling** (add variations)

**Medium Score**:
→ **Conservative Scaling** (10-15% increases)

**Low Score**:
→ **No Scaling** (fix issues first)

---

## Monitoring Plan Post-Scale

### Daily (First 7 Days)

- [ ] Check CPA vs baseline
- [ ] Check ROAS vs baseline
- [ ] Check frequency
- [ ] Check conversions/day
- [ ] Check spend pacing
- [ ] Review any alerts

### 3-Day Evaluation

- [ ] Run full metrics analysis
- [ ] Compare to baseline
- [ ] Make kill/keep/scale decision
- [ ] Document learnings
- [ ] Plan next increment

### Weekly Optimization

- [ ] Reallocate budget
- [ ] Refresh creative (if needed)
- [ ] Expand audiences (if ready)
- [ ] Update scale plan

---

## Emergency Stop Criteria

**STOP SCALING IMMEDIATELY IF**:

- [ ] CPA increases > 30%
- [ ] ROAS drops > 20%
- [ ] Frequency > 4.0
- [ ] Tracking breaks
- [ ] No conversions for 48 hours
- [ ] Spend > 2× budget without conversions

---

## Sign-Off

### Performance Analyst Review

- [ ] All metrics reviewed
- [ ] Readiness score calculated
- [ ] Recommendation documented

**Score**: **\_**/100  
**Recommendation**: [ ] READY [ ] READY WITH CAUTION [ ] NOT READY  
**Analyst**: ************\_\_\_************  
**Date**: ************\_\_\_************

---

### Ad Midas Review

- [ ] Economics validated
- [ ] Scale strategy defined
- [ ] Monitoring plan in place
- [ ] Contingency plans ready

**Approved**: [ ] Yes [ ] No [ ] With conditions  
**Ad Midas**: ************\_\_\_************  
**Date**: ************\_\_\_************

---

### Final Decision

**SCALE**: [ ] YES [ ] NO [ ] WAIT

**If YES**:

- Scale method: [ ] Vertical [ ] Horizontal [ ] Creative
- Initial increase: **\_**%
- Monitoring frequency: [ ] Daily [ ] Twice daily
- Review date: ************\_\_\_************

**If NO**:

- Issues to fix: ************\_\_\_************
- Re-evaluation date: ************\_\_\_************

**If WAIT**:

- Waiting for: ************\_\_\_************
- Expected date: ************\_\_\_************

---

## Related Resources

- Script: `check-scale-readiness.js` - Automated readiness check
- Script: `diagnose-metrics.js` - Performance analysis
- Script: `calculate-economics.js` - Unit economics
- Script: `audit-tracking.js` - Tracking validation
- Script: `detect-fatigue.js` - Creative fatigue
- Template: `scale-plan-template.md`
- Workflow: `scale-optimization-workflow.md`
- Checklist: `pre-launch-checklist.md`

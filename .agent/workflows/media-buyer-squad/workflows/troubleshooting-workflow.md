---
workflow: Troubleshooting Workflow
responsavel: "@performance-analyst + @pixel-specialist + @ad-midas"
trigger: "Campaign issues detected"
duration: "1-4 hours (depending on issue)"
---

# Troubleshooting Workflow

Systematic process for diagnosing and fixing campaign issues.

## Common Issues & Solutions

### Issue 1: No Conversions After $500 Spend

#### Diagnosis Steps

**Step 1: Check Tracking**

```bash
@pixel-specialist
*audit-tracking

# Or use script:
node scripts/audit-tracking.js
```

**Check**:

- ✅ Pixel is firing
- ✅ Purchase event is configured
- ✅ Event Match Quality > 6.0
- ✅ CAPI is active
- ✅ Test event shows in Events Manager

**If tracking is broken**:
→ Go to **Solution 1A: Fix Tracking**

**If tracking is working**:
→ Go to **Step 2**

**Step 2: Check Funnel**

```bash
@performance-analyst
*analyze-funnel

# Or use script:
node scripts/analyze-funnel.js
```

**Check**:

- Click-through rate (CTR)
- Landing page view rate
- Add to cart rate
- Purchase rate

**Identify bottleneck**:

- Low CTR (< 1%) → Creative problem
- Low LP view rate (< 80%) → Page load issue
- Low ATC rate (< 15%) → Offer/page problem
- Low purchase rate (< 40%) → Checkout issue

**Solutions**:

- Low CTR → **Solution 1B: Fix Creative**
- Low LP view → **Solution 1C: Fix Page Load**
- Low ATC → **Solution 1D: Fix Offer/Page**
- Low purchase → **Solution 1E: Fix Checkout**

#### Solution 1A: Fix Tracking

```bash
@pixel-specialist
*setup-tracking
```

**Actions**:

1. Verify pixel installation
2. Test purchase event
3. Check CAPI integration
4. Validate event match quality
5. Test end-to-end conversion

**Timeline**: 1-2 hours

#### Solution 1B: Fix Creative

```bash
@creative-analyst
*generate-hooks
```

**Actions**:

1. Generate new hooks (6-9)
2. Test different angles
3. Improve hook rate (target: > 15%)
4. Launch new creative

**Timeline**: 2-3 days

#### Solution 1C: Fix Page Load

**Actions**:

1. Test page speed (target: < 3s)
2. Optimize images
3. Remove unnecessary scripts
4. Use CDN
5. Test on mobile

**Timeline**: 2-4 hours

#### Solution 1D: Fix Offer/Page

**Actions**:

1. Strengthen value proposition
2. Add social proof
3. Clarify benefits
4. Add urgency/scarcity
5. Improve product presentation

**Timeline**: 1-2 days

#### Solution 1E: Fix Checkout

**Actions**:

1. Simplify checkout (reduce fields)
2. Add trust badges
3. Show shipping costs early
4. Offer guest checkout
5. Test mobile checkout

**Timeline**: 1-2 days

---

### Issue 2: CPA Too High (> Target × 2.0)

#### Diagnosis Steps

**Step 1: Check Performance Data**

```bash
@performance-analyst
*diagnose-metrics
```

**Analyze**:

- CTR: Is traffic quality good?
- Hook rate: Is creative engaging?
- CVR: Is funnel converting?
- Frequency: Is audience saturated?

**Step 2: Identify Root Cause**

| Symptom                | Root Cause          | Solution    |
| ---------------------- | ------------------- | ----------- |
| Low CTR (< 1%)         | Poor creative       | Solution 2A |
| Low CVR (< 1%)         | Poor funnel         | Solution 2B |
| High frequency (> 3.5) | Audience saturation | Solution 2C |
| High CPC               | Poor targeting      | Solution 2D |

#### Solution 2A: Improve Creative

```bash
@creative-analyst
*generate-hooks
```

**Actions**:

1. Test new hooks
2. Improve hook rate (> 15%)
3. Test new angles
4. Refresh creative

**Timeline**: 2-3 days

#### Solution 2B: Improve Funnel

```bash
@performance-analyst
*analyze-funnel
```

**Actions**:

1. Identify drop-off points
2. Fix bottlenecks
3. Optimize landing page
4. Improve checkout

**Timeline**: 1-3 days

#### Solution 2C: Refresh Audience

```bash
@media-buyer
# Pause saturated audiences
# Launch new audiences
node scripts/expand-audience.js
```

**Actions**:

1. Pause high-frequency ad sets
2. Test new audiences (LAL, interests, broad)
3. Refresh creative
4. Monitor frequency

**Timeline**: 1 day

#### Solution 2D: Improve Targeting

```bash
@media-buyer
# Refine targeting
```

**Actions**:

1. Narrow audience (exclude low-intent)
2. Test LAL audiences
3. Use interest stacking
4. Try Advantage+ targeting

**Timeline**: 1 day

---

### Issue 3: ROAS Too Low (< Target)

#### Diagnosis Steps

**Step 1: Check Attribution**

```bash
@performance-analyst
# Use attribution script:
node scripts/analyze-attribution.js
```

**Check**:

- Attribution window (7-day click, 1-day view)
- Conversion lag time
- Cross-device conversions

**Step 2: Check Economics**

```bash
@ad-midas
# Use economics script:
node scripts/calculate-economics.js
```

**Check**:

- LTV:CAC ratio
- Payback period
- Unit economics

**Solutions**:

- Attribution issue → **Solution 3A**
- Economics issue → **Solution 3B**
- Performance issue → **Solution 3C**

#### Solution 3A: Fix Attribution

**Actions**:

1. Use 7-day click attribution
2. Account for conversion lag
3. Track assisted conversions
4. Consider LTV, not just first purchase

**Timeline**: Immediate (reporting change)

#### Solution 3B: Improve Economics

**Actions**:

1. Increase product price
2. Add upsells/cross-sells
3. Improve LTV (subscriptions, repeat purchases)
4. Reduce COGS
5. Lower CPA

**Timeline**: 1-4 weeks

#### Solution 3C: Improve Performance

**Actions**:

1. Improve conversion rate
2. Lower CPA
3. Increase AOV
4. Optimize funnel

**Timeline**: 1-2 weeks

---

### Issue 4: Frequency Too High (> 3.5)

#### Solution: Refresh Creative + Expand Audiences

```bash
# Step 1: Refresh creative
@creative-analyst
*generate-hooks

# Step 2: Expand audiences
@media-buyer
node scripts/expand-audience.js
```

**Actions**:

1. Generate 6-9 new hooks
2. Launch new creative
3. Pause high-frequency ads
4. Expand to new audiences
5. Monitor frequency

**Timeline**: 2-3 days

---

### Issue 5: Pixel Not Firing

#### Diagnosis Steps

**Step 1: Check Installation**

```bash
@pixel-specialist
# Use Meta Pixel Helper (Chrome extension)
# Check Events Manager
```

**Check**:

- Pixel code is on page
- No JavaScript errors
- Events are firing
- Parameters are correct

**Step 2: Test Events**

```bash
@pixel-specialist
# In Events Manager:
1. Go to Test Events
2. Enter website URL
3. Perform test conversion
4. Verify event appears
```

#### Solutions

**If pixel not installed**:

1. Install pixel code in `<head>`
2. Verify with Pixel Helper
3. Test events

**If pixel installed but not firing**:

1. Check for JavaScript errors
2. Verify pixel ID is correct
3. Check for ad blockers
4. Test in incognito mode

**If events not configured**:

1. Add event code to conversion pages
2. Configure standard events
3. Test each event
4. Verify parameters

**Timeline**: 1-2 hours

---

### Issue 6: Ads Not Delivering

#### Diagnosis Steps

**Step 1: Check Ad Status**

```bash
@media-buyer
# In Ads Manager, check for:
- Rejected ads
- Learning phase
- Low budget
- Audience too small
```

**Step 2: Identify Issue**

| Status       | Issue              | Solution    |
| ------------ | ------------------ | ----------- |
| Rejected     | Policy violation   | Solution 6A |
| Learning     | Insufficient data  | Solution 6B |
| Low delivery | Budget too low     | Solution 6C |
| Low delivery | Audience too small | Solution 6D |

#### Solution 6A: Fix Policy Violation

**Actions**:

1. Review rejection reason
2. Fix policy violation
3. Request review
4. Resubmit ad

**Common violations**:

- Prohibited content
- Misleading claims
- Too much text in image
- Landing page issues

**Timeline**: 1-24 hours

#### Solution 6B: Exit Learning Phase

**Actions**:

1. Wait for 50 conversions
2. Don't edit campaign during learning
3. Ensure sufficient budget
4. Give 7 days minimum

**Timeline**: 3-7 days

#### Solution 6C: Increase Budget

**Actions**:

1. Increase to minimum $50/day per ad set
2. Use CBO (Campaign Budget Optimization)
3. Consolidate ad sets if needed

**Timeline**: Immediate

#### Solution 6D: Expand Audience

**Actions**:

1. Broaden targeting
2. Remove exclusions
3. Use Advantage+ targeting
4. Test LAL audiences

**Timeline**: Immediate

---

### Issue 7: Creative Fatigue

#### Solution: Follow Creative Refresh Workflow

```bash
# Use creative refresh workflow:
@creative-analyst + @media-buyer
# See: workflows/creative-refresh-workflow.md
```

**Quick Actions**:

1. Detect fatigue (frequency > 3.5, hook rate < 10%)
2. Generate new hooks (6-9)
3. Launch new creative
4. Pause fatigued ads
5. Monitor performance

**Timeline**: 2-3 days

---

## Troubleshooting Decision Tree

```
Issue Detected
    ↓
No Conversions?
    ├─ YES → Check tracking → Broken? → Fix tracking
    │                      → Working? → Check funnel → Fix bottleneck
    └─ NO → CPA too high?
            ├─ YES → Check metrics → Low CTR? → Fix creative
            │                     → Low CVR? → Fix funnel
            │                     → High freq? → Refresh creative + audience
            └─ NO → ROAS too low?
                    ├─ YES → Check attribution → Fix attribution window
                    │                         → Check economics → Improve LTV or lower CAC
                    └─ NO → Frequency high?
                            ├─ YES → Refresh creative + expand audiences
                            └─ NO → Ads not delivering?
                                    ├─ YES → Check status → Fix issue
                                    └─ NO → Monitor and optimize
```

---

## Emergency Contacts

**Critical Issues** (pause campaigns immediately):

- Tracking completely broken
- Spending with 0 conversions (> $1000)
- CPA > Target × 3.0
- Pixel data breach

**Escalation**:

1. @pixel-specialist (tracking issues)
2. @performance-analyst (performance issues)
3. @ad-midas (strategic issues)
4. External: Meta support, developer

---

## Prevention Checklist

✅ **Daily**:

- Monitor campaigns (use `monitor-campaigns.js`)
- Check tracking (Events Manager)
- Review performance (CPA, ROAS, frequency)

✅ **Weekly**:

- Audit tracking (use `audit-tracking.js`)
- Analyze funnel (use `analyze-funnel.js`)
- Review creative performance

✅ **Monthly**:

- Full system audit
- Review all workflows
- Update documentation

---

## Tools & Resources

**Scripts**:

- `audit-tracking.js` - Diagnose tracking issues
- `diagnose-metrics.js` - Analyze performance
- `analyze-funnel.js` - Find conversion bottlenecks
- `analyze-attribution.js` - Check attribution
- `detect-fatigue.js` - Detect creative fatigue
- `monitor-campaigns.js` - Daily monitoring

**Workflows**:

- `creative-refresh-workflow.md`
- `campaign-launch-workflow.md`
- `scale-optimization-workflow.md`

**External Tools**:

- Meta Pixel Helper (Chrome extension)
- Meta Events Manager
- Google PageSpeed Insights
- GTmetrix (page speed)

---

## Related Resources

- Task: `pixel-specialist-audit-tracking.md` (if created)
- Task: `performance-analyst-analyze-funnel.md` (if created)
- Checklist: `pre-launch-checklist.md`

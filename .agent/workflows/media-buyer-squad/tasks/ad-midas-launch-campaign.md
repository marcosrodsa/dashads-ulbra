---
task: Launch Campaign
responsavel: "@ad-midas"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - campaign_strategy: Strategy document from *define-strategy
  - tracking_validation: Tracking setup confirmation from @pixel-specialist
  - creative_assets: Creative assets from @creative-analyst
  - campaign_setup: Campaign setup confirmation from @media-buyer
Saida: |
  - launch_status: Campaign launch status (LIVE, PAUSED, ERROR)
  - campaign_ids: Meta Ads campaign IDs
  - monitoring_dashboard: Link to monitoring dashboard
  - next_steps: Immediate monitoring actions
Checklist:
  - "[ ] Review and validate strategy"
  - "[ ] Confirm tracking is working (@pixel-specialist)"
  - "[ ] Verify creative quality (@creative-analyst)"
  - "[ ] Validate campaign setup (@media-buyer)"
  - "[ ] Run pre-launch checklist"
  - "[ ] Set campaigns to ACTIVE"
  - "[ ] Monitor initial delivery (first 2 hours)"
  - "[ ] Verify tracking is working post-launch"
  - "[ ] Handoff to @performance-analyst for monitoring"
---

# \*launch-campaign

Execute campaign launch after all validation checks pass. This is the final step before going live with paid traffic.

## Purpose

Ensure all components are properly configured and validated before spending budget. This task orchestrates the final validation, launch execution, and initial monitoring.

## When to Use

- After completing \*define-strategy
- After @pixel-specialist confirms tracking setup
- After @creative-analyst delivers creative assets
- After @media-buyer completes campaign setup
- When all pre-launch checklist items are complete

## Prerequisites

### 1. Strategy Validated

- [ ] Unit economics confirmed (LTV:CAC > 3:1)
- [ ] Funnel type selected and justified
- [ ] Campaign structure defined
- [ ] Budget allocated
- [ ] Success metrics defined

### 2. Tracking Validated

- [ ] Meta Pixel installed and firing
- [ ] CAPI integrated (event match quality > 6.0)
- [ ] All conversion events configured
- [ ] Test conversions successful
- [ ] No errors in Events Manager

### 3. Creative Assets Ready

- [ ] Creative brief approved
- [ ] Hooks generated and tested
- [ ] Copy written using frameworks
- [ ] Creative matrix complete (hooks × angles)
- [ ] Meta ad policies compliant

### 4. Campaign Setup Complete

- [ ] Campaigns created in Meta Ads Manager
- [ ] Ad sets configured with audiences
- [ ] Ads uploaded with creatives
- [ ] UTM parameters set
- [ ] Placements configured

## Process

### Phase 1: Pre-Launch Validation (30-60 minutes)

#### Step 1.1: Review Strategy

**Action**: Review the campaign strategy document

**Validation Points**:

```yaml
Strategy Review:
  - Product/Offer: [Clearly defined]
  - Target Audience: [Well-researched]
  - Unit Economics:
      Target CPA: $[amount]
      LTV: $[amount]
      LTV:CAC: [ratio]:1 (Must be > 3:1)
      Payback: [days] days
  - Funnel Type: [Justified selection]
  - Campaign Structure: [Matches strategy]
  - Budget: $[amount]/day (Sufficient for testing)
```

**Decision Point**:

- ✅ All validated → Continue
- ❌ Issues found → Fix before proceeding

#### Step 1.2: Validate Tracking with @pixel-specialist

**Action**: Request tracking validation

```
@pixel-specialist

Please confirm tracking setup:
1. Pixel firing on all pages?
2. CAPI integrated with event match quality > 6.0?
3. All conversion events configured?
4. Test conversions successful?
5. Any errors in Events Manager?
```

**Expected Response**:

```
✅ Tracking Validation Complete

Meta Pixel: ACTIVE
- Pixel ID: [ID]
- Installation: [Method]
- Pages: All pages ✅

Standard Events:
- PageView ✅
- ViewContent ✅
- AddToCart ✅
- InitiateCheckout ✅
- Purchase ✅

CAPI:
- Status: ACTIVE ✅
- Event Match Quality: [score] (> 6.0) ✅
- Deduplication: ENABLED ✅

Test Results:
- Test Purchase: TRACKED ✅
- Browser Pixel: FIRING ✅
- CAPI: SENDING ✅

Status: READY FOR LAUNCH ✅
```

**Decision Point**:

- ✅ All checks pass → Continue
- ❌ Any issues → @pixel-specialist must fix before launch

#### Step 1.3: Verify Creative Quality with @creative-analyst

**Action**: Review creative assets

```
@creative-analyst

Please confirm creative assets:
1. Creative brief approved?
2. Hooks follow proven frameworks?
3. Copy uses selected framework (PAS/AIDA/BAB/STORY)?
4. Creative matrix complete?
5. Meta ad policies compliant?
```

**Expected Response**:

```
✅ Creative Assets Approved

Creative Brief: APPROVED ✅
- Target audience defined
- Key message clear
- Hook strategy defined
- Copy framework: [PAS/AIDA/BAB/STORY]

Hooks: [X] variations ✅
- Pattern Interrupt: [count]
- Curiosity Gap: [count]
- Social Proof: [count]
- Problem Agitation: [count]

Copy: COMPLETE ✅
- Framework applied correctly
- CTA clear and compelling
- Brand voice consistent

Creative Matrix: [X] ads ✅
- [X] hooks × [Y] angles = [Z] ads

Meta Policies: COMPLIANT ✅
- No prohibited content
- No misleading claims
- Proper disclosures

Status: READY FOR LAUNCH ✅
```

**Decision Point**:

- ✅ All approved → Continue
- ❌ Issues found → @creative-analyst must fix before launch

#### Step 1.4: Validate Campaign Setup with @media-buyer

**Action**: Review campaign configuration

```
@media-buyer

Please confirm campaign setup:
1. Campaign structure matches strategy?
2. All audiences configured with exclusions?
3. Budget allocated correctly?
4. Bids set appropriately?
5. UTM parameters correct?
6. Ads previewed and look good?
```

**Expected Response**:

```
✅ Campaign Setup Complete

Campaign: [Campaign Name]
- Objective: Conversions ✅
- Budget: $[amount]/day (CBO) ✅
- Schedule: Continuous ✅

Ad Sets: [X] total ✅
Prospecting:
- LAL 1% Purchasers ($[budget]/day) ✅
- LAL 2-3% Purchasers ($[budget]/day) ✅
- Interest Stack - Primary ($[budget]/day) ✅
- Broad + Expansion ($[budget]/day) ✅

Retargeting:
- Website Visitors 30d ($[budget]/day) ✅
- Engaged 90d ($[budget]/day) ✅

Audiences: CONFIGURED ✅
- Exclusions set (existing customers)
- Overlap checked (< 25%)

Ads: [X] variations ✅
- Creatives uploaded
- Copy added
- UTM parameters set
- Previewed across placements

Tracking: VERIFIED ✅
- Pixel linked
- Optimization event: [Purchase/Lead]

Status: READY FOR LAUNCH ✅
```

**Decision Point**:

- ✅ All configured → Continue
- ❌ Issues found → @media-buyer must fix before launch

#### Step 1.5: Run Pre-Launch Checklist

**Action**: Execute complete pre-launch checklist

**Use**: `squads/media-buyer-squad/checklists/pre-launch-checklist.md`

**Critical Items**:

```
Strategy:
- [ ] LTV:CAC > 3:1 ✅
- [ ] Funnel type justified ✅
- [ ] Budget sufficient ✅

Tracking:
- [ ] Pixel firing ✅
- [ ] CAPI active (EMQ > 6.0) ✅
- [ ] Test conversions successful ✅

Creative:
- [ ] Hooks follow frameworks ✅
- [ ] Copy compelling ✅
- [ ] Meta policies compliant ✅

Campaign:
- [ ] Structure matches strategy ✅
- [ ] Audiences configured ✅
- [ ] UTM parameters set ✅

Monitoring:
- [ ] Dashboard configured ✅
- [ ] Team briefed ✅
- [ ] Escalation process defined ✅
```

**Decision Point**:

- ✅ All items checked → APPROVED FOR LAUNCH
- ❌ Any unchecked → LAUNCH DELAYED (fix issues first)

### Phase 2: Launch Execution (5-10 minutes)

#### Step 2.1: Final Team Briefing

**Action**: Brief all agents on launch

**Briefing Message**:

```
🚀 CAMPAIGN LAUNCH BRIEFING

Campaign: [Campaign Name]
Launch Time: [Date/Time]
Budget: $[amount]/day

All Agents:
- @pixel-specialist: Monitor Events Manager for tracking issues
- @creative-analyst: Stand by for creative performance data
- @media-buyer: Monitor campaign delivery and budget pacing
- @performance-analyst: Begin metrics monitoring (first 2 hours)

Monitoring Schedule:
- First 2 hours: Check every 30 minutes
- First 24 hours: Check every 4 hours
- Day 2-3: Check twice daily
- Day 4-7: Daily review

Escalation:
- Tracking issues → @pixel-specialist (immediate)
- Delivery issues → @media-buyer (immediate)
- Performance concerns → @performance-analyst (daily)
- Strategic decisions → @ad-midas (as needed)

Let's launch! 🚀
```

#### Step 2.2: Set Campaigns to ACTIVE

**Action**: Activate campaigns in Meta Ads Manager

**Execution Steps**:

1. Log into Meta Ads Manager
2. Navigate to Campaigns tab
3. Select campaign(s) to launch
4. Change status from PAUSED to ACTIVE
5. Confirm activation
6. Note campaign IDs and activation time

**Confirmation**:

```
✅ CAMPAIGNS ACTIVATED

Campaign ID: [ID]
Campaign Name: [Name]
Status: ACTIVE
Activation Time: [Timestamp]
Budget: $[amount]/day
Objective: Conversions
Optimization Event: [Purchase/Lead]

Ad Sets Active: [X]
Ads Active: [Y]

Next: Monitor delivery for next 2 hours
```

#### Step 2.3: Verify Initial Delivery

**Action**: Check that ads are delivering (first 15 minutes)

**Checks**:

```
Delivery Status:
- [ ] Campaign status: ACTIVE
- [ ] Ad sets status: ACTIVE (not "Learning Limited")
- [ ] Ads status: ACTIVE (not "Rejected")
- [ ] Impressions: Starting to accumulate
- [ ] No errors or warnings in Ads Manager
```

**Common Issues**:

**If ads not delivering**:

- Check payment method
- Check account status
- Check ad approval status
- Check audience size (too small?)
- Check budget (too low?)

**If "Learning Limited"**:

- Normal for first few hours
- Monitor for 24 hours
- If persists, may need to consolidate ad sets

**If ads rejected**:

- Review rejection reason
- Fix policy violation
- Resubmit for review

### Phase 3: Initial Monitoring (First 2 Hours)

#### Step 3.1: Monitor Delivery Metrics

**Action**: Check every 30 minutes for first 2 hours

**Metrics to Monitor**:

```
Delivery Health:
- Impressions: [Accumulating?]
- Reach: [Growing?]
- Frequency: [< 1.5 in first hours]
- Amount Spent: [Pacing correctly?]

Engagement:
- Clicks: [Any clicks yet?]
- CTR: [Early indicator]
- CPC: [Within expected range?]

Issues:
- [ ] No errors in Ads Manager
- [ ] No warnings in Diagnostics
- [ ] Budget pacing correctly
```

**Expected First 2 Hours**:

- Impressions: 1,000-10,000 (depends on budget)
- Clicks: 10-100 (depends on CTR)
- Conversions: Possibly 0-2 (too early to judge)
- Spend: ~8-10% of daily budget

#### Step 3.2: Verify Tracking is Working

**Action**: Confirm events are firing post-launch

**Checks with @pixel-specialist**:

```
@pixel-specialist

Please confirm tracking post-launch:
1. PageView events firing?
2. Any Purchase/Lead events yet?
3. Event match quality still > 6.0?
4. Any errors in Events Manager?
```

**Expected Response**:

```
✅ Tracking Working Post-Launch

PageView Events: FIRING ✅
- Count: [X] events
- No errors

Purchase/Lead Events: [X] events
- May be 0 in first hours (normal)
- If clicks but no events, investigate

Event Match Quality: [score] ✅
- Still > 6.0

Events Manager: NO ERRORS ✅

Status: TRACKING HEALTHY ✅
```

**If Issues Found**:

- @pixel-specialist investigates immediately
- May need to pause campaigns if critical
- Fix before resuming

#### Step 3.3: Document Initial Performance

**Action**: Record baseline metrics

**Initial Performance Log**:

```
🚀 Campaign Launch - Initial Performance

Launch Time: [Timestamp]
Time Elapsed: 2 hours

Delivery:
- Impressions: [count]
- Reach: [count]
- Frequency: [number]
- Amount Spent: $[amount]

Engagement:
- Clicks: [count]
- CTR: [%]
- CPC: $[amount]

Conversion:
- Conversions: [count] (may be 0)
- CPA: [N/A if 0 conversions]

Tracking:
- Events firing: ✅
- No errors: ✅

Issues:
- [None / List any issues]

Status: [HEALTHY / NEEDS ATTENTION]

Next: Continue monitoring for 24 hours
```

### Phase 4: First 24 Hours Monitoring

#### Step 4.1: Set Monitoring Schedule

**Action**: Establish monitoring cadence

**Monitoring Schedule**:

```
First 24 Hours:
- Hour 2: ✅ Complete
- Hour 6: Check metrics
- Hour 12: Check metrics
- Hour 18: Check metrics
- Hour 24: Full review

Metrics to Track:
- Spend vs. budget
- Impressions, clicks, CTR
- Conversions (if any)
- CPA (if conversions)
- Frequency
- Any errors/warnings
```

#### Step 4.2: Handoff to @performance-analyst

**Action**: Transfer monitoring responsibility

**Handoff Message**:

```
@performance-analyst

Campaign is LIVE and initial checks complete.

Campaign: [Campaign Name]
Launch Time: [Timestamp]
Budget: $[amount]/day

Initial Performance (2 hours):
- Spend: $[amount]
- Impressions: [count]
- Clicks: [count]
- CTR: [%]
- Conversions: [count]

Your Responsibilities:
1. Monitor metrics every 4-6 hours for first 24 hours
2. Check for tracking issues
3. Identify early winners/losers
4. Report any critical issues immediately
5. Prepare for kill/scale decisions (Day 3-5)

Use: *monitor-metrics

Report to: @ad-midas (daily summary)

Escalate if:
- Tracking breaks (conversion = 0 after $500)
- CPA > Target × 2.0
- No impressions/clicks
- Any critical errors

Good luck! 📊
```

#### Step 4.3: Set Up Monitoring Dashboard

**Action**: Configure metrics dashboard

**Dashboard Metrics**:

```
Campaign Overview:
- Status: [ACTIVE/PAUSED]
- Budget: $[amount]/day
- Spend: $[amount] / $[daily budget]
- Budget Pacing: [%]

Acquisition:
- Conversions: [count]
- CPA: $[amount]
- Target CPA: $[amount]
- ROAS: [ratio]

Engagement:
- Impressions: [count]
- Clicks: [count]
- CTR: [%]
- Frequency: [number]

Conversion:
- Landing Page Views: [count]
- CVR: [%]

Tracking Health:
- Events Firing: [✅/❌]
- Event Match Quality: [score]
- Errors: [count]

Alerts:
- Budget pacing off > 20%
- CPA > Target × 1.5
- Frequency > 3.5
- Tracking errors
```

### Phase 5: First Week Monitoring Plan

#### Day 1-2: Learning Phase

**Goal**: Let algorithm learn, gather data

**Actions**:

- Monitor delivery and tracking
- Check for errors
- Ensure budget pacing correctly
- **DO NOT** make changes yet

**Red Flags**:

- No conversions after $500 spend
- Tracking broken
- Ads not delivering
- Frequency > 4.0

#### Day 3-5: Initial Optimization

**Goal**: Identify early winners and losers

**Actions**:

- @performance-analyst analyzes data
- Identify ad sets with no conversions
- Identify ad sets with CPA > Target × 1.5
- Prepare kill/scale recommendations

**Decision Point**:

- Minimum 50 conversions ideal for decisions
- Can make early kills if obvious failures
- Wait for more data before scaling

#### Day 5-7: First Optimization Round

**Goal**: Kill losers, scale winners

**Actions**:

- @performance-analyst: `*apply-kill-scale`
- @ad-midas: `*scale-optimize`
- Kill underperformers
- Scale top performers
- Add new creative variations

### Phase 6: Contingency Plans

#### If Tracking Breaks

**Symptoms**:

- Conversions = 0 after significant spend
- Events not showing in Events Manager
- Event match quality drops

**Action Plan**:

1. @pixel-specialist investigates immediately
2. @ad-midas pauses campaigns if necessary
3. Fix tracking before resuming
4. Test conversions before reactivating

**Timeline**: Fix within 2-4 hours or pause

#### If No Conversions After $500

**Symptoms**:

- $500+ spent
- 0 conversions
- Tracking confirmed working

**Action Plan**:

1. @pixel-specialist: Audit tracking (`*audit-tracking`)
2. @performance-analyst: Analyze funnel (`*analyze-funnel`)
3. @creative-analyst: Review hooks (hook rate < 15%?)
4. @ad-midas: Decide to fix or kill

**Possible Issues**:

- Tracking problem (most common)
- Poor creative (low hook rate/CTR)
- Wrong audience
- Funnel problem (landing page)
- Offer problem

#### If CPA Too High

**Symptoms**:

- CPA > Target × 1.5
- Conversions happening but too expensive

**Action Plan**:

1. @performance-analyst: Diagnose issue (`*diagnose-metrics`)
2. Identify problem area:
   - Targeting (wrong audience?)
   - Creative (low CTR/hook rate?)
   - Funnel (low CVR?)
3. @ad-midas: Coordinate fix with appropriate agent

**Optimization Options**:

- Improve creative (if low CTR)
- Refine targeting (if wrong audience)
- Optimize landing page (if low CVR)
- Adjust bid strategy

#### If Budget Pacing Off

**Symptoms**:

- Spending too fast (>120% of target)
- Spending too slow (<80% of target)

**Action Plan**:

**Too Fast**:

- Check bid strategy (too aggressive?)
- Check audience size (too broad?)
- Consider cost cap bid strategy
- May need to reduce budget

**Too Slow**:

- Check audience size (too narrow?)
- Check bid strategy (too conservative?)
- Check ad quality score
- Consider increasing bids
- May need to expand audiences

## Output Format

### Launch Confirmation

```markdown
🚀 CAMPAIGN LAUNCHED SUCCESSFULLY

**Campaign Details**:

- Campaign ID: [ID]
- Campaign Name: [Name]
- Launch Time: [Timestamp]
- Status: ACTIVE ✅

**Configuration**:

- Objective: Conversions
- Budget: $[amount]/day (CBO)
- Optimization Event: [Purchase/Lead]
- Ad Sets: [X] active
- Ads: [Y] active

**Validation**:

- Strategy: ✅ Validated (LTV:CAC = [ratio]:1)
- Tracking: ✅ Working (EMQ = [score])
- Creative: ✅ Approved ([X] variations)
- Setup: ✅ Complete

**Initial Delivery** (First 2 hours):

- Impressions: [count]
- Clicks: [count]
- CTR: [%]
- Conversions: [count]
- Spend: $[amount]

**Monitoring**:

- Dashboard: [Link]
- Assigned to: @performance-analyst
- Schedule: Every 4-6 hours (first 24h)

**Next Steps**:

1. @performance-analyst monitors metrics
2. Daily reports to @ad-midas
3. First optimization: Day 3-5
4. Kill/scale decisions: Day 5-7

**Escalation**:

- Tracking issues → @pixel-specialist
- Performance concerns → @performance-analyst
- Strategic decisions → @ad-midas

Status: MONITORING PHASE 📊
```

### If Launch Delayed

```markdown
⏸️ CAMPAIGN LAUNCH DELAYED

**Reason**: [Issue description]

**Issues Found**:

1. [Issue 1]
2. [Issue 2]
3. [Issue 3]

**Required Actions**:

- [ ] [Action 1] - Assigned to: [@agent]
- [ ] [Action 2] - Assigned to: [@agent]
- [ ] [Action 3] - Assigned to: [@agent]

**Timeline**: [Estimated fix time]

**Next Steps**:

1. Fix issues listed above
2. Re-run pre-launch checklist
3. Schedule new launch time

Status: PENDING FIXES ⚠️
```

## Expert Frameworks Applied

### Jeremy Haynes - Launch Readiness

- Validate all "constants" before launch
- Don't change multiple variables post-launch
- Let algorithm learn (3-5 days minimum)

### Brian Moncada - Systematic Approach

- Follow checklist religiously
- Monitor systematically
- Make data-driven decisions only

### Alex Hormozi - Economics First

- Never launch without validated unit economics
- LTV:CAC > 3:1 is non-negotiable
- Track economics from day 1

## Common Mistakes to Avoid

❌ **Launching without tracking validation**

- Always test conversions before launch
- Verify CAPI is working (EMQ > 6.0)

❌ **Making changes too early**

- Wait 3-5 days for algorithm to learn
- Don't panic if no conversions in first hours

❌ **Ignoring early warning signs**

- No impressions = delivery issue
- No clicks = creative problem
- Clicks but no conversions = tracking or funnel issue

❌ **Not monitoring first 24 hours**

- Critical to catch issues early
- Small problems become expensive quickly

❌ **Launching without team alignment**

- All agents must know their monitoring responsibilities
- Escalation process must be clear

## Success Criteria

✅ **Launch Successful**:

- All pre-launch checks passed
- Campaigns activated without errors
- Ads delivering within first hour
- Tracking working (events firing)
- No critical issues in first 2 hours
- Monitoring dashboard active
- Team briefed and aligned

✅ **First 24 Hours Healthy**:

- Impressions accumulating
- Clicks happening (CTR > 0.5%)
- Budget pacing correctly (80-120%)
- Tracking working (no errors)
- At least 1 conversion (ideal, but not required)

✅ **First Week on Track**:

- Minimum 10 conversions
- CPA within 2× target
- No major tracking issues
- At least 1 winning ad set identified
- Ready for first optimization

## Related Tasks

- `ad-midas-define-strategy.md` - Strategy definition (prerequisite)
- `ad-midas-scale-optimize.md` - Scaling after launch
- `pixel-specialist-setup-tracking.md` - Tracking setup (prerequisite)
- `creative-analyst-create-briefs.md` - Creative development (prerequisite)
- `performance-analyst-monitor-metrics.md` - Post-launch monitoring
- `performance-analyst-apply-kill-scale.md` - Optimization decisions

## Related Workflows

- `campaign-launch-workflow.md` - Complete launch workflow

## Related Checklists

- `pre-launch-checklist.md` - Pre-launch validation

---

**Agent**: @ad-midas  
**Category**: Campaign Execution  
**Complexity**: High  
**Estimated Time**: 1-2 hours (validation + launch) + ongoing monitoring  
**Critical**: YES - This is the go/no-go decision point

# Campaign Launch Workflow

**Purpose**: End-to-end workflow for launching a new paid traffic campaign from strategy to go-live.

**Squad**: media-buyer-squad  
**Lead Agent**: @ad-midas  
**Estimated Duration**: 5-7 days

---

## Workflow Overview

```
Strategy → Tracking → Creative → Setup → Launch → Monitor
   ↓          ↓          ↓         ↓        ↓        ↓
ad-midas   pixel    creative   media   ad-midas  performance
          specialist analyst   buyer            analyst
```

---

## Phase 1: Strategic Planning (Day 1-2)

### Agent: @ad-midas

**Task**: `*define-strategy`

**Actions**:

1. Gather product/offer information
2. Define target audience
3. Calculate unit economics (CAC, LTV, LTV:CAC)
4. Select optimal funnel type
5. Define campaign structure
6. Validate economics (LTV:CAC > 3:1)

**Deliverables**:

- Funnel type selection with justification
- Unit economics validation
- Campaign structure (campaigns, ad sets, ads)
- Budget allocation plan

**Success Criteria**:

- [ ] LTV:CAC ratio > 3:1
- [ ] Funnel type selected
- [ ] Campaign structure defined
- [ ] Budget allocated

**Handoff**: Strategy approved → @pixel-specialist

---

## Phase 2: Tracking Setup (Day 2-3)

### Agent: @pixel-specialist

**Task**: `*setup-tracking`

**Actions**:

1. Install Meta Pixel on all pages
2. Configure standard events (PageView, Purchase, Lead, etc.)
3. Set up Conversions API (CAPI)
4. Configure event parameters
5. Test all conversion events
6. Validate event match quality (> 6.0)
7. Set attribution window

**Deliverables**:

- Meta Pixel installed and firing
- CAPI integrated and tested
- All events configured and validated
- Event match quality > 6.0
- Test conversions verified

**Success Criteria**:

- [ ] Pixel installed on all pages
- [ ] Standard events firing correctly
- [ ] CAPI integrated (event match quality > 6.0)
- [ ] Test conversions tracked successfully
- [ ] No errors in Events Manager

**Handoff**: Tracking validated → @creative-analyst

---

## Phase 3: Creative Development (Day 3-5)

### Agent: @creative-analyst

**Task**: `*create-brief` + `*generate-hooks` + `*generate-copy`

**Actions**:

1. Create creative brief based on strategy
2. Generate 10+ hook variations
3. Select 2-3 creative angles
4. Generate copy using frameworks (PAS, AIDA, BAB, STORY)
5. Create DSL structure (if VSL)
6. Develop creative matrix (hooks × angles)
7. Provide production guidelines

**Deliverables**:

- Creative brief with target audience and messaging
- 3 hook variations (tested types)
- 2 creative angles
- Full copy for each variation
- DSL structure (if applicable)
- Creative matrix (6-9 ad variations)

**Success Criteria**:

- [ ] Creative brief approved by @ad-midas
- [ ] Hooks use proven frameworks
- [ ] Copy follows selected framework
- [ ] Creative matrix defined (hooks × angles)
- [ ] Production guidelines clear

**Handoff**: Creatives ready → @media-buyer

---

## Phase 4: Campaign Setup (Day 5-6)

### Agent: @media-buyer

**Task**: `*setup-campaign`

**Actions**:

1. Create campaigns in Meta Ads Manager
2. Configure campaign objectives and budgets (CBO)
3. Set up ad sets with audiences
4. Configure exclusion audiences
5. Set bid strategies
6. Upload creative assets
7. Write ad copy (primary text, headline, description)
8. Set UTM parameters for tracking
9. Configure placements
10. Preview ads across placements

**Deliverables**:

- Campaigns created in Meta Ads Manager
- Ad sets configured with audiences
- Ads uploaded with creatives and copy
- Tracking parameters set (UTM)
- Placements configured

**Success Criteria**:

- [ ] Campaign structure matches strategy
- [ ] All audiences configured with exclusions
- [ ] Creatives uploaded and previewed
- [ ] UTM parameters set correctly
- [ ] Tracking pixels verified on ads
- [ ] Budget and bids set appropriately

**Handoff**: Campaign ready → @ad-midas for final validation

---

## Phase 5: Pre-Launch Validation (Day 6)

### Agent: @ad-midas

**Task**: `*launch-campaign` (validation phase)

**Actions**:

1. Review campaign structure
2. Validate tracking with @pixel-specialist
3. Verify creative quality with @creative-analyst
4. Check budget allocation
5. Confirm optimization events
6. Review targeting and exclusions
7. Final approval

**Pre-Launch Checklist**:

- [ ] Strategy validated (unit economics, funnel type)
- [ ] Tracking verified (@pixel-specialist)
  - [ ] Pixel firing on all pages
  - [ ] CAPI integrated (event match quality > 6.0)
  - [ ] Test conversions successful
- [ ] Creatives approved (@creative-analyst)
  - [ ] Hooks follow frameworks
  - [ ] Copy is compelling
  - [ ] Creative matrix complete
- [ ] Campaign setup correct (@media-buyer)
  - [ ] Structure matches strategy
  - [ ] Audiences configured properly
  - [ ] Budget allocated correctly
  - [ ] UTM parameters set
- [ ] Monitoring dashboard configured
- [ ] Team notified of launch

**Decision Point**:

- ✅ All checks pass → Proceed to launch
- ❌ Issues found → Fix and re-validate

---

## Phase 6: Launch (Day 7)

### Agent: @ad-midas

**Task**: `*launch-campaign` (execution phase)

**Actions**:

1. Set campaigns to ACTIVE
2. Monitor initial delivery
3. Check for any errors or warnings
4. Verify tracking is working
5. Confirm budget pacing
6. Set up monitoring alerts

**Launch Checklist**:

- [ ] Campaigns set to ACTIVE
- [ ] Ads delivering (check status)
- [ ] No errors in Ads Manager
- [ ] Tracking working (check Events Manager)
- [ ] Budget pacing correctly
- [ ] Monitoring dashboard active

**Immediate Monitoring (First 2 hours)**:

- Check ad delivery status
- Verify pixel events firing
- Monitor for any errors
- Check initial engagement (impressions, clicks)

**Handoff**: Campaign live → @performance-analyst for monitoring

---

## Phase 7: Initial Monitoring (Day 7-10)

### Agent: @performance-analyst

**Task**: `*monitor-metrics`

**Actions**:

1. Monitor key metrics (CPA, CTR, CVR, ROAS)
2. Check for any tracking issues
3. Identify early winners and losers
4. Monitor creative fatigue (frequency)
5. Track budget pacing
6. Report daily to @ad-midas

**Monitoring Schedule**:

- **First 24 hours**: Check every 4 hours
- **Day 2-3**: Check twice daily
- **Day 4-7**: Check daily
- **After Day 7**: Apply kill/scale rules

**Key Metrics to Monitor**:

- **Acquisition**: CPA, CPL, Conversions
- **Engagement**: CTR, Hook Rate, Frequency
- **Conversion**: CVR, ROAS
- **Creative**: Creative Fatigue Index

**Early Warning Signs**:

- 🔴 No conversions after $500 spend → Investigate immediately
- 🔴 Hook rate < 10% → @creative-analyst refresh hooks
- 🔴 Conversion = 0 → @pixel-specialist audit tracking
- ⚠️ CPA > Target × 1.5 → Monitor closely

**Handoff**: After 3-5 days → @performance-analyst `*apply-kill-scale`

---

## Phase 8: Optimization (Day 10+)

### Agent: @performance-analyst + @ad-midas

**Tasks**:

- `*apply-kill-scale` (@performance-analyst)
- `*scale-optimize` (@ad-midas)

**Actions**:

1. Analyze performance data (minimum 50 conversions ideal)
2. Apply kill/scale rules
3. Kill underperformers
4. Scale winners
5. Add new creative variations
6. Expand audiences
7. Optimize budget allocation

**Kill Criteria**:

- No conversions after $500 spend
- CPA > Target × 1.5 (after 3 days)
- Hook rate < 10%
- CVR < 1%

**Scale Criteria**:

- CPA < Target × 0.8
- ROAS > 3.0
- LTV:CAC > 3:1
- Consistent performance (3+ days)

**Scale Methods**:

- **Horizontal**: Duplicate to new audiences
- **Vertical**: Increase budget 20% every 3 days
- **Creative**: Add new variations to winners

---

## Success Metrics

### Launch Success (Day 7):

- [ ] Campaign live without errors
- [ ] Tracking working correctly
- [ ] Ads delivering
- [ ] Budget pacing correctly

### Week 1 Success (Day 7-14):

- [ ] Minimum 10 conversions
- [ ] CPA within 2× target
- [ ] No major tracking issues
- [ ] At least 1 winning ad set

### Month 1 Success (Day 30):

- [ ] CPA at or below target
- [ ] ROAS > 2.0
- [ ] Scaled to target budget
- [ ] Positive ROI

---

## Roles & Responsibilities

| Agent                | Primary Responsibility               | Key Tasks                                          |
| -------------------- | ------------------------------------ | -------------------------------------------------- |
| @ad-midas            | Strategic oversight, launch, scaling | Define strategy, validate, launch, scale decisions |
| @pixel-specialist    | Tracking infrastructure              | Pixel setup, CAPI, event validation                |
| @creative-analyst    | Creative development                 | Hooks, copy, briefs, DSL                           |
| @media-buyer         | Campaign execution                   | Setup campaigns, audiences, ads                    |
| @performance-analyst | Data analysis, optimization          | Monitor metrics, kill/scale rules                  |

---

## Communication Protocol

### Daily Standups (During Launch Week):

- **When**: Every morning
- **Who**: All agents
- **What**: Status updates, blockers, next steps

### Status Updates:

- **@pixel-specialist**: Tracking health report
- **@creative-analyst**: Creative performance
- **@media-buyer**: Campaign delivery status
- **@performance-analyst**: Metrics summary
- **@ad-midas**: Strategic decisions

### Escalation:

- **Critical issues** (tracking broken, campaign errors): Immediate notification to @ad-midas
- **Performance concerns** (CPA spiking): Daily report to @ad-midas
- **Optimization opportunities**: Report when identified

---

## Tools & Resources

- **Meta Ads Manager**: Campaign management
- **Meta Events Manager**: Tracking validation
- **Meta Pixel Helper**: Debugging
- **Google Analytics**: Secondary tracking
- **Monitoring Dashboard**: Real-time metrics

---

## Contingency Plans

### If tracking breaks:

1. @pixel-specialist investigates immediately
2. @ad-midas pauses campaigns if necessary
3. Fix tracking before resuming

### If no conversions after $500:

1. @pixel-specialist audits tracking
2. @performance-analyst analyzes funnel
3. @creative-analyst reviews hooks
4. @ad-midas decides: fix or kill

### If CPA too high:

1. @performance-analyst diagnoses issue
2. Identify: targeting, creative, or funnel problem
3. @ad-midas coordinates fix with appropriate agent

---

**Version**: 1.0.0  
**Squad**: media-buyer-squad  
**Last Updated**: 2026-02-10

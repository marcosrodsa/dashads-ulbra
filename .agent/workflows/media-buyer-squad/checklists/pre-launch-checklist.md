# Pre-Launch Checklist

**Campaign**: ************\_\_\_************  
**Launch Date**: ************\_\_\_************  
**Squad Lead**: @ad-midas  
**Reviewed by**: ************\_\_\_************

---

## ✅ Phase 1: Strategy Validation

**Owner**: @ad-midas

- [ ] **Product/Offer Defined**
  - [ ] Product name and description clear
  - [ ] Price point confirmed
  - [ ] Unique value proposition articulated
  - [ ] Guarantee/bonuses defined (if applicable)

- [ ] **Target Audience Validated**
  - [ ] Demographics defined
  - [ ] Psychographics documented
  - [ ] Pain points identified
  - [ ] Desired outcomes clear
  - [ ] Awareness level determined

- [ ] **Unit Economics Calculated**
  - [ ] Target CPA defined: $****\_\_\_****
  - [ ] LTV calculated: $****\_\_\_****
  - [ ] LTV:CAC Ratio: **\_**:1 (Must be > 3:1) ✅
  - [ ] Payback period: **\_** days (Target: < 90 days)
  - [ ] Profit margins validated

- [ ] **Funnel Type Selected**
  - [ ] Funnel type: [Tripwire / VSL / Webinar / Challenge]
  - [ ] Justification documented
  - [ ] Funnel structure defined

- [ ] **Campaign Structure Defined**
  - [ ] Prospecting campaign structure
  - [ ] Retargeting campaign structure
  - [ ] Ad set breakdown documented
  - [ ] Budget allocation plan
  - [ ] Creative matrix defined (hooks × angles)

- [ ] **Budget Confirmed**
  - [ ] Total budget: $****\_\_\_****
  - [ ] Daily budget: $****\_\_\_****
  - [ ] Testing budget sufficient (min $500-1000)
  - [ ] Budget approved by stakeholders

---

## ✅ Phase 2: Tracking Infrastructure

**Owner**: @pixel-specialist

### Meta Pixel Setup

- [ ] **Pixel Installation**
  - [ ] Meta Pixel ID: ************\_\_\_************
  - [ ] Pixel installed on all pages
  - [ ] Installation method: [Direct / GTM / Platform]
  - [ ] Pixel Helper shows pixel firing
  - [ ] No duplicate pixels detected

- [ ] **Standard Events Configured**
  - [ ] PageView (fires on all pages)
  - [ ] ViewContent (product/content pages)
  - [ ] AddToCart (add to cart action)
  - [ ] InitiateCheckout (checkout page)
  - [ ] Purchase (thank you page) **CRITICAL**
  - [ ] Lead (form submission) **CRITICAL**
  - [ ] Other: ************\_\_\_************

- [ ] **Event Parameters**
  - [ ] value (revenue/lead value)
  - [ ] currency (USD, EUR, etc.)
  - [ ] content_ids (product IDs)
  - [ ] content_name (product names)
  - [ ] content_type (product/product_group)

### Conversions API (CAPI)

- [ ] **CAPI Integration**
  - [ ] CAPI set up and active
  - [ ] Access token configured
  - [ ] Server events sending successfully
  - [ ] Event match quality score: **\_** (Must be > 6.0) ✅

- [ ] **User Data Parameters**
  - [ ] Email (hashed with SHA256)
  - [ ] Phone (hashed with SHA256)
  - [ ] fbp cookie
  - [ ] fbc cookie
  - [ ] IP address
  - [ ] User agent

- [ ] **Deduplication**
  - [ ] event_id implemented
  - [ ] Browser + CAPI events deduplicated
  - [ ] No duplicate conversions in Events Manager

### Attribution & Validation

- [ ] **Attribution Configuration**
  - [ ] Attribution window: [7-day click, 1-day view / 28-day click, 1-day view]
  - [ ] Attribution model: [Last click / First click / Linear / Data-driven]
  - [ ] Conversion window appropriate for sales cycle

- [ ] **Testing & Validation**
  - [ ] Test events tool used
  - [ ] Test conversion completed successfully
  - [ ] Conversion appears in Events Manager
  - [ ] Conversion value correct
  - [ ] No errors in Events Manager
  - [ ] No warnings in Diagnostics tab

- [ ] **Privacy & Compliance**
  - [ ] Privacy policy updated
  - [ ] Cookie consent implemented (if required)
  - [ ] GDPR compliance (if EU traffic)
  - [ ] CCPA compliance (if CA traffic)

---

## ✅ Phase 3: Creative Assets

**Owner**: @creative-analyst

### Creative Brief

- [ ] **Brief Completed**
  - [ ] Target audience defined
  - [ ] Key message articulated
  - [ ] Hook strategy defined
  - [ ] Creative angles selected
  - [ ] Copy framework chosen
  - [ ] Success metrics defined
  - [ ] Brief approved by @ad-midas

### Hooks & Copy

- [ ] **Hook Development**
  - [ ] Minimum 3 hook variations created
  - [ ] Hooks use proven frameworks
  - [ ] Hooks tested for pattern interrupt
  - [ ] Hook types diverse (curiosity, social proof, problem agitation, etc.)

- [ ] **Copy Development**
  - [ ] Copy framework applied (PAS / AIDA / BAB / STORY)
  - [ ] Primary text written (125-150 words)
  - [ ] Headlines created (25-40 characters)
  - [ ] Descriptions written (if applicable)
  - [ ] CTA clear and compelling
  - [ ] Copy matches brand voice
  - [ ] Copy approved by @ad-midas

### Creative Production

- [ ] **Video Creatives** (if applicable)
  - [ ] Hook in first 3 seconds
  - [ ] Captions/subtitles added (80% watch without sound)
  - [ ] Aspect ratio correct (1:1 / 4:5 / 9:16)
  - [ ] Duration appropriate (15s / 30s / 60s / 2-4min)
  - [ ] Resolution: 1080p minimum
  - [ ] File size optimized
  - [ ] Thumbnail image created

- [ ] **Image Creatives** (if applicable)
  - [ ] High-quality images (1080x1080 / 1080x1350)
  - [ ] Text overlay < 20% (if applicable)
  - [ ] Branding visible but not overwhelming
  - [ ] Mobile-optimized

- [ ] **DSL Structure** (if VSL)
  - [ ] Hook (3-5 seconds)
  - [ ] Story (30-60 seconds)
  - [ ] Problem (20-30 seconds)
  - [ ] Solution (40-60 seconds)
  - [ ] Proof (20-30 seconds)
  - [ ] Offer (30-45 seconds)
  - [ ] CTA (10-15 seconds)

### Creative Matrix

- [ ] **Testing Matrix Defined**
  - [ ] Hooks: **\_** variations
  - [ ] Angles: **\_** variations
  - [ ] Total ads: **\_** (hooks × angles)
  - [ ] Recommended: 6-9 ads for initial test

### Meta Ad Policies

- [ ] **Compliance Check**
  - [ ] No prohibited content
  - [ ] No misleading claims
  - [ ] Proper disclosures (if required)
  - [ ] No before/after images (if health/fitness)
  - [ ] Text in image < 20% (if applicable)
  - [ ] No sensational language
  - [ ] Landing page matches ad content

---

## ✅ Phase 4: Campaign Setup

**Owner**: @media-buyer

### Campaign Level

- [ ] **Campaign Configuration**
  - [ ] Campaign name: ************\_\_\_************
  - [ ] Campaign objective: [Conversions / Traffic / Leads]
  - [ ] Campaign Budget Optimization (CBO) enabled
  - [ ] Daily budget: $****\_\_\_****
  - [ ] Campaign spending limit (if applicable)
  - [ ] Campaign schedule: [Continuous / Scheduled]
  - [ ] Start date: ************\_\_\_************
  - [ ] End date (if applicable): ************\_\_\_************

### Ad Set Level

- [ ] **Prospecting Ad Sets**
  - [ ] LAL 1% Purchasers (Budget: $**\_**)
  - [ ] LAL 2-3% Purchasers (Budget: $**\_**)
  - [ ] Interest Stack - Primary (Budget: $**\_**)
  - [ ] Interest Stack - Secondary (Budget: $**\_**)
  - [ ] Broad + Expansion (Budget: $**\_**)
  - [ ] Other: ************\_\_\_************ (Budget: $**\_**)

- [ ] **Retargeting Ad Sets**
  - [ ] Website Visitors 30d (Budget: $**\_**)
  - [ ] Engaged 90d (Budget: $**\_**)
  - [ ] Add to Cart 14d (Budget: $**\_**)
  - [ ] Other: ************\_\_\_************ (Budget: $**\_**)

- [ ] **Audience Configuration**
  - [ ] Target demographics set
  - [ ] Interests/behaviors configured
  - [ ] Exclusion audiences set (existing customers, converters)
  - [ ] Audience overlap checked (< 25%)
  - [ ] Audience size appropriate (min 50K for cold, 1K+ for retargeting)

- [ ] **Placement Configuration**
  - [ ] Placements: [Automatic / Manual]
  - [ ] If manual, placements selected:
    - [ ] Facebook Feed
    - [ ] Instagram Feed
    - [ ] Facebook Stories
    - [ ] Instagram Stories
    - [ ] Facebook Reels
    - [ ] Instagram Reels
    - [ ] Other: ************\_\_\_************

- [ ] **Optimization & Delivery**
  - [ ] Optimization event: [Purchase / Lead / AddToCart / etc.]
  - [ ] Optimization event matches tracking
  - [ ] Bid strategy: [Lowest Cost / Cost Cap / Bid Cap]
  - [ ] If Cost Cap: Target CPA = $****\_\_\_****
  - [ ] If Bid Cap: Max bid = $****\_\_\_****
  - [ ] Delivery optimization: [Conversions / Link Clicks]

### Ad Level

- [ ] **Ad Configuration**
  - [ ] Total ads: **\_** (matches creative matrix)
  - [ ] Creative assets uploaded
  - [ ] Primary text added
  - [ ] Headlines added
  - [ ] Descriptions added (if applicable)
  - [ ] CTA button selected
  - [ ] Destination URL set
  - [ ] Display link customized (if applicable)

- [ ] **Tracking Parameters**
  - [ ] UTM parameters set:
    - [ ] utm_source=facebook
    - [ ] utm_medium=paid
    - [ ] utm_campaign=[campaign_name]
    - [ ] utm_content=[ad_name]
    - [ ] utm_term=[audience_name]
  - [ ] URL parameters tested (click and verify)

- [ ] **Ad Preview**
  - [ ] Previewed on Facebook Feed
  - [ ] Previewed on Instagram Feed
  - [ ] Previewed on Stories
  - [ ] Previewed on mobile
  - [ ] All placements look good
  - [ ] No truncation issues
  - [ ] Images/videos display correctly

---

## ✅ Phase 5: Final Validation

**Owner**: @ad-midas

### Strategy Review

- [ ] **Strategy Alignment**
  - [ ] Campaign structure matches strategy
  - [ ] Budget allocation matches plan
  - [ ] Funnel type implemented correctly
  - [ ] Unit economics validated (LTV:CAC > 3:1)

### Tracking Review

- [ ] **Tracking Validation** (with @pixel-specialist)
  - [ ] Pixel firing on all pages
  - [ ] CAPI integrated (event match quality > 6.0)
  - [ ] Test conversion successful
  - [ ] Optimization event matches campaign
  - [ ] No errors in Events Manager

### Creative Review

- [ ] **Creative Quality** (with @creative-analyst)
  - [ ] Hooks follow frameworks
  - [ ] Copy is compelling
  - [ ] Creative matrix complete
  - [ ] Meta ad policies compliant
  - [ ] Landing page matches ad content

### Campaign Review

- [ ] **Campaign Setup** (with @media-buyer)
  - [ ] Campaign structure correct
  - [ ] Audiences configured properly
  - [ ] Exclusions set
  - [ ] Budget allocated correctly
  - [ ] Bids set appropriately
  - [ ] UTM parameters correct
  - [ ] Ads previewed and approved

### Monitoring Setup

- [ ] **Monitoring Dashboard**
  - [ ] Metrics dashboard configured
  - [ ] Key metrics tracked (CPA, CTR, CVR, ROAS)
  - [ ] Alerts set up (budget pacing, errors)
  - [ ] Reporting schedule defined
  - [ ] Team access granted

### Team Readiness

- [ ] **Team Alignment**
  - [ ] All agents briefed on launch
  - [ ] Roles and responsibilities clear
  - [ ] Communication protocol established
  - [ ] Escalation process defined
  - [ ] Monitoring schedule set

---

## ✅ Phase 6: Launch Readiness

### Pre-Launch Meeting

- [ ] **Final Review Meeting Held**
  - [ ] Date: ************\_\_\_************
  - [ ] Attendees: @ad-midas, @pixel-specialist, @creative-analyst, @media-buyer, @performance-analyst
  - [ ] All checklist items reviewed
  - [ ] Any issues resolved
  - [ ] Launch approved by @ad-midas

### Launch Plan

- [ ] **Launch Execution Plan**
  - [ ] Launch date/time: ************\_\_\_************
  - [ ] Who will click "Publish": ************\_\_\_************
  - [ ] Initial monitoring plan (first 2 hours)
  - [ ] First 24-hour monitoring plan
  - [ ] Contingency plans documented

### Contingency Plans

- [ ] **If Tracking Breaks**
  - [ ] @pixel-specialist investigates immediately
  - [ ] @ad-midas pauses campaigns if necessary
  - [ ] Fix tracking before resuming

- [ ] **If No Conversions After $500**
  - [ ] @pixel-specialist audits tracking
  - [ ] @performance-analyst analyzes funnel
  - [ ] @creative-analyst reviews hooks
  - [ ] @ad-midas decides: fix or kill

- [ ] **If CPA Too High**
  - [ ] @performance-analyst diagnoses issue
  - [ ] Identify: targeting, creative, or funnel problem
  - [ ] @ad-midas coordinates fix with appropriate agent

---

## 🚀 LAUNCH APPROVAL

**All checklist items completed**: [ ] YES / [ ] NO

**If NO, list outstanding items**:

1. ***
2. ***
3. ***

**Launch Decision**: [ ] APPROVED / [ ] DELAYED

**Approved by**: ************\_\_\_************ (@ ad-midas)

**Date**: ************\_\_\_************

**Signature**: ************\_\_\_************

---

## 📊 Post-Launch Monitoring

### First 2 Hours

- [ ] Check ad delivery status
- [ ] Verify pixel events firing
- [ ] Monitor for any errors
- [ ] Check initial engagement (impressions, clicks)

### First 24 Hours

- [ ] Verify conversions tracking
- [ ] Check budget pacing
- [ ] Monitor key metrics (CPA, CTR, CVR)
- [ ] Review for any issues

### First 3 Days

- [ ] Daily metrics review
- [ ] Check for early winners/losers
- [ ] Monitor creative fatigue (frequency)
- [ ] Report to @ad-midas

### Day 3-7

- [ ] Prepare for kill/scale decisions
- [ ] Analyze performance data
- [ ] @performance-analyst \*apply-kill-scale
- [ ] @ad-midas \*scale-optimize

---

**Version**: 1.0.0  
**Squad**: media-buyer-squad  
**Checklist**: Pre-Launch

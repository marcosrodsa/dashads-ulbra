---
task: Define Campaign Strategy
responsavel: "@ad-midas"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - product_info: Product/offer details
  - target_audience: Target audience information
  - budget: Available budget
  - goals: Campaign goals (leads, sales, etc.)
Saida: |
  - funnel_type: Selected funnel type with justification
  - unit_economics: CAC, LTV, payback calculations
  - campaign_structure: Campaign/ad set/ad structure
  - next_steps: Action plan with agent handoffs
Checklist:
  - "[ ] Gather product and audience information"
  - "[ ] Calculate unit economics"
  - "[ ] Select optimal funnel type"
  - "[ ] Define campaign structure"
  - "[ ] Validate economics (LTV:CAC > 3:1)"
  - "[ ] Create action plan with handoffs"
---

# \*define-strategy

Define comprehensive campaign strategy including funnel selection, unit economics, and campaign structure.

## Purpose

This task ensures every campaign is built on solid strategic foundation with validated unit economics before any budget is spent.

## When to Use

- Starting a new campaign
- Launching a new product/offer
- Restructuring underperforming campaigns
- Before any significant budget allocation

## Process

### Step 1: Gather Information

**Product/Offer Details:**

- What is being sold?
- Price point
- Complexity (simple vs complex)
- Purchase decision timeline
- Unique mechanism/value prop

**Target Audience:**

- Demographics
- Awareness level (cold, warm, hot)
- Pain points
- Desired outcomes
- Current alternatives they're using

**Budget & Goals:**

- Total available budget
- Monthly budget
- Target CPA/ROAS
- Volume goals
- Timeline

### Step 2: Calculate Unit Economics

Use the `*calculate-economics` skill to determine:

```
CAC (Customer Acquisition Cost):
- Target CPA based on industry benchmarks
- Acceptable CPA range

LTV (Lifetime Value):
- Average order value
- Purchase frequency
- Customer lifespan
- Total LTV calculation

LTV:CAC Ratio:
- Minimum 3:1 for profitability
- Ideal 4:1+ for scaling

Payback Period:
- How long to recover CAC
- Target: < 90 days for most businesses
```

**Decision Point**: If LTV:CAC < 3:1, STOP and improve economics before proceeding.

### Step 3: Select Funnel Type

Use the `*select-funnel` skill with these criteria:

| Price Point | Complexity  | Decision Time | Recommended Funnel |
| ----------- | ----------- | ------------- | ------------------ |
| $7-$97      | Low         | Fast          | Tripwire           |
| $97-$297    | Medium      | Medium        | VSL                |
| $297-$997   | Medium-High | Medium-Long   | Webinar            |
| $997+       | High        | Long          | VSL + Application  |

**Funnel Types:**

**Tripwire Funnel:**

- Structure: Ad → Landing Page → OTO → Thank You
- Use when: Low ticket, fast decision, impulse buy
- Pros: Simple, fast, high volume
- Cons: Lower LTV, need upsells

**VSL Funnel:**

- Structure: Ad → VSL Landing Page → Checkout
- Use when: Mid-high ticket, need education
- Pros: Scalable, automated, high conversion
- Cons: Requires strong video creative

**Webinar Funnel:**

- Structure: Ad → Registration → Webinar → Pitch → Checkout
- Use when: High ticket, need trust building
- Pros: High conversion, builds authority
- Cons: More complex, requires live/automated webinar

**Challenge Funnel:**

- Structure: Ad → Registration → Daily Content → Pitch → Checkout
- Use when: Transformation product, need engagement
- Pros: High engagement, strong community
- Cons: Resource intensive, longer timeline

### Step 4: Define Campaign Structure

Use the `*structure-campaign` skill to define:

**Campaign Level:**

```yaml
campaigns:
  - name: Prospecting
    objective: Conversions
    budget: 70% of total
    optimization: Purchase/Lead

  - name: Retargeting
    objective: Conversions
    budget: 30% of total
    optimization: Purchase/Lead
```

**Ad Set Level:**

```yaml
prospecting_ad_sets:
  - name: LAL 1% Purchasers
    audience: Lookalike 1%
    budget: $100/day

  - name: LAL 2-3% Purchasers
    audience: Lookalike 2-3%
    budget: $100/day

  - name: Interest Stack - Primary
    audience: Interest targeting
    budget: $100/day

  - name: Broad + Expansion
    audience: Broad with detailed targeting expansion
    budget: $100/day

retargeting_ad_sets:
  - name: Website Visitors 30d
    audience: Website visitors (30 days)
    budget: $50/day

  - name: Engaged 90d
    audience: Engagement (90 days)
    budget: $50/day
```

**Ad Level:**

```yaml
creative_matrix:
  hooks: 3 variations
  angles: 2 variations
  total_ads: 6 combinations

  testing_approach:
    - Start with 6 ads
    - Let run 3-5 days
    - Kill bottom 50%
    - Scale top performers
    - Add new variations to winners
```

### Step 5: Validate Economics

**Validation Checklist:**

- [ ] LTV:CAC ratio > 3:1
- [ ] Target CPA is achievable (industry benchmarks)
- [ ] Budget sufficient for testing (minimum $500-1000)
- [ ] Payback period acceptable
- [ ] Profit margins validated

**If validation fails:**

- Improve LTV (upsells, subscriptions, higher prices)
- Reduce CAC (better targeting, creative, funnel optimization)
- Adjust budget expectations
- Consider different funnel type

### Step 6: Create Action Plan

**Immediate Next Steps:**

1. **Tracking Setup** → `@pixel-specialist *setup-tracking`
   - Meta Pixel installation
   - CAPI integration
   - Event configuration
   - Validation

2. **Creative Development** → `@creative-analyst *create-brief`
   - Creative brief based on strategy
   - Hook generation
   - Copy development
   - DSL structure (if VSL)

3. **Campaign Setup** → `@media-buyer *setup-campaign`
   - Implement campaign structure
   - Configure audiences
   - Set budgets and bids
   - Upload creatives

4. **Launch** → `@ad-midas *launch-campaign`
   - Final validation
   - Go-live
   - Monitoring setup

## Output Format

```markdown
📊 Campaign Strategy Defined

**Product**: [Product name]
**Price**: $[price]
**Target Audience**: [Description]

**Funnel Type**: [Selected funnel]
**Justification**: [Why this funnel]

**Unit Economics**:

- Target CPA: $[amount]
- LTV: $[amount]
- LTV:CAC Ratio: [ratio]:1 ✅/❌
- Payback Period: [days] days

**Campaign Structure**:

Prospecting Campaign:

- LAL 1% Purchasers ($[budget]/day)
- LAL 2-3% Purchasers ($[budget]/day)
- Interest Stack ($[budget]/day)
- Broad + Expansion ($[budget]/day)

Retargeting Campaign:

- Website Visitors 30d ($[budget]/day)
- Engaged 90d ($[budget]/day)

**Creative Matrix**:

- [x] hooks × [Y] angles = [Z] ads

**Next Steps**:

1. @pixel-specialist \*setup-tracking
2. @creative-analyst \*create-brief
3. @media-buyer \*setup-campaign
4. @ad-midas \*launch-campaign

**Timeline**: [X] days to launch
```

## Expert Frameworks Applied

### Jeremy Haynes - Funnel Selection

- VSL for high-ticket education products
- Webinar for trust-building needed
- Challenge for transformation products

### Alex Hormozi - Unit Economics

- LTV:CAC minimum 3:1
- Payback period < 90 days
- Focus on economics before scaling

### Brian Moncada - Systematic Approach

- Structured testing methodology
- Clear success metrics
- Data-driven decisions

## Common Mistakes to Avoid

❌ **Skipping unit economics validation**

- Always calculate LTV:CAC before launching
- Don't assume you can "figure it out later"

❌ **Wrong funnel for product/price**

- Don't use tripwire funnel for high-ticket
- Don't overcomplicate low-ticket offers

❌ **Insufficient testing budget**

- Need minimum $500-1000 for valid test
- Budget too low = no statistical significance

❌ **Too many variables**

- Start with clear structure
- Test systematically
- Don't change everything at once

## Success Criteria

✅ Funnel type selected with clear justification
✅ Unit economics calculated and validated (LTV:CAC > 3:1)
✅ Campaign structure defined (campaigns, ad sets, ads)
✅ Budget allocated appropriately
✅ Next steps clearly outlined with agent handoffs
✅ Timeline established

## Related Tasks

- `ad-midas-launch-campaign.md` - Execute the launch
- `ad-midas-scale-optimize.md` - Scale successful campaigns
- `pixel-specialist-setup-tracking.md` - Set up tracking
- `creative-analyst-create-briefs.md` - Create creative assets

---

**Agent**: @ad-midas  
**Category**: Strategic Planning  
**Complexity**: High  
**Estimated Time**: 2-4 hours

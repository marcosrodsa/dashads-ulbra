---
task: Generate Hooks
responsavel: "@creative-analyst"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - target_audience: Target audience description
  - pain_points: Primary pain points (3-5)
  - desired_outcomes: Desired outcomes (3-5)
  - product_info: Product/offer information
  - hook_count: Number of hooks to generate (default: 10)
Saida: |
  - hooks: List of hook variations (10+)
  - hook_types: Hook types used
  - testing_matrix: Hook × angle testing matrix
  - recommendations: Testing recommendations
Checklist:
  - "[ ] Analyze target audience and pain points"
  - "[ ] Select 3-5 hook types to test"
  - "[ ] Generate 10+ hook variations"
  - "[ ] Categorize hooks by type"
  - "[ ] Create hook × angle matrix"
  - "[ ] Provide testing recommendations"
  - "[ ] Include performance benchmarks"
---

# \*generate-hooks

Generate 10+ high-performing hook variations using proven frameworks from Jeremy Haynes, Brian Moncada, and Jordan Stupar.

## Purpose

The hook is the MOST IMPORTANT element of your ad creative. It determines 80% of your ad's success. A great hook stops the scroll, creates pattern interrupt, and compels the viewer to watch/read more.

**Hook Rate Benchmarks**:

- < 10%: Poor (kill immediately)
- 10-15%: Below average (test new hooks)
- 15-20%: Good (keep testing)
- 20-25%: Great (scale)
- > 25%: Excellent (scale aggressively)

## When to Use

- Starting a new campaign
- Hook rate < 15% on current ads
- Creative fatigue detected (frequency > 3.5)
- Testing new angles or offers
- Refreshing creative assets

## Prerequisites

### Information Needed

- [ ] Target audience clearly defined
- [ ] Pain points identified (3-5 minimum)
- [ ] Desired outcomes documented (3-5 minimum)
- [ ] Product/offer details
- [ ] Current alternatives (what they're using now)
- [ ] Unique mechanism or value prop

### Context from Other Agents

- Strategy from @ad-midas (\*define-strategy)
- Creative brief (if available)
- Performance data (if refreshing hooks)

## Process

### Phase 1: Audience & Pain Point Analysis (15-30 minutes)

#### Step 1.1: Define Target Audience

**Demographics**:

```yaml
Age: [Range]
Gender: [Male/Female/All]
Location: [Geographic]
Occupation: [What they do]
Income: [Range]
Education: [Level]
```

**Psychographics**:

```yaml
Awareness Level: [Cold/Problem-Aware/Solution-Aware/Product-Aware/Most Aware]
Current Situation: [Where they are now]
Frustrations: [What's not working]
Aspirations: [Where they want to be]
Objections: [What's holding them back]
```

#### Step 1.2: Identify Pain Points

**Framework**: List 3-5 primary pain points

**Example (Online Entrepreneurs)**:

1. **Wasting money on ads that don't convert**
   - Spending $1000s with no results
   - Don't know what's wrong
   - Afraid to scale because of losses

2. **Can't scale past $10K/month**
   - Hit a plateau
   - CPA rises when trying to scale
   - Don't know how to break through

3. **No time to learn complex ad strategies**
   - Overwhelmed by information
   - Don't have months to test
   - Need results now

4. **Don't trust "gurus" anymore**
   - Tried courses that didn't work
   - Skeptical of promises
   - Want proven system

5. **Fear of losing more money**
   - Already lost money on failed campaigns
   - Can't afford more losses
   - Need guaranteed approach

#### Step 1.3: Identify Desired Outcomes

**Framework**: List 3-5 primary desired outcomes

**Example**:

1. **Scale to $50K+/month profitably**
   - Predictable, profitable growth
   - Without wasting money
   - In next 90 days

2. **Know exactly what to do**
   - Clear, step-by-step system
   - No guesswork
   - Proven framework

3. **Get results fast**
   - See results in days, not months
   - Quick wins to build confidence
   - Rapid implementation

4. **Have confidence in scaling**
   - Know when to scale vs. kill
   - Understand the metrics
   - Make data-driven decisions

5. **Stop wasting money**
   - Only spend on what works
   - Cut losses quickly
   - Maximize ROI

### Phase 2: Hook Type Selection (10-15 minutes)

#### Step 2.1: Choose Hook Types

**5 Primary Hook Types**:

**1. Pattern Interrupt**

- **Purpose**: Break the scroll with unexpected statement
- **When to use**: Cold traffic, need attention
- **Effectiveness**: High for stopping scroll
- **Examples**:
  - "Stop scrolling if you're tired of..."
  - "This is weird but it works..."
  - "I'm about to show you something crazy..."

**2. Curiosity Gap**

- **Purpose**: Create curiosity that demands resolution
- **When to use**: All traffic temperatures
- **Effectiveness**: High for engagement
- **Examples**:
  - "The #1 mistake that's costing you..."
  - "What nobody tells you about..."
  - "The secret that [authority] doesn't want you to know..."

**3. Social Proof**

- **Purpose**: Leverage authority or results
- **When to use**: Skeptical audiences
- **Effectiveness**: High for credibility
- **Examples**:
  - "How I went from X to Y in Z days..."
  - "10,000+ people are using this to..."
  - "The method that helped [big name] achieve..."

**4. Problem Agitation**

- **Purpose**: Call out pain point directly
- **When to use**: Problem-aware audiences
- **Effectiveness**: High for resonance
- **Examples**:
  - "Struggling with X? Here's why..."
  - "If you're still doing X, you're losing money..."
  - "The reason you can't [achieve goal]..."

**5. Direct Benefit**

- **Purpose**: Lead with clear outcome
- **When to use**: Solution-aware audiences
- **Effectiveness**: High for conversion
- **Examples**:
  - "Get X in Y days without Z..."
  - "The fastest way to achieve X..."
  - "How to X even if you're Y..."

**Selection Strategy**:

- Choose 3-5 hook types to test
- Mix different types for variety
- Match hook type to audience awareness level

**Recommended Mix**:

- 3 Problem Agitation (resonance)
- 3 Curiosity Gap (engagement)
- 2 Social Proof (credibility)
- 2 Direct Benefit (conversion)

### Phase 3: Hook Generation (30-60 minutes)

#### Step 3.1: Generate Pattern Interrupt Hooks

**Formula**: [Unexpected Statement] + [Promise/Tease]

**Examples**:

1. "Stop wasting money on ads that don't convert..."
   - Type: Pattern Interrupt + Problem Agitation
   - Target: Entrepreneurs losing money on ads

2. "If you're still doing this with your ads, you're bleeding cash..."
   - Type: Pattern Interrupt + Problem Agitation
   - Target: People making common mistakes

3. "This ad mistake is costing you $10K+/month..."
   - Type: Pattern Interrupt + Curiosity
   - Target: People unaware of specific mistake

**Your Turn**: Generate 3 pattern interrupt hooks based on your pain points

#### Step 3.2: Generate Curiosity Gap Hooks

**Formula**: [Tease valuable information] + [Create gap]

**Examples**:

1. "The #1 reason your ads aren't converting (it's not what you think)..."
   - Type: Curiosity Gap
   - Target: People with underperforming ads

2. "What Meta doesn't tell you about scaling ads..."
   - Type: Curiosity Gap + Authority
   - Target: People trying to scale

3. "The secret that 7-figure brands use to scale profitably..."
   - Type: Curiosity Gap + Social Proof
   - Target: Aspiring to 7-figures

4. "I spent $2M on ads so you don't have to make these mistakes..."
   - Type: Curiosity Gap + Social Proof
   - Target: People afraid of wasting money

**Your Turn**: Generate 4 curiosity gap hooks

#### Step 3.3: Generate Social Proof Hooks

**Formula**: [Impressive result] + [Timeframe] + [Method tease]

**Examples**:

1. "How we scaled from $5K to $50K/month in 90 days..."
   - Type: Social Proof + Transformation
   - Target: People wanting to scale

2. "The exact system 500+ brands use to scale ads..."
   - Type: Social Proof + Authority
   - Target: People wanting proven system

3. "From $0 to $100K/month with this ad framework..."
   - Type: Social Proof + Transformation
   - Target: Beginners or people starting over

**Your Turn**: Generate 3 social proof hooks

#### Step 3.4: Generate Problem Agitation Hooks

**Formula**: [Call out problem] + [Agitate] + [Promise solution]

**Examples**:

1. "Struggling to scale past $10K/month? Here's why..."
   - Type: Problem Agitation + Curiosity
   - Target: People stuck at plateau

2. "Your ads are getting clicks but no sales? This is the problem..."
   - Type: Problem Agitation + Solution tease
   - Target: People with traffic but no conversions

3. "If your CPA keeps rising, you're missing this one thing..."
   - Type: Problem Agitation + Curiosity
   - Target: People with rising costs

**Your Turn**: Generate 3 problem agitation hooks

#### Step 3.5: Generate Direct Benefit Hooks

**Formula**: [Clear outcome] + [Timeframe] + [Without objection]

**Examples**:

1. "Scale to $50K/month in 90 days without wasting money on testing..."
   - Type: Direct Benefit + Objection removal
   - Target: People wanting fast, safe growth

2. "The fastest way to profitable ad campaigns (even if you've failed before)..."
   - Type: Direct Benefit + Objection removal
   - Target: People who've tried and failed

**Your Turn**: Generate 2 direct benefit hooks

### Phase 4: Hook Categorization & Matrix (15-30 minutes)

#### Step 4.1: Categorize Hooks

**Organization**:

```markdown
## Pattern Interrupt (3 hooks)

1. "Stop wasting money on ads that don't convert..."
2. "If you're still doing this with your ads, you're bleeding cash..."
3. "This ad mistake is costing you $10K+/month..."

## Curiosity Gap (4 hooks)

1. "The #1 reason your ads aren't converting (it's not what you think)..."
2. "What Meta doesn't tell you about scaling ads..."
3. "The secret that 7-figure brands use to scale profitably..."
4. "I spent $2M on ads so you don't have to make these mistakes..."

## Social Proof (3 hooks)

1. "How we scaled from $5K to $50K/month in 90 days..."
2. "The exact system 500+ brands use to scale ads..."
3. "From $0 to $100K/month with this ad framework..."

## Problem Agitation (3 hooks)

1. "Struggling to scale past $10K/month? Here's why..."
2. "Your ads are getting clicks but no sales? This is the problem..."
3. "If your CPA keeps rising, you're missing this one thing..."

## Direct Benefit (2 hooks)

1. "Scale to $50K/month in 90 days without wasting money..."
2. "The fastest way to profitable ad campaigns (even if you've failed before)..."

**Total**: 15 hooks
```

#### Step 4.2: Create Testing Matrix

**Hook × Angle Matrix**:

Define 2-3 creative angles:

**Angle 1: Mechanism** (How it works)

- Focus on the unique system/method
- "The 3-step framework that..."

**Angle 2: Transformation** (Before/after)

- Focus on the journey
- "How I went from X to Y..."

**Angle 3: Authority** (Expert/proof)

- Focus on credibility
- "After spending $2M on ads, here's what I learned..."

**Testing Matrix**:

| Hook # | Hook Text                       | Angle 1 | Angle 2 | Angle 3 |
| ------ | ------------------------------- | ------- | ------- | ------- |
| 1      | "Stop wasting money..."         | Ad 1    | Ad 2    | Ad 3    |
| 2      | "If you're still doing this..." | Ad 4    | Ad 5    | Ad 6    |
| 3      | "This ad mistake..."            | Ad 7    | Ad 8    | Ad 9    |
| 4      | "The #1 reason..."              | Ad 10   | Ad 11   | Ad 12   |
| 5      | "What Meta doesn't tell you..." | Ad 13   | Ad 14   | Ad 15   |
| 6      | "The secret that 7-figure..."   | Ad 16   | Ad 17   | Ad 18   |

**Total Combinations**: 6 hooks × 3 angles = 18 ads

**Recommended for Initial Test**: Select top 6-9 combinations

### Phase 5: Testing Recommendations (10-15 minutes)

#### Step 5.1: Prioritize Hooks for Testing

**Selection Criteria**:

1. **Diversity**: Mix different hook types
2. **Resonance**: Hooks that match pain points
3. **Proven patterns**: Hooks using successful formulas

**Recommended Initial Test** (6 hooks):

1. 2 Curiosity Gap hooks (highest engagement)
2. 2 Problem Agitation hooks (highest resonance)
3. 1 Social Proof hook (credibility)
4. 1 Pattern Interrupt hook (attention)

**Testing Approach**:

```
Phase 1 (Day 1-5):
- Launch 6 hooks × 2 angles = 12 ads
- Equal budget distribution
- Let run for 3-5 days
- Analyze hook rate and CTR

Phase 2 (Day 6-10):
- Kill bottom 50% (6 ads)
- Keep top 50% (6 ads)
- Add 3 new hook variations
- Total: 9 ads running

Phase 3 (Day 11+):
- Scale top performers
- Continuous testing of new hooks
- Refresh when frequency > 3.5
```

#### Step 5.2: Define Success Metrics

**Hook Performance Benchmarks**:

| Metric     | Poor  | Fair   | Good     | Great  | Excellent |
| ---------- | ----- | ------ | -------- | ------ | --------- |
| Hook Rate  | < 10% | 10-15% | 15-20%   | 20-25% | > 25%     |
| CTR        | < 1%  | 1-1.5% | 1.5-2.5% | 2.5-4% | > 4%      |
| Engagement | < 5%  | 5-10%  | 10-15%   | 15-20% | > 20%     |

**Decision Rules**:

- **Kill**: Hook rate < 10% after 1000 impressions
- **Test more**: Hook rate 10-15%
- **Keep**: Hook rate 15-20%
- **Scale**: Hook rate > 20%

#### Step 5.3: Provide Testing Guidelines

**Testing Best Practices**:

1. **Minimum Data Requirements**:
   - 1000 impressions per hook minimum
   - 100 clicks per hook ideal
   - 3-5 days runtime minimum

2. **Don't Change**:
   - Hook text during test
   - Targeting during test
   - Budget during test (first 3 days)

3. **Do Monitor**:
   - Hook rate (primary metric)
   - CTR (secondary metric)
   - Frequency (fatigue indicator)

4. **When to Refresh**:
   - Hook rate drops > 30% from peak
   - Frequency > 3.5
   - Creative Fatigue Index < 70%

## Output Format

### Hook Generation Output

```markdown
✨ Hook Variations Generated

**Target Audience**: [Description]
**Pain Points**: [List]
**Desired Outcomes**: [List]

---

## Pattern Interrupt Hooks (3)

**Hook 1**: "Stop wasting money on ads that don't convert..."

- **Type**: Pattern Interrupt + Problem Agitation
- **Target Pain Point**: Wasting money on ads
- **Expected Hook Rate**: 15-20%

**Hook 2**: "If you're still doing this with your ads, you're bleeding cash..."

- **Type**: Pattern Interrupt + Problem Agitation
- **Target Pain Point**: Making costly mistakes
- **Expected Hook Rate**: 15-20%

**Hook 3**: "This ad mistake is costing you $10K+/month..."

- **Type**: Pattern Interrupt + Curiosity
- **Target Pain Point**: Unaware of specific mistake
- **Expected Hook Rate**: 18-22%

---

## Curiosity Gap Hooks (4)

**Hook 4**: "The #1 reason your ads aren't converting (it's not what you think)..."

- **Type**: Curiosity Gap
- **Target Pain Point**: Underperforming ads
- **Expected Hook Rate**: 20-25%

**Hook 5**: "What Meta doesn't tell you about scaling ads..."

- **Type**: Curiosity Gap + Authority
- **Target Pain Point**: Struggling to scale
- **Expected Hook Rate**: 18-23%

**Hook 6**: "The secret that 7-figure brands use to scale profitably..."

- **Type**: Curiosity Gap + Social Proof
- **Target Pain Point**: Want proven system
- **Expected Hook Rate**: 22-27%

**Hook 7**: "I spent $2M on ads so you don't have to make these mistakes..."

- **Type**: Curiosity Gap + Social Proof
- **Target Pain Point**: Fear of wasting money
- **Expected Hook Rate**: 20-25%

---

## Social Proof Hooks (3)

**Hook 8**: "How we scaled from $5K to $50K/month in 90 days..."

- **Type**: Social Proof + Transformation
- **Target Outcome**: Scale to $50K+/month
- **Expected Hook Rate**: 18-23%

**Hook 9**: "The exact system 500+ brands use to scale ads..."

- **Type**: Social Proof + Authority
- **Target Outcome**: Proven system
- **Expected Hook Rate**: 17-22%

**Hook 10**: "From $0 to $100K/month with this ad framework..."

- **Type**: Social Proof + Transformation
- **Target Outcome**: Massive growth
- **Expected Hook Rate**: 19-24%

---

## Problem Agitation Hooks (3)

**Hook 11**: "Struggling to scale past $10K/month? Here's why..."

- **Type**: Problem Agitation + Curiosity
- **Target Pain Point**: Stuck at plateau
- **Expected Hook Rate**: 16-21%

**Hook 12**: "Your ads are getting clicks but no sales? This is the problem..."

- **Type**: Problem Agitation + Solution
- **Target Pain Point**: Traffic but no conversions
- **Expected Hook Rate**: 17-22%

**Hook 13**: "If your CPA keeps rising, you're missing this one thing..."

- **Type**: Problem Agitation + Curiosity
- **Target Pain Point**: Rising costs
- **Expected Hook Rate**: 18-23%

---

## Direct Benefit Hooks (2)

**Hook 14**: "Scale to $50K/month in 90 days without wasting money..."

- **Type**: Direct Benefit + Objection Removal
- **Target Outcome**: Fast, safe growth
- **Expected Hook Rate**: 15-20%

**Hook 15**: "The fastest way to profitable ad campaigns (even if you've failed before)..."

- **Type**: Direct Benefit + Objection Removal
- **Target Outcome**: Success after failure
- **Expected Hook Rate**: 16-21%

---

## Testing Matrix

**Recommended Initial Test** (6 hooks × 2 angles = 12 ads):

| Hook    | Type                     | Angle 1 (Mechanism) | Angle 2 (Transformation) |
| ------- | ------------------------ | ------------------- | ------------------------ |
| Hook 4  | Curiosity                | Ad 1                | Ad 2                     |
| Hook 6  | Curiosity + Social Proof | Ad 3                | Ad 4                     |
| Hook 11 | Problem Agitation        | Ad 5                | Ad 6                     |
| Hook 12 | Problem Agitation        | Ad 7                | Ad 8                     |
| Hook 8  | Social Proof             | Ad 9                | Ad 10                    |
| Hook 1  | Pattern Interrupt        | Ad 11               | Ad 12                    |

**Total**: 12 ads for initial test

---

## Testing Recommendations

**Phase 1** (Day 1-5):

- Launch all 12 ads
- Equal budget ($50-100/day per ad set)
- Let algorithm learn
- Monitor hook rate and CTR

**Success Criteria**:

- Hook Rate > 15% (keep)
- Hook Rate < 10% (kill)
- CTR > 1.5% (good)

**Phase 2** (Day 6-10):

- Kill bottom 50% (6 ads with lowest hook rate)
- Keep top 50% (6 ads)
- Add 3 new variations to winners
- Total: 9 ads

**Phase 3** (Day 11+):

- Scale top 3 performers
- Continuous testing
- Refresh when frequency > 3.5

---

## Performance Benchmarks

| Metric    | Target                            |
| --------- | --------------------------------- |
| Hook Rate | > 15% (minimum), > 20% (ideal)    |
| CTR       | > 1.5% (cold), > 3% (warm)        |
| Frequency | < 3.0 (fresh), < 3.5 (acceptable) |

---

## Next Steps

1. **Creative Production**: Create ads using these hooks
2. **Copy Development**: Write full copy for each hook
3. **Testing**: Launch and monitor for 3-5 days
4. **Optimization**: Kill losers, scale winners
5. **Refresh**: Add new hooks when frequency > 3.5

---

**Total Hooks Generated**: 15
**Recommended for Testing**: 6 hooks (12 ads)
**Expected Best Performer**: Hook 6 or Hook 8
**Estimated Hook Rate Range**: 15-25%

**Created by**: @creative-analyst ✨
**Date**: [Date]
```

## Expert Frameworks Applied

### Jeremy Haynes - DSL Revolution

- Hook is first 3-5 seconds (most critical)
- Pattern interrupt is essential
- Test multiple hooks systematically

### Brian Moncada - Hook Testing

- Hook rate > 15% minimum
- Test 6-12 hooks initially
- Kill < 10% immediately
- Scale > 20% aggressively

### Jordan Stupar - Creative Strategy

- Match hook to audience awareness
- Use proven hook formulas
- Diversify hook types

## Common Mistakes to Avoid

❌ **Using generic hooks**

- "Check this out..." (no pattern interrupt)
- "Click here to learn more..." (no curiosity)

❌ **Too many hooks at once**

- Testing 20+ hooks = diluted budget
- Start with 6-12 max

❌ **Not matching hook to audience**

- Cold traffic needs pattern interrupt
- Warm traffic can use direct benefit

❌ **Killing hooks too early**

- Need minimum 1000 impressions
- Give 3-5 days to perform

❌ **Not refreshing hooks**

- Frequency > 3.5 = fatigue
- Hook rate drops > 30% = refresh needed

## Success Criteria

✅ **Hook Generation Successful**:

- 10+ hooks generated
- 3-5 hook types represented
- Hooks match pain points and outcomes
- Testing matrix created
- Recommendations provided

✅ **Testing Setup Ready**:

- 6-12 hooks selected for initial test
- Hook × angle matrix defined
- Success metrics clear
- Timeline established

✅ **Expected Performance**:

- At least 2-3 hooks with > 15% hook rate
- At least 1 hook with > 20% hook rate
- Clear winners identified within 5 days

## Related Tasks

- `creative-analyst-create-briefs.md` - Create full creative briefs
- `creative-analyst-generate-copy.md` - Write full copy
- `ad-midas-define-strategy.md` - Strategy context
- `performance-analyst-monitor-metrics.md` - Monitor hook performance

---

**Agent**: @creative-analyst  
**Category**: Creative Development  
**Complexity**: Medium  
**Estimated Time**: 1-2 hours  
**Critical**: YES - Hooks determine 80% of ad success

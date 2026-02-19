---
workflow: Creative Refresh Workflow
responsavel: "@creative-analyst + @media-buyer"
trigger: "Frequency > 3.5 OR Hook rate < 10% OR Performance decline"
duration: "2-3 days"
---

# Creative Refresh Workflow

Systematic process for refreshing creative when fatigue is detected.

## When to Use

- Frequency > 3.5
- Hook rate drops below 10%
- CTR drops 30%+ from peak
- CPA increases 50%+ from baseline
- Creative running for 14+ days

## Phase 1: Detect Fatigue (Day 0)

### Step 1: Run Fatigue Detection

```bash
@performance-analyst
*detect-fatigue

# Or use script directly:
node scripts/detect-fatigue.js
```

**Expected Output**:

- Fatigue score (0-100)
- Severity level (NONE, LOW, MODERATE, HIGH, SEVERE)
- Recommended action

**Decision Point**:

- SEVERE: Pause immediately, proceed to Phase 2
- HIGH: Proceed to Phase 2 within 24 hours
- MODERATE: Schedule refresh for next week
- LOW/NONE: Continue monitoring

---

## Phase 2: Analyze What Worked (Day 0)

### Step 2: Review Performance Data

```bash
@performance-analyst
*diagnose-metrics
```

**Identify**:

- Best performing hooks (hook rate > 15%)
- Best performing angles (CTR > 1.5%)
- Best performing visuals
- Best performing copy elements

**Document**:

- What worked: [List top 3 elements]
- What didn't work: [List bottom 3 elements]
- Key insights: [Patterns observed]

---

## Phase 3: Generate New Creative (Day 1)

### Step 3: Generate New Hooks

```bash
@creative-analyst
*generate-hooks

# Or use script:
node scripts/generate-hooks.js
```

**Requirements**:

- Generate 6-9 new hooks
- Use different hook types than previous
- Incorporate learnings from Step 2

### Step 4: Generate New Angles

```bash
# Use script:
node scripts/generate-angles.js
```

**Requirements**:

- Test 2-3 angles per hook
- Total: 12-18 new ad variations

### Step 5: Generate Copy

```bash
# Use script:
node scripts/generate-copy.js
```

**Requirements**:

- Use proven framework (PAS, AIDA, BAB, STORY)
- Incorporate winning elements from previous creative
- Keep length 125-150 words

---

## Phase 4: Create New Ads (Day 1-2)

### Step 6: Create Brief

```bash
@creative-analyst
*create-briefs

# Or use script:
node scripts/create-brief.js
```

**Brief Must Include**:

- New hooks (6-9)
- New angles (2-3 per hook)
- Visual requirements
- Timeline (2-3 days)

### Step 7: Produce Creative

**Internal Team**:

- Record videos (UGC style)
- Edit (15-30 seconds)
- Add captions
- Export (9:16, 1080x1920)

**External Team**:

- Send brief to creator
- Review drafts
- Request revisions
- Approve finals

**Timeline**: 1-2 days

---

## Phase 5: Launch New Creative (Day 2-3)

### Step 8: Pause Fatigued Ads

```bash
@media-buyer
# In Ads Manager:
1. Identify fatigued ads (from Step 1)
2. Pause ads with SEVERE/HIGH fatigue
3. Keep ads with MODERATE fatigue on hold
```

### Step 9: Launch New Ads

```bash
@media-buyer
# In Ads Manager:
1. Upload new creative
2. Duplicate winning ad sets
3. Replace creative with new variations
4. Launch with same budget as paused ads
```

**Budget Allocation**:

- Allocate same budget as paused ads
- Start with equal distribution
- Let algorithm optimize for 3 days

---

## Phase 6: Monitor Performance (Day 3-7)

### Step 10: Monitor First 24 Hours

```bash
@performance-analyst
*monitor-metrics
```

**Check Every 6 Hours**:

- Hook rate (target: > 15%)
- CTR (target: > 1.5%)
- Frequency (keep < 2.0)
- Spend pacing

**Red Flags**:

- Hook rate < 10% after 1000 impressions → Kill
- CTR < 1.0% after 500 clicks → Kill
- CPA > Target × 2.0 → Kill

### Step 11: Evaluate After 3 Days

```bash
@performance-analyst
*diagnose-metrics
*apply-kill-scale
```

**Decisions**:

- **Winners** (CPA < Target × 0.8): Scale 20%
- **Performers** (CPA within target): Keep
- **Losers** (CPA > Target × 1.5): Kill

---

## Phase 7: Optimize (Day 7+)

### Step 12: Kill Bottom 50%

```bash
@performance-analyst
*apply-kill-scale
```

**Kill Criteria**:

- Hook rate < 10%
- CPA > Target × 1.5
- No conversions after $500 spend

### Step 13: Scale Top 50%

```bash
@media-buyer
# For winning ads:
1. Increase budget 20%
2. Duplicate to new audiences
3. Add new angle variations
```

---

## Success Criteria

✅ **Immediate** (Day 1-3):

- New creative launched
- Fatigued creative paused
- Hook rate > 15%

✅ **Short-term** (Day 3-7):

- At least 3 winning ads
- CPA at or below target
- Frequency < 2.5

✅ **Long-term** (Day 7+):

- Sustained performance
- Scalable winners identified
- Creative library expanded

---

## Common Mistakes to Avoid

❌ **Waiting too long to refresh**

- Don't wait until frequency > 4.0
- Refresh at 3.5 to prevent performance cliff

❌ **Changing too many variables**

- Keep winning elements (offer, CTA, format)
- Only change hooks and angles

❌ **Not testing enough variations**

- Need minimum 6-9 new ads
- More variations = higher chance of winners

❌ **Killing ads too early**

- Give new creative 3 days minimum
- Need sufficient data for decisions

❌ **Not documenting learnings**

- Track what works for future refreshes
- Build creative playbook over time

---

## Handoff Points

**@creative-analyst → @media-buyer**:

- After Step 7 (creative produced)
- Deliverable: New ad files + copy

**@media-buyer → @performance-analyst**:

- After Step 9 (ads launched)
- Deliverable: Campaign links for monitoring

**@performance-analyst → @media-buyer**:

- After Step 11 (evaluation complete)
- Deliverable: Kill/scale recommendations

---

## Emergency Refresh (Same Day)

If performance crashes suddenly:

1. **Pause immediately** (don't wait)
2. **Use existing creative library**
3. **Launch backup ads** (pre-made variations)
4. **Generate new creative** in parallel

**Backup Creative**:

- Always have 3-6 backup ads ready
- Update monthly
- Test different hooks/angles than current

---

## Tools & Resources

**Scripts**:

- `detect-fatigue.js` - Detect creative fatigue
- `generate-hooks.js` - Generate new hooks
- `generate-angles.js` - Generate new angles
- `generate-copy.js` - Generate ad copy
- `create-brief.js` - Create creative brief
- `diagnose-metrics.js` - Analyze performance
- `evaluate-kill-scale.js` - Kill/scale decisions

**Templates**:

- `creative-brief-template.md`
- `ad-copy-template.md` (if created)

**Checklists**:

- `creative-review-checklist.md` (if created)

---

## Timeline Summary

| Day | Phase              | Owner                | Deliverable               |
| --- | ------------------ | -------------------- | ------------------------- |
| 0   | Detect & Analyze   | @performance-analyst | Fatigue report + insights |
| 1   | Generate Creative  | @creative-analyst    | Hooks, angles, copy       |
| 1-2 | Produce Creative   | @creative-analyst    | New ad files              |
| 2-3 | Launch             | @media-buyer         | Ads live                  |
| 3-7 | Monitor & Optimize | @performance-analyst | Kill/scale decisions      |

**Total Duration**: 3-7 days from detection to optimization

---

## Related Resources

- Task: `creative-analyst-generate-hooks.md`
- Workflow: `campaign-launch-workflow.md`
- Script: `detect-fatigue.js`
- Framework: Jeremy Haynes DSL Revolution

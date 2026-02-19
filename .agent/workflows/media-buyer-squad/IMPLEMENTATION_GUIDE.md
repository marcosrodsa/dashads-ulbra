# Media Buyer Squad - Implementation Guide

**Version**: 1.0.0  
**Created**: 2026-02-10  
**Squad**: media-buyer-squad  
**AIOS Version**: 2.1.0+

---

## 🎯 Overview

The **media-buyer-squad** is a comprehensive AI-powered team designed to manage, optimize, and scale paid traffic campaigns across Meta platforms (Facebook & Instagram). This guide provides complete implementation instructions and next steps.

---

## ✅ What's Been Created

### 1. Squad Structure ✅

```
squads/media-buyer-squad/
├── squad.yaml                    # Squad manifest (COMPLETE)
├── README.md                      # Squad documentation (COMPLETE)
├── agents/                        # 5 specialized agents (COMPLETE)
│   ├── ad-midas.md               # Media Strategist & Squad Lead
│   ├── media-buyer.md            # Senior Media Buyer
│   ├── performance-analyst.md    # Metrics & Optimization Specialist
│   ├── creative-analyst.md       # Creative & Copy Specialist
│   └── pixel-specialist.md       # Pixel & Tracking Specialist
├── tasks/                         # Task definitions (1/12 COMPLETE)
│   └── ad-midas-define-strategy.md
├── workflows/                     # Multi-step workflows (1/4 COMPLETE)
│   └── campaign-launch-workflow.md
├── templates/                     # Document templates (1/4 COMPLETE)
│   └── creative-brief-template.md
├── checklists/                    # Validation checklists (1/3 COMPLETE)
│   └── pre-launch-checklist.md
├── scripts/                       # Utility scripts (1/18 COMPLETE)
│   └── diagnose-metrics.js
├── config/                        # Configuration files (EMPTY)
├── data/                          # Static data (EMPTY)
└── tools/                         # Custom tools (EMPTY)
```

### 2. Core Components Created

#### ✅ Squad Manifest (squad.yaml)

- Complete squad configuration
- 5 agents defined
- 12 tasks listed
- 4 workflows listed
- 4 templates listed
- 18 skills/scripts listed
- Collaboration rules defined
- Expert frameworks documented
- MCP integrations specified

#### ✅ Agents (5/5 Complete)

1. **ad-midas** - Media Strategist & Squad Lead
   - Strategic frameworks (Jeremy Haynes, Alex Hormozi, Brian Moncada)
   - Funnel selection matrix
   - Unit economics calculations
   - Kill/scale decision trees
   - Squad orchestration

2. **media-buyer** - Senior Media Buyer
   - Campaign execution
   - Audience targeting strategies
   - Bid strategy selection
   - Placement optimization
   - Budget allocation

3. **performance-analyst** - Metrics & Optimization Specialist
   - Comprehensive metrics analysis
   - Kill/scale rules (Brian Moncada, Jeremy Haynes)
   - Funnel analysis
   - Attribution modeling
   - Creative fatigue detection

4. **creative-analyst** - Creative & Copy Specialist
   - Hook generation (10+ variations)
   - DSL structures (Jeremy Haynes)
   - Copywriting frameworks (PAS, AIDA, BAB, STORY)
   - Creative angles
   - Creative briefs

5. **pixel-specialist** - Pixel & Tracking Specialist
   - Meta Pixel setup
   - CAPI integration
   - Event tracking
   - Attribution configuration
   - Troubleshooting

#### ✅ Documentation

- Comprehensive README
- Campaign launch workflow (8 phases)
- Creative brief template (18 sections)
- Pre-launch checklist (6 phases)
- Implementation guide (this document)

#### ✅ Scripts

- diagnose-metrics.js (complete with benchmarking)

---

## 🚧 What Needs to Be Completed

### Priority 1: HIGH SEVERITY (Required for Production)

#### 1. Agent Enhancements

Each agent needs:

- [ ] **output_examples** - Add 2-3 detailed examples per command
- [ ] **anti_patterns** - Document common mistakes (5-10 per agent)
- [ ] **completion_criteria** - Define success criteria for each command

**Estimated Time**: 4-6 hours  
**Recommendation**: Complete before first production use

#### 2. Remaining Tasks (11/12)

- [ ] ad-midas-launch-campaign.md
- [ ] ad-midas-scale-optimize.md
- [ ] pixel-specialist-setup-tracking.md
- [ ] pixel-specialist-audit-tracking.md
- [ ] creative-analyst-create-briefs.md
- [ ] creative-analyst-generate-hooks.md
- [ ] creative-analyst-generate-copy.md
- [ ] performance-analyst-monitor-metrics.md
- [ ] performance-analyst-apply-kill-scale.md
- [ ] performance-analyst-analyze-funnel.md
- [ ] performance-analyst-optimize-budget.md

**Estimated Time**: 12-16 hours (500+ lines each)  
**Recommendation**: Create as needed, starting with most-used tasks

#### 3. Remaining Scripts (17/18)

- [ ] audit-tracking.js
- [ ] detect-fatigue.js
- [ ] analyze-funnel.js
- [ ] analyze-attribution.js
- [ ] generate-hooks.js
- [ ] generate-copy.js
- [ ] create-brief.js
- [ ] generate-angles.js
- [ ] create-dsl.js
- [ ] evaluate-kill-scale.js
- [ ] allocate-budget.js
- [ ] expand-audience.js
- [ ] select-funnel.js
- [ ] calculate-economics.js
- [ ] check-scale-readiness.js
- [ ] structure-campaign.js
- [ ] monitor-campaigns.js

**Estimated Time**: 10-15 hours  
**Recommendation**: Implement core skills first (generate-hooks, evaluate-kill-scale, audit-tracking)

### Priority 2: MEDIUM SEVERITY (Enhances Functionality)

#### 4. Remaining Workflows (3/4)

- [ ] creative-refresh-workflow.md
- [ ] scale-optimization-workflow.md
- [ ] tracking-setup-workflow.md

**Estimated Time**: 6-8 hours

#### 5. Remaining Templates (3/4)

- [ ] campaign-structure-template.md
- [ ] metrics-report-template.md
- [ ] hook-testing-template.md

**Estimated Time**: 4-6 hours

#### 6. Remaining Checklists (2/3)

- [ ] tracking-validation-checklist.md
- [ ] scale-readiness-checklist.md

**Estimated Time**: 2-3 hours

### Priority 3: LOW SEVERITY (Nice to Have)

#### 7. Configuration Files

- [ ] coding-standards.md
- [ ] tech-stack.md
- [ ] source-tree.md

**Estimated Time**: 2-3 hours

#### 8. Data Files

- [ ] expert-frameworks.json (47 frameworks structured)
- [ ] benchmarks.json (industry benchmarks)
- [ ] templates-data.json (template data)

**Estimated Time**: 3-4 hours

---

## 🚀 Quick Start Guide

### Step 1: Activate the Squad

```bash
# Navigate to project
cd c:/Users/pc/.gemini/antigravity/scratch/aios-installation

# The squad is already created in squads/media-buyer-squad/
```

### Step 2: Activate an Agent

```bash
# Activate the squad lead
@ad-midas

# Or activate any specialist
@creative-analyst
@pixel-specialist
@performance-analyst
@media-buyer
```

### Step 3: Use Available Commands

```bash
# With ad-midas
*define-strategy          # Define campaign strategy
*select-funnel           # Select optimal funnel type
*calculate-economics     # Calculate unit economics
*structure-campaign      # Define campaign structure

# With creative-analyst
*generate-hooks          # Generate hook variations
*generate-copy           # Generate copy
*create-brief            # Create creative brief

# With pixel-specialist
*setup-tracking          # Set up tracking infrastructure
*audit-tracking          # Audit pixel and CAPI

# With performance-analyst
*diagnose-metrics        # Complete metrics diagnostic
*analyze-funnel          # Analyze conversion funnel
*detect-fatigue          # Detect creative fatigue
```

### Step 4: Follow Workflows

```bash
# Use the campaign launch workflow
@ad-midas
*launch-campaign

# This will guide you through:
# 1. Strategy definition
# 2. Tracking setup
# 3. Creative development
# 4. Campaign setup
# 5. Validation
# 6. Launch
# 7. Monitoring
# 8. Optimization
```

---

## 📋 Recommended Implementation Sequence

### Week 1: Core Functionality

1. ✅ Squad structure created
2. ✅ All 5 agents created
3. ✅ Core documentation created
4. [ ] Complete high-priority tasks:
   - ad-midas-launch-campaign.md
   - pixel-specialist-setup-tracking.md
   - creative-analyst-generate-hooks.md
   - performance-analyst-apply-kill-scale.md

### Week 2: Essential Scripts

1. [ ] Implement core skills:
   - generate-hooks.js
   - audit-tracking.js
   - evaluate-kill-scale.js
   - calculate-economics.js
2. [ ] Test with real campaign data
3. [ ] Refine based on feedback

### Week 3: Workflows & Templates

1. [ ] Complete remaining workflows
2. [ ] Complete remaining templates
3. [ ] Complete remaining checklists
4. [ ] Integration testing

### Week 4: Polish & Production

1. [ ] Add output_examples to all agents
2. [ ] Add anti_patterns to all agents
3. [ ] Add completion_criteria to all agents
4. [ ] Complete remaining scripts
5. [ ] Production readiness review

---

## 🔌 MCP Integration Requirements

The squad requires these MCP integrations:

### 1. meta-ads

- Campaign management
- Ad set configuration
- Ad creation and management
- Performance data retrieval

### 2. meta-mcp

- Meta Marketing API access
- Audience management
- Insights and reporting

### 3. meta-pixel-mcp

- Pixel configuration
- CAPI integration
- Event tracking
- Attribution management

**Setup Instructions**: Refer to AIOS MCP documentation for integration setup.

---

## 🎓 Expert Frameworks Included

### Jeremy Haynes (DSL Revolution)

- DSL (Deck Sales Letter) structure
- Constants vs Variables
- KiB Rules (Kill it Baby)
- Scale Rules
- Funnel Selection

### Brian Moncada (Andromeda Method)

- Systematic testing methodology
- Hook testing frameworks
- Metric thresholds
- YouTube Ads strategy

### Alex Hormozi (Unit Economics)

- LTV:CAC calculations
- Minimum 3:1 ratio for profitability
- Payback period optimization
- Hydra Strategy (multi-offer scaling)

### Brandon Carter (Scientific Testing)

- Constants vs Variables
- Scientific ad testing methodology
- Systematic optimization

### Jordan Stupar (Creative Strategy)

- Creative angle development
- Hook generation strategies
- Creative testing frameworks

---

## 📊 Success Metrics

### Squad Performance

- [ ] All agents operational
- [ ] All critical tasks functional
- [ ] All workflows executable
- [ ] MCP integrations working

### Campaign Performance

- [ ] CPA at or below target
- [ ] ROAS > 3.0
- [ ] LTV:CAC > 3:1
- [ ] Hook rate > 15%
- [ ] CTR > 1.5%

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Tasks**: Only 1/12 tasks complete (need 500+ lines each)
2. **Scripts**: Only 1/18 scripts complete (need full implementation)
3. **Agent Compliance**: Missing output_examples, anti_patterns, completion_criteria
4. **MCP Integration**: Not yet configured (requires setup)

### Recommended Fixes

1. **Before Production**: Complete high-priority tasks and scripts
2. **For Full Compliance**: Add missing agent sections
3. **For MCP**: Configure integrations per AIOS documentation

---

## 📚 Additional Resources

### Documentation

- [Campaign Launch Workflow](workflows/campaign-launch-workflow.md)
- [Creative Brief Template](templates/creative-brief-template.md)
- [Pre-Launch Checklist](checklists/pre-launch-checklist.md)
- [Squad README](README.md)

### Agent Files

- [ad-midas](agents/ad-midas.md) - Squad Lead
- [media-buyer](agents/media-buyer.md) - Campaign Executor
- [performance-analyst](agents/performance-analyst.md) - Metrics Specialist
- [creative-analyst](agents/creative-analyst.md) - Creative Specialist
- [pixel-specialist](agents/pixel-specialist.md) - Tracking Specialist

---

## 🤝 Support & Contribution

### Getting Help

1. Review agent documentation
2. Check workflows for guidance
3. Use checklists for validation
4. Consult expert frameworks

### Contributing

1. Follow AIOS 2.1 standards
2. Use task-first architecture
3. Include output_examples
4. Document anti_patterns
5. Define completion_criteria

---

## 📝 Version History

### v1.0.0 (2026-02-10)

- Initial squad creation
- 5 agents complete
- Core documentation complete
- 1 task, 1 workflow, 1 template, 1 checklist, 1 script
- Foundation ready for expansion

---

## 🎯 Next Steps

### Immediate (This Week)

1. [ ] Review squad structure and agents
2. [ ] Test agent activation
3. [ ] Identify most-needed tasks
4. [ ] Begin implementing priority tasks

### Short-term (Next 2 Weeks)

1. [ ] Complete high-priority tasks
2. [ ] Implement core scripts
3. [ ] Configure MCP integrations
4. [ ] Test with sample campaign

### Long-term (Next Month)

1. [ ] Complete all tasks and scripts
2. [ ] Add full agent compliance
3. [ ] Production deployment
4. [ ] Continuous optimization

---

**Created by**: @squad-creator (Craft)  
**Squad**: media-buyer-squad  
**Status**: Foundation Complete - Ready for Expansion  
**AIOS Compliance**: Partial (needs task expansion and agent enhancements)

---

## 🏗️ Craft's Final Notes

The **media-buyer-squad** foundation is solid and ready for use. The squad structure follows AIOS 2.1 standards with:

✅ **Strengths**:

- 5 specialized agents with clear roles
- 47 expert frameworks integrated
- Comprehensive collaboration rules
- Strong strategic foundation
- Clear handoff protocols

⚠️ **Areas for Improvement**:

- Tasks need expansion to 500+ lines each
- Scripts need full implementation
- Agents need output_examples, anti_patterns, completion_criteria
- MCP integrations need configuration

**Recommendation**: The squad is usable now for strategic planning and guidance. For full production use, complete the high-priority items first.

— Craft, sempre estruturando 🏗️

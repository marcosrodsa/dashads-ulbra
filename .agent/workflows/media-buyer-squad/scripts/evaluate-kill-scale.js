/**
 * Evaluate Kill/Scale Script
 * 
 * Applies systematic kill/scale rules based on performance data
 * Uses frameworks from Jeremy Haynes, Brian Moncada, and Alex Hormozi
 * 
 * @squad media-buyer-squad
 * @agent performance-analyst
 * @skill evaluate-kill-scale
 */

class KillScaleEvaluator {
  constructor(config) {
    this.targetCPA = config.targetCPA;
    this.targetROAS = config.targetROAS || null;
    this.ltvCacTarget = config.ltvCacTarget || 3.0;
    this.minimumConversions = config.minimumConversions || 50;
    this.minimumDays = config.minimumDays || 3;
  }

  /**
   * Evaluate all ad sets/ads
   */
  evaluate(performanceData) {
    console.log('📊 Evaluating Kill/Scale Decisions...\n');

    const decisions = {
      kill: {
        immediate: [],
        review: []
      },
      scale: {
        horizontal: [],
        vertical: [],
        creative: []
      },
      hold: []
    };

    performanceData.forEach(item => {
      const decision = this.evaluateItem(item);
      
      if (decision.action === 'KILL_IMMEDIATE') {
        decisions.kill.immediate.push({ ...item, ...decision });
      } else if (decision.action === 'KILL_REVIEW') {
        decisions.kill.review.push({ ...item, ...decision });
      } else if (decision.action === 'SCALE') {
        const method = decision.scaleMethod || 'horizontal';
        decisions.scale[method].push({ ...item, ...decision });
      } else {
        decisions.hold.push({ ...item, ...decision });
      }
    });

    const summary = this.generateSummary(decisions, performanceData);
    const actionPlan = this.generateActionPlan(decisions);

    return {
      decisions,
      summary,
      actionPlan
    };
  }

  /**
   * Evaluate single item
   */
  evaluateItem(item) {
    const {
      name,
      type, // 'adset' or 'ad'
      spend,
      conversions,
      cpa,
      roas,
      ctr,
      hookRate,
      frequency,
      cvr,
      daysRunning
    } = item;

    // Check kill criteria first
    const killDecision = this.checkKillCriteria(item);
    if (killDecision) return killDecision;

    // Check scale criteria
    const scaleDecision = this.checkScaleCriteria(item);
    if (scaleDecision) return scaleDecision;

    // Default to hold
    return this.createHoldDecision(item);
  }

  /**
   * Check kill criteria
   */
  checkKillCriteria(item) {
    const { spend, conversions, cpa, hookRate, cvr, frequency, daysRunning } = item;

    // Immediate kill criteria
    
    // 1. No conversions after $500
    if (spend >= 500 && conversions === 0) {
      return {
        action: 'KILL_IMMEDIATE',
        reason: 'No conversions after $500 spend',
        criteria: 'Spend ≥ $500, Conversions = 0',
        impact: 'High',
        savingsPerDay: Math.round(spend / daysRunning)
      };
    }

    // 2. CPA > Target × 2.0
    if (cpa && cpa > this.targetCPA * 2.0) {
      return {
        action: 'KILL_IMMEDIATE',
        reason: `CPA too high ($${cpa} vs target $${this.targetCPA})`,
        criteria: `CPA > Target × 2.0 ($${this.targetCPA * 2.0})`,
        impact: 'High',
        savingsPerDay: Math.round(spend / daysRunning)
      };
    }

    // 3. Hook rate < 10% (after 1000 impressions)
    if (hookRate !== undefined && hookRate < 10 && item.impressions > 1000) {
      return {
        action: 'KILL_IMMEDIATE',
        reason: `Hook rate too low (${hookRate}%)`,
        criteria: 'Hook Rate < 10%, Impressions > 1000',
        impact: 'High',
        savingsPerDay: Math.round(spend / daysRunning)
      };
    }

    // 4. CVR < 0.5% (after 200 clicks)
    if (cvr !== undefined && cvr < 0.5 && item.clicks > 200) {
      return {
        action: 'KILL_IMMEDIATE',
        reason: `CVR too low (${cvr}%)`,
        criteria: 'CVR < 0.5%, Clicks > 200',
        impact: 'High',
        savingsPerDay: Math.round(spend / daysRunning)
      };
    }

    // Kill after 3 days criteria
    if (daysRunning >= 3) {
      // 5. CPA > Target × 1.5
      if (cpa && cpa > this.targetCPA * 1.5) {
        return {
          action: 'KILL_REVIEW',
          reason: `CPA above threshold ($${cpa} vs target $${this.targetCPA})`,
          criteria: `CPA > Target × 1.5 ($${this.targetCPA * 1.5})`,
          impact: 'Medium',
          savingsPerDay: Math.round(spend / daysRunning),
          reviewDays: 1
        };
      }

      // 6. ROAS < 1.5 (if e-commerce)
      if (this.targetROAS && roas !== undefined && roas < 1.5) {
        return {
          action: 'KILL_REVIEW',
          reason: `ROAS too low (${roas})`,
          criteria: 'ROAS < 1.5',
          impact: 'High',
          savingsPerDay: Math.round(spend / daysRunning),
          reviewDays: 1
        };
      }

      // 7. Creative fatigue
      if (frequency && frequency > 4.0) {
        return {
          action: 'KILL_REVIEW',
          reason: `Creative fatigue (frequency ${frequency})`,
          criteria: 'Frequency > 4.0',
          impact: 'Medium',
          savingsPerDay: Math.round(spend / daysRunning),
          alternative: 'Consider refreshing creative instead'
        };
      }
    }

    return null;
  }

  /**
   * Check scale criteria
   */
  checkScaleCriteria(item) {
    const { conversions, cpa, roas, frequency, daysRunning, dailyConversions } = item;

    // Need minimum data
    if (daysRunning < this.minimumDays) return null;
    if (conversions < 10) return null;

    // All criteria must pass
    const criteria = [];

    // 1. CPA < Target × 0.8
    if (cpa && cpa < this.targetCPA * 0.8) {
      criteria.push('CPA below target');
    } else {
      return null; // Fail fast
    }

    // 2. ROAS > 3.0 (if applicable)
    if (this.targetROAS) {
      if (roas && roas > 3.0) {
        criteria.push('ROAS > 3.0');
      } else {
        return null; // Fail fast
      }
    }

    // 3. Not saturated (frequency < 3.0)
    if (frequency && frequency < 3.0) {
      criteria.push('Not saturated');
    } else {
      return null; // Fail fast
    }

    // 4. Sufficient volume (> 10 conversions/day ideal)
    const hasVolume = dailyConversions && dailyConversions > 5;

    // Determine scale method
    let scaleMethod = 'horizontal';
    let scaleAction = '';

    if (hasVolume && frequency < 2.5) {
      scaleMethod = 'horizontal';
      scaleAction = 'Duplicate to new audiences (LAL, interests)';
    } else if (hasVolume) {
      scaleMethod = 'vertical';
      scaleAction = 'Increase budget 20%';
    } else {
      scaleMethod = 'creative';
      scaleAction = 'Add new creative variations';
    }

    return {
      action: 'SCALE',
      scaleMethod,
      reason: `Excellent performance (CPA $${cpa}, ROAS ${roas || 'N/A'})`,
      criteria: criteria.join(', '),
      impact: 'High',
      scaleAction,
      expectedAdditionalConversions: Math.round(dailyConversions * 0.5),
      expectedCPA: Math.round(cpa * 1.1) // Expect 10% CPA increase
    };
  }

  /**
   * Create hold decision
   */
  createHoldDecision(item) {
    const { daysRunning, conversions, cpa } = item;

    let reason = 'Monitor';
    let holdDays = 2;

    if (daysRunning < 3) {
      reason = 'Insufficient data (< 3 days)';
      holdDays = 3 - daysRunning;
    } else if (conversions < 10) {
      reason = 'Insufficient conversions (< 10)';
      holdDays = 2;
    } else if (cpa && cpa >= this.targetCPA * 0.8 && cpa <= this.targetCPA * 1.2) {
      reason = 'Performance at target';
      holdDays = 3;
    }

    return {
      action: 'HOLD',
      reason,
      holdDays,
      nextReview: new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
  }

  /**
   * Generate summary
   */
  generateSummary(decisions, performanceData) {
    const totalItems = performanceData.length;
    const killCount = decisions.kill.immediate.length + decisions.kill.review.length;
    const scaleCount = Object.values(decisions.scale).reduce((sum, arr) => sum + arr.length, 0);
    const holdCount = decisions.hold.length;

    const budgetSaved = decisions.kill.immediate.reduce((sum, item) => sum + (item.savingsPerDay || 0), 0);
    const additionalConversions = Object.values(decisions.scale)
      .flat()
      .reduce((sum, item) => sum + (item.expectedAdditionalConversions || 0), 0);

    return {
      totalItems,
      decisions: {
        kill: killCount,
        scale: scaleCount,
        hold: holdCount
      },
      impact: {
        budgetSaved: Math.round(budgetSaved),
        additionalConversions: Math.round(additionalConversions),
        expectedConversionIncrease: totalItems > 0 ? Math.round((additionalConversions / totalItems) * 100) : 0
      }
    };
  }

  /**
   * Generate action plan
   */
  generateActionPlan(decisions) {
    const plan = {
      immediate: [],
      shortTerm: [],
      ongoing: []
    };

    // Immediate: Kill underperformers
    if (decisions.kill.immediate.length > 0) {
      plan.immediate.push({
        action: 'Pause underperforming ad sets/ads',
        items: decisions.kill.immediate.map(item => item.name),
        owner: '@ad-midas or @media-buyer',
        timeline: 'Today',
        impact: `Save $${decisions.kill.immediate.reduce((sum, item) => sum + (item.savingsPerDay || 0), 0)}/day`
      });
    }

    // Short-term: Scale winners
    Object.keys(decisions.scale).forEach(method => {
      if (decisions.scale[method].length > 0) {
        plan.shortTerm.push({
          action: `${method.charAt(0).toUpperCase() + method.slice(1)} scaling`,
          items: decisions.scale[method].map(item => item.name),
          owner: '@media-buyer',
          timeline: 'Tomorrow',
          impact: `+${decisions.scale[method].reduce((sum, item) => sum + (item.expectedAdditionalConversions || 0), 0)} conversions/day`
        });
      }
    });

    // Ongoing: Monitor hold list
    if (decisions.hold.length > 0) {
      plan.ongoing.push({
        action: 'Monitor hold list',
        items: decisions.hold.map(item => item.name),
        owner: '@performance-analyst',
        timeline: 'Daily',
        impact: 'Make decisions when sufficient data'
      });
    }

    return plan;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n📊 KILL/SCALE EVALUATION REPORT\n');
    console.log('═'.repeat(60));

    console.log('\n📈 SUMMARY\n');
    console.log(`Total Items Analyzed: ${result.summary.totalItems}`);
    console.log(`\nDecisions:`);
    console.log(`  KILL: ${result.summary.decisions.kill}`);
    console.log(`  SCALE: ${result.summary.decisions.scale}`);
    console.log(`  HOLD: ${result.summary.decisions.hold}`);
    console.log(`\nExpected Impact:`);
    console.log(`  Budget Saved: $${result.summary.impact.budgetSaved}/day`);
    console.log(`  Additional Conversions: +${result.summary.impact.additionalConversions}/day`);
    console.log(`  Conversion Increase: +${result.summary.impact.expectedConversionIncrease}%`);

    if (result.decisions.kill.immediate.length > 0) {
      console.log('\n\n❌ KILL IMMEDIATELY\n');
      console.log('─'.repeat(60));
      result.decisions.kill.immediate.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.name}`);
        console.log(`   Reason: ${item.reason}`);
        console.log(`   Criteria: ${item.criteria}`);
        console.log(`   Savings: $${item.savingsPerDay}/day`);
      });
    }

    if (result.decisions.kill.review.length > 0) {
      console.log('\n\n⚠️ KILL AFTER REVIEW\n');
      console.log('─'.repeat(60));
      result.decisions.kill.review.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.name}`);
        console.log(`   Reason: ${item.reason}`);
        console.log(`   Criteria: ${item.criteria}`);
        console.log(`   Review in: ${item.reviewDays} day(s)`);
      });
    }

    const allScaleItems = [
      ...result.decisions.scale.horizontal,
      ...result.decisions.scale.vertical,
      ...result.decisions.scale.creative
    ];

    if (allScaleItems.length > 0) {
      console.log('\n\n🚀 SCALE\n');
      console.log('─'.repeat(60));
      allScaleItems.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.name}`);
        console.log(`   Method: ${item.scaleMethod}`);
        console.log(`   Action: ${item.scaleAction}`);
        console.log(`   Expected: +${item.expectedAdditionalConversions} conversions/day`);
        console.log(`   Expected CPA: $${item.expectedCPA}`);
      });
    }

    if (result.decisions.hold.length > 0) {
      console.log('\n\n⏸️ HOLD/MONITOR\n');
      console.log('─'.repeat(60));
      result.decisions.hold.forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.name}`);
        console.log(`   Reason: ${item.reason}`);
        console.log(`   Next Review: ${item.nextReview}`);
      });
    }

    console.log('\n\n📋 ACTION PLAN\n');
    console.log('─'.repeat(60));
    
    if (result.actionPlan.immediate.length > 0) {
      console.log('\nIMMEDIATE (Today):');
      result.actionPlan.immediate.forEach(action => {
        console.log(`  • ${action.action}`);
        console.log(`    Owner: ${action.owner}`);
        console.log(`    Impact: ${action.impact}`);
      });
    }

    if (result.actionPlan.shortTerm.length > 0) {
      console.log('\nSHORT-TERM (Tomorrow):');
      result.actionPlan.shortTerm.forEach(action => {
        console.log(`  • ${action.action}`);
        console.log(`    Owner: ${action.owner}`);
        console.log(`    Impact: ${action.impact}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Evaluation complete!\n');
  }
}

module.exports = KillScaleEvaluator;

// CLI usage
if (require.main === module) {
  const evaluator = new KillScaleEvaluator({
    targetCPA: 150,
    targetROAS: 3.0,
    ltvCacTarget: 3.0,
    minimumConversions: 50,
    minimumDays: 3
  });

  // Example performance data
  const performanceData = [
    {
      name: 'LAL 1% Purchasers',
      type: 'adset',
      spend: 500,
      conversions: 25,
      cpa: 20,
      roas: 8.5,
      ctr: 2.1,
      hookRate: 18,
      frequency: 2.1,
      cvr: 3.2,
      daysRunning: 5,
      dailyConversions: 5,
      impressions: 50000,
      clicks: 1050
    },
    {
      name: 'Interest Stack - Marketing Tools',
      type: 'adset',
      spend: 450,
      conversions: 0,
      cpa: null,
      roas: null,
      ctr: 0.8,
      hookRate: 9,
      frequency: 2.5,
      cvr: null,
      daysRunning: 4,
      dailyConversions: 0,
      impressions: 45000,
      clicks: 360
    },
    {
      name: 'LAL 2-3% Purchasers',
      type: 'adset',
      spend: 150,
      conversions: 3,
      cpa: 50,
      roas: 6.0,
      ctr: 1.8,
      hookRate: 16,
      frequency: 1.8,
      cvr: 2.5,
      daysRunning: 2,
      dailyConversions: 1.5,
      impressions: 15000,
      clicks: 270
    }
  ];

  const result = evaluator.evaluate(performanceData);
  evaluator.formatOutput(result);
}

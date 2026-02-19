/**
 * Generate Hooks Script
 * 
 * Generates high-performing hook variations using proven frameworks
 * from Jeremy Haynes, Brian Moncada, and Jordan Stupar
 * 
 * @squad media-buyer-squad
 * @agent creative-analyst
 * @skill generate-hooks
 */

const fs = require('fs');
const path = require('path');

class HookGenerator {
  constructor(config = {}) {
    this.targetAudience = config.targetAudience || {};
    this.painPoints = config.painPoints || [];
    this.desiredOutcomes = config.desiredOutcomes || [];
    this.productInfo = config.productInfo || {};
    this.hookCount = config.hookCount || 10;
    
    // Hook type templates
    this.hookTypes = {
      patternInterrupt: {
        name: 'Pattern Interrupt',
        templates: [
          'Stop {action} if you\'re {pain_point}...',
          'If you\'re still {mistake}, you\'re {consequence}...',
          'This {descriptor} but it works...',
          '{Unexpected_statement} and here\'s why...',
          'I\'m about to show you something {descriptor}...'
        ],
        expectedHookRate: [15, 20]
      },
      curiosityGap: {
        name: 'Curiosity Gap',
        templates: [
          'The #1 {mistake/reason} that\'s {consequence}...',
          'What {authority} doesn\'t tell you about {topic}...',
          'The secret that {social_proof} use to {outcome}...',
          'I spent ${amount} on {topic} so you don\'t have to make these mistakes...',
          '{Number} things nobody tells you about {topic}...',
          'Why {common_belief} is actually {truth}...'
        ],
        expectedHookRate: [18, 25]
      },
      socialProof: {
        name: 'Social Proof',
        templates: [
          'How {we/I} went from {before} to {after} in {timeframe}...',
          'The exact system {number}+ {people} use to {outcome}...',
          'From {before} to {after} with this {method}...',
          '{Authority/Name} used this to {achievement}...',
          'How {number} {people} achieved {outcome} using {method}...'
        ],
        expectedHookRate: [17, 23]
      },
      problemAgitation: {
        name: 'Problem Agitation',
        templates: [
          'Struggling with {problem}? Here\'s why...',
          'If you\'re {symptom}, you\'re missing {solution}...',
          'Your {metric} is {symptom}? This is the problem...',
          'The reason you can\'t {goal} is {reason}...',
          'Still {old_way}? That\'s why you\'re {consequence}...'
        ],
        expectedHookRate: [16, 22]
      },
      directBenefit: {
        name: 'Direct Benefit',
        templates: [
          '{Outcome} in {timeframe} without {objection}...',
          'The fastest way to {outcome} (even if {objection})...',
          'Get {outcome} without {objection_1} or {objection_2}...',
          'How to {outcome} in {timeframe} starting {when}...',
          '{Outcome} guaranteed in {timeframe} or {guarantee}...'
        ],
        expectedHookRate: [15, 20]
      }
    };
  }

  /**
   * Generate all hook variations
   */
  generate() {
    console.log('✨ Generating Hook Variations...\n');

    const hooks = {
      patternInterrupt: this.generatePatternInterruptHooks(3),
      curiosityGap: this.generateCuriosityGapHooks(4),
      socialProof: this.generateSocialProofHooks(3),
      problemAgitation: this.generateProblemAgitationHooks(3),
      directBenefit: this.generateDirectBenefitHooks(2)
    };

    const allHooks = this.flattenHooks(hooks);
    const testingMatrix = this.createTestingMatrix(allHooks);
    const recommendations = this.generateRecommendations(allHooks);

    return {
      hooks,
      allHooks,
      testingMatrix,
      recommendations,
      summary: this.generateSummary(allHooks)
    };
  }

  /**
   * Generate Pattern Interrupt hooks
   */
  generatePatternInterruptHooks(count) {
    const hooks = [];
    const templates = this.hookTypes.patternInterrupt.templates;

    // Example 1: Stop + pain point
    if (this.painPoints.length > 0) {
      hooks.push({
        text: `Stop wasting money on ads that don't convert...`,
        type: 'Pattern Interrupt + Problem Agitation',
        targetPainPoint: this.painPoints[0] || 'Wasting money on ads',
        expectedHookRate: [15, 20],
        reasoning: 'Direct pattern interrupt addressing primary pain point'
      });
    }

    // Example 2: If you're still + mistake
    hooks.push({
      text: `If you're still doing this with your ads, you're bleeding cash...`,
      type: 'Pattern Interrupt + Problem Agitation',
      targetPainPoint: 'Making costly mistakes',
      expectedHookRate: [15, 20],
      reasoning: 'Creates urgency and fear of loss'
    });

    // Example 3: This is weird but...
    hooks.push({
      text: `This ad mistake is costing you $10K+/month (and you don't even know it)...`,
      type: 'Pattern Interrupt + Curiosity',
      targetPainPoint: 'Unaware of specific mistake',
      expectedHookRate: [18, 22],
      reasoning: 'Combines pattern interrupt with specific consequence'
    });

    return hooks.slice(0, count);
  }

  /**
   * Generate Curiosity Gap hooks
   */
  generateCuriosityGapHooks(count) {
    const hooks = [];

    // Example 1: The #1 reason
    hooks.push({
      text: `The #1 reason your ads aren't converting (it's not what you think)...`,
      type: 'Curiosity Gap',
      targetPainPoint: 'Underperforming ads',
      expectedHookRate: [20, 25],
      reasoning: 'Strong curiosity gap with unexpected twist'
    });

    // Example 2: What [authority] doesn't tell you
    hooks.push({
      text: `What Meta doesn't tell you about scaling ads...`,
      type: 'Curiosity Gap + Authority',
      targetPainPoint: 'Struggling to scale',
      expectedHookRate: [18, 23],
      reasoning: 'Authority angle creates credibility and curiosity'
    });

    // Example 3: The secret that [social proof]
    hooks.push({
      text: `The secret that 7-figure brands use to scale profitably...`,
      type: 'Curiosity Gap + Social Proof',
      targetPainPoint: 'Want proven system',
      expectedHookRate: [22, 27],
      reasoning: 'Combines social proof with exclusive knowledge'
    });

    // Example 4: I spent $X so you don't have to
    hooks.push({
      text: `I spent $2M on ads so you don't have to make these mistakes...`,
      type: 'Curiosity Gap + Social Proof',
      targetPainPoint: 'Fear of wasting money',
      expectedHookRate: [20, 25],
      reasoning: 'Personal investment creates authority and value'
    });

    return hooks.slice(0, count);
  }

  /**
   * Generate Social Proof hooks
   */
  generateSocialProofHooks(count) {
    const hooks = [];

    // Example 1: How we scaled from X to Y
    hooks.push({
      text: `How we scaled from $5K to $50K/month in 90 days...`,
      type: 'Social Proof + Transformation',
      targetOutcome: 'Scale to $50K+/month',
      expectedHookRate: [18, 23],
      reasoning: 'Specific numbers and timeframe create credibility'
    });

    // Example 2: The exact system [number]+ use
    hooks.push({
      text: `The exact system 500+ brands use to scale ads profitably...`,
      type: 'Social Proof + Authority',
      targetOutcome: 'Proven system',
      expectedHookRate: [17, 22],
      reasoning: 'Large number of users validates effectiveness'
    });

    // Example 3: From $0 to $X
    hooks.push({
      text: `From $0 to $100K/month with this ad framework...`,
      type: 'Social Proof + Transformation',
      targetOutcome: 'Massive growth',
      expectedHookRate: [19, 24],
      reasoning: 'Zero to hero story is highly aspirational'
    });

    return hooks.slice(0, count);
  }

  /**
   * Generate Problem Agitation hooks
   */
  generateProblemAgitationHooks(count) {
    const hooks = [];

    // Example 1: Struggling with X?
    hooks.push({
      text: `Struggling to scale past $10K/month? Here's why...`,
      type: 'Problem Agitation + Curiosity',
      targetPainPoint: 'Stuck at plateau',
      expectedHookRate: [16, 21],
      reasoning: 'Directly addresses common plateau problem'
    });

    // Example 2: Your X is Y? This is the problem
    hooks.push({
      text: `Your ads are getting clicks but no sales? This is the problem...`,
      type: 'Problem Agitation + Solution',
      targetPainPoint: 'Traffic but no conversions',
      expectedHookRate: [17, 22],
      reasoning: 'Identifies specific symptom and promises solution'
    });

    // Example 3: If your X, you're missing Y
    hooks.push({
      text: `If your CPA keeps rising, you're missing this one thing...`,
      type: 'Problem Agitation + Curiosity',
      targetPainPoint: 'Rising costs',
      expectedHookRate: [18, 23],
      reasoning: 'Agitates pain and creates curiosity for solution'
    });

    return hooks.slice(0, count);
  }

  /**
   * Generate Direct Benefit hooks
   */
  generateDirectBenefitHooks(count) {
    const hooks = [];

    // Example 1: Outcome in timeframe without objection
    hooks.push({
      text: `Scale to $50K/month in 90 days without wasting money on testing...`,
      type: 'Direct Benefit + Objection Removal',
      targetOutcome: 'Fast, safe growth',
      expectedHookRate: [15, 20],
      reasoning: 'Clear outcome with removed objection'
    });

    // Example 2: Fastest way (even if objection)
    hooks.push({
      text: `The fastest way to profitable ad campaigns (even if you've failed before)...`,
      type: 'Direct Benefit + Objection Removal',
      targetOutcome: 'Success after failure',
      expectedHookRate: [16, 21],
      reasoning: 'Addresses past failures and promises speed'
    });

    return hooks.slice(0, count);
  }

  /**
   * Flatten hooks into single array
   */
  flattenHooks(hooks) {
    const flattened = [];
    let index = 1;

    Object.keys(hooks).forEach(type => {
      hooks[type].forEach(hook => {
        flattened.push({
          id: index++,
          ...hook,
          category: this.hookTypes[type]?.name || type
        });
      });
    });

    return flattened;
  }

  /**
   * Create testing matrix (hooks × angles)
   */
  createTestingMatrix(hooks) {
    const angles = [
      {
        name: 'Mechanism',
        description: 'Focus on the unique system/method',
        example: 'The 3-step framework that...'
      },
      {
        name: 'Transformation',
        description: 'Focus on the journey',
        example: 'How I went from X to Y...'
      },
      {
        name: 'Authority',
        description: 'Focus on credibility',
        example: 'After spending $2M on ads, here\'s what I learned...'
      }
    ];

    // Select top 6 hooks for initial test
    const topHooks = this.selectTopHooks(hooks, 6);

    const matrix = topHooks.map((hook, i) => ({
      hookId: hook.id,
      hookText: hook.text,
      hookType: hook.type,
      angles: angles.slice(0, 2).map((angle, j) => ({
        angleName: angle.name,
        adNumber: (i * 2) + j + 1,
        combination: `Hook ${hook.id} × ${angle.name}`
      }))
    }));

    return {
      angles,
      matrix,
      totalAds: topHooks.length * 2,
      recommendation: 'Launch 6 hooks × 2 angles = 12 ads for initial test'
    };
  }

  /**
   * Select top hooks for testing
   */
  selectTopHooks(hooks, count) {
    // Prioritize by expected hook rate and diversity
    const prioritized = [...hooks].sort((a, b) => {
      const aRate = (a.expectedHookRate[0] + a.expectedHookRate[1]) / 2;
      const bRate = (b.expectedHookRate[0] + b.expectedHookRate[1]) / 2;
      return bRate - aRate;
    });

    // Ensure diversity of hook types
    const selected = [];
    const typeCount = {};

    for (const hook of prioritized) {
      const baseType = hook.type.split('+')[0].trim();
      typeCount[baseType] = (typeCount[baseType] || 0) + 1;

      // Limit to 2 per type for diversity
      if (typeCount[baseType] <= 2 && selected.length < count) {
        selected.push(hook);
      }

      if (selected.length >= count) break;
    }

    return selected;
  }

  /**
   * Generate testing recommendations
   */
  generateRecommendations(hooks) {
    const topHooks = this.selectTopHooks(hooks, 6);

    return {
      phase1: {
        name: 'Initial Test',
        duration: 'Day 1-5',
        actions: [
          `Launch ${topHooks.length} hooks × 2 angles = ${topHooks.length * 2} ads`,
          'Equal budget distribution ($50-100/day per ad set)',
          'Let algorithm learn (no changes for 3 days)',
          'Monitor hook rate and CTR daily'
        ],
        successCriteria: [
          'Hook Rate > 15% (keep)',
          'Hook Rate < 10% (kill)',
          'CTR > 1.5% (good)'
        ]
      },
      phase2: {
        name: 'Optimization',
        duration: 'Day 6-10',
        actions: [
          'Kill bottom 50% (lowest hook rate)',
          'Keep top 50%',
          'Add 3 new variations to winners',
          `Total: ${Math.ceil(topHooks.length * 2 * 0.5) + 3} ads running`
        ]
      },
      phase3: {
        name: 'Scaling',
        duration: 'Day 11+',
        actions: [
          'Scale top 3 performers',
          'Continuous testing of new hooks',
          'Refresh when frequency > 3.5'
        ]
      },
      benchmarks: {
        hookRate: {
          poor: '< 10%',
          fair: '10-15%',
          good: '15-20%',
          great: '20-25%',
          excellent: '> 25%'
        },
        ctr: {
          cold: '> 1.5%',
          warm: '> 3.0%',
          hot: '> 5.0%'
        }
      }
    };
  }

  /**
   * Generate summary
   */
  generateSummary(hooks) {
    const typeDistribution = {};
    hooks.forEach(hook => {
      const baseType = hook.category;
      typeDistribution[baseType] = (typeDistribution[baseType] || 0) + 1;
    });

    const avgHookRate = hooks.reduce((sum, hook) => {
      return sum + (hook.expectedHookRate[0] + hook.expectedHookRate[1]) / 2;
    }, 0) / hooks.length;

    return {
      totalHooks: hooks.length,
      typeDistribution,
      expectedHookRateRange: [15, 25],
      averageExpectedHookRate: Math.round(avgHookRate * 10) / 10,
      recommendedForTesting: 6,
      totalAdsForInitialTest: 12
    };
  }

  /**
   * Format output for display
   */
  formatOutput(result) {
    console.log('✨ Hook Variations Generated\n');
    console.log('═'.repeat(60));
    
    console.log('\n📊 SUMMARY\n');
    console.log(`Total Hooks: ${result.summary.totalHooks}`);
    console.log(`Expected Hook Rate: ${result.summary.expectedHookRateRange[0]}-${result.summary.expectedHookRateRange[1]}%`);
    console.log(`Recommended for Testing: ${result.summary.recommendedForTesting} hooks (${result.summary.totalAdsForInitialTest} ads)`);
    
    console.log('\n📝 HOOKS BY TYPE\n');
    
    Object.keys(result.hooks).forEach(type => {
      const typeName = this.hookTypes[type]?.name || type;
      console.log(`\n${typeName.toUpperCase()} (${result.hooks[type].length})`);
      console.log('─'.repeat(60));
      
      result.hooks[type].forEach((hook, i) => {
        console.log(`\n${i + 1}. "${hook.text}"`);
        console.log(`   Type: ${hook.type}`);
        console.log(`   Target: ${hook.targetPainPoint || hook.targetOutcome}`);
        console.log(`   Expected Hook Rate: ${hook.expectedHookRate[0]}-${hook.expectedHookRate[1]}%`);
        console.log(`   Reasoning: ${hook.reasoning}`);
      });
    });

    console.log('\n\n🎯 TESTING MATRIX\n');
    console.log('─'.repeat(60));
    console.log(`Total Ads for Initial Test: ${result.testingMatrix.totalAds}`);
    console.log(`\n${result.testingMatrix.recommendation}\n`);

    result.testingMatrix.matrix.forEach((item, i) => {
      console.log(`\nHook ${item.hookId}: "${item.hookText}"`);
      item.angles.forEach(angle => {
        console.log(`  → Ad ${angle.adNumber}: ${angle.combination}`);
      });
    });

    console.log('\n\n📈 TESTING RECOMMENDATIONS\n');
    console.log('─'.repeat(60));
    
    Object.keys(result.recommendations).forEach(phase => {
      if (phase === 'benchmarks') return;
      
      const phaseData = result.recommendations[phase];
      console.log(`\n${phaseData.name.toUpperCase()} (${phaseData.duration})`);
      phaseData.actions.forEach(action => {
        console.log(`  • ${action}`);
      });
      
      if (phaseData.successCriteria) {
        console.log('\n  Success Criteria:');
        phaseData.successCriteria.forEach(criteria => {
          console.log(`    ✓ ${criteria}`);
        });
      }
    });

    console.log('\n\n📊 PERFORMANCE BENCHMARKS\n');
    console.log('─'.repeat(60));
    console.log('\nHook Rate:');
    Object.keys(result.recommendations.benchmarks.hookRate).forEach(level => {
      console.log(`  ${level}: ${result.recommendations.benchmarks.hookRate[level]}`);
    });

    console.log('\n═'.repeat(60));
    console.log('\n✅ Hook generation complete!\n');
  }

  /**
   * Save to file
   */
  saveToFile(result, filename = 'generated-hooks.json') {
    const outputPath = path.join(__dirname, '..', 'data', filename);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Saved to: ${outputPath}`);
  }
}

// Export for use in AIOS
module.exports = HookGenerator;

// CLI usage
if (require.main === module) {
  const generator = new HookGenerator({
    targetAudience: {
      description: 'Online entrepreneurs and e-commerce brands',
      awarenessLevel: 'Problem-Aware'
    },
    painPoints: [
      'Wasting money on ads that don\'t convert',
      'Can\'t scale past $10K/month',
      'No time to learn complex ad strategies',
      'Don\'t trust "gurus" anymore',
      'Fear of losing more money'
    ],
    desiredOutcomes: [
      'Scale to $50K+/month profitably',
      'Know exactly what to do',
      'Get results fast',
      'Have confidence in scaling',
      'Stop wasting money'
    ],
    productInfo: {
      name: 'Ad Scaling Framework',
      price: 997,
      type: 'Course + Coaching'
    },
    hookCount: 15
  });

  const result = generator.generate();
  generator.formatOutput(result);
  generator.saveToFile(result);
}

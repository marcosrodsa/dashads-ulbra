/**
 * Create DSL Script
 * 
 * Creates DSL (Direct Scroll-Stopping Language) structures
 * Based on Jeremy Haynes' DSL Revolution framework
 * 
 * @squad media-buyer-squad
 * @agent creative-analyst
 * @skill create-dsl
 */

class DSLCreator {
  constructor(config = {}) {
    this.productInfo = config.productInfo || {};
  }

  /**
   * Create DSL structure
   */
  create(input) {
    console.log('🎬 Creating DSL Structure...\n');

    const dsl = {
      hook: this.createHook(input.hook),
      body: this.createBody(input),
      cta: this.createCTA(input.cta),
      constants: this.identifyConstants(input),
      variables: this.identifyVariables(input)
    };

    return {
      dsl,
      testingMatrix: this.createTestingMatrix(dsl),
      recommendations: this.generateRecommendations(dsl)
    };
  }

  /**
   * Create hook structure
   */
  createHook(hookInput) {
    return {
      text: hookInput || 'Struggling to scale past $10K/month?',
      duration: '0-3 seconds',
      visual: 'Face to camera, direct eye contact',
      audio: 'Clear, confident delivery',
      purpose: 'Stop scroll, create pattern interrupt',
      testVariations: [
        'Original hook',
        'Hook + stat',
        'Hook + visual proof'
      ]
    };
  }

  /**
   * Create body structure
   */
  createBody(input) {
    return {
      problem: {
        text: input.problem || 'You\'re spending hours testing, burning budget, no results',
        duration: '3-8 seconds',
        visual: 'Show pain point, relatable scenario',
        purpose: 'Agitate problem'
      },
      solution: {
        text: input.solution || 'The 3-step framework that took me from $5K to $50K/month',
        duration: '8-15 seconds',
        visual: 'Show transformation, results, proof',
        purpose: 'Present solution'
      },
      proof: {
        text: input.proof || 'Same system 500+ brands use',
        duration: '15-20 seconds',
        visual: 'Social proof, testimonials, results',
        purpose: 'Build credibility'
      }
    };
  }

  /**
   * Create CTA structure
   */
  createCTA(ctaInput) {
    return {
      text: ctaInput || 'Click below to get the framework',
      duration: '20-25 seconds',
      visual: 'Clear button, arrow pointing down',
      audio: 'Direct, action-oriented',
      purpose: 'Drive action',
      variations: [
        'Click below to [benefit]',
        'Tap the link to [benefit]',
        'Get [thing] now'
      ]
    };
  }

  /**
   * Identify constants (elements that stay the same)
   */
  identifyConstants(input) {
    return {
      offer: input.offer || 'The framework',
      price: input.price || '$997',
      guarantee: input.guarantee || '30-day money-back guarantee',
      format: 'Video, 9:16, 15-30s',
      style: 'UGC, authentic, mobile-first'
    };
  }

  /**
   * Identify variables (elements to test)
   */
  identifyVariables(input) {
    return {
      hooks: input.hooks || [
        'Hook 1: Problem-focused',
        'Hook 2: Curiosity-focused',
        'Hook 3: Social proof-focused'
      ],
      angles: input.angles || [
        'Angle A: Mechanism',
        'Angle B: Transformation',
        'Angle C: Authority'
      ],
      visuals: [
        'Face to camera',
        'Screen recording',
        'B-roll + voiceover'
      ],
      music: [
        'Upbeat',
        'Dramatic',
        'No music (voiceover only)'
      ]
    };
  }

  /**
   * Create testing matrix
   */
  createTestingMatrix(dsl) {
    const matrix = [];

    // Test hooks (constants stay same, hooks change)
    dsl.variables.hooks.forEach((hook, i) => {
      matrix.push({
        adNumber: i + 1,
        hook: hook,
        angle: dsl.variables.angles[0], // Keep angle constant
        visual: dsl.variables.visuals[0], // Keep visual constant
        purpose: 'Test hook performance'
      });
    });

    return {
      phase1: {
        name: 'Hook Testing',
        ads: matrix,
        duration: '3-5 days',
        successMetric: 'Hook rate > 15%'
      },
      phase2: {
        name: 'Angle Testing',
        description: 'Test winning hook with different angles',
        duration: '3-5 days',
        successMetric: 'CTR > 1.5%'
      },
      phase3: {
        name: 'Visual Testing',
        description: 'Test winning hook+angle with different visuals',
        duration: '3-5 days',
        successMetric: 'Conversion rate improvement'
      }
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(dsl) {
    return [
      {
        priority: 'CRITICAL',
        category: 'Constants vs Variables',
        action: 'Only test ONE variable at a time',
        reasoning: 'Testing multiple variables makes it impossible to know what worked'
      },
      {
        priority: 'HIGH',
        category: 'Hook',
        action: 'Test 3-6 hooks first',
        reasoning: 'Hook is the most important element (determines hook rate)'
      },
      {
        priority: 'HIGH',
        category: 'Duration',
        action: 'Keep videos 15-30 seconds',
        reasoning: 'Optimal length for attention span and message delivery'
      },
      {
        priority: 'MEDIUM',
        category: 'Visual',
        action: 'Start with face-to-camera',
        reasoning: 'Most authentic, builds trust fastest'
      },
      {
        priority: 'MEDIUM',
        category: 'Testing',
        action: 'Run each test for minimum 3 days',
        reasoning: 'Need sufficient data for statistical significance'
      }
    ];
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🎬 DSL STRUCTURE\n');
    console.log('═'.repeat(60));

    console.log('\n🎯 HOOK (0-3s)\n');
    console.log(`Text: "${result.dsl.hook.text}"`);
    console.log(`Visual: ${result.dsl.hook.visual}`);
    console.log(`Audio: ${result.dsl.hook.audio}`);
    console.log(`Purpose: ${result.dsl.hook.purpose}`);

    console.log('\n\n📝 BODY\n');
    console.log('─'.repeat(60));
    
    console.log('\nProblem (3-8s):');
    console.log(`  Text: "${result.dsl.body.problem.text}"`);
    console.log(`  Visual: ${result.dsl.body.problem.visual}`);

    console.log('\nSolution (8-15s):');
    console.log(`  Text: "${result.dsl.body.solution.text}"`);
    console.log(`  Visual: ${result.dsl.body.solution.visual}`);

    console.log('\nProof (15-20s):');
    console.log(`  Text: "${result.dsl.body.proof.text}"`);
    console.log(`  Visual: ${result.dsl.body.proof.visual}`);

    console.log('\n\n📢 CTA (20-25s)\n');
    console.log(`Text: "${result.dsl.cta.text}"`);
    console.log(`Visual: ${result.dsl.cta.visual}`);

    console.log('\n\n🔒 CONSTANTS (Keep Same)\n');
    console.log('─'.repeat(60));
    Object.keys(result.dsl.constants).forEach(key => {
      console.log(`${key}: ${result.dsl.constants[key]}`);
    });

    console.log('\n\n🔄 VARIABLES (Test These)\n');
    console.log('─'.repeat(60));
    Object.keys(result.dsl.variables).forEach(key => {
      console.log(`\n${key}:`);
      result.dsl.variables[key].forEach((item, i) => {
        console.log(`  ${i + 1}. ${item}`);
      });
    });

    console.log('\n\n🧪 TESTING MATRIX\n');
    console.log('─'.repeat(60));
    
    Object.keys(result.testingMatrix).forEach(phase => {
      const p = result.testingMatrix[phase];
      console.log(`\n${p.name}`);
      if (p.description) {
        console.log(`Description: ${p.description}`);
      }
      console.log(`Duration: ${p.duration}`);
      console.log(`Success Metric: ${p.successMetric}`);
      if (p.ads) {
        console.log(`Ads: ${p.ads.length}`);
      }
    });

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.category}`);
        console.log(`   Action: ${rec.action}`);
        console.log(`   Reasoning: ${rec.reasoning}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ DSL structure complete!\n');
  }
}

module.exports = DSLCreator;

// CLI usage
if (require.main === module) {
  const creator = new DSLCreator({
    productInfo: {
      name: 'Ad Scaling Framework',
      price: 997
    }
  });

  const input = {
    hook: 'Struggling to scale past $10K/month?',
    problem: 'You\'re spending hours testing, burning budget, no results',
    solution: 'The 3-step framework that took me from $5K to $50K/month',
    proof: 'Same system 500+ brands use to scale profitably',
    cta: 'Click below to get the framework',
    offer: 'The Scaling Framework',
    price: '$997',
    hooks: [
      'Struggling to scale past $10K/month?',
      'What Meta doesn\'t tell you about scaling ads...',
      'From $5K to $50K/month in 90 days...'
    ],
    angles: [
      'Mechanism: The 3-step framework',
      'Transformation: $5K → $50K',
      'Authority: $2M spent on ads'
    ]
  };

  const result = creator.create(input);
  creator.formatOutput(result);
}

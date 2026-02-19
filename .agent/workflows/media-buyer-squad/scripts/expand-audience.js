/**
 * Expand Audience Script
 * 
 * Intelligently expands audiences for scaling
 * 
 * @squad media-buyer-squad
 * @agent media-buyer
 * @skill expand-audience
 */

class AudienceExpander {
  constructor(config = {}) {
    this.currentAudiences = config.currentAudiences || [];
  }

  /**
   * Expand audiences
   */
  expand(winningAudience) {
    console.log('🎯 Expanding Audiences...\n');

    const expansions = {
      lookalike: this.expandLookalike(winningAudience),
      interest: this.expandInterest(winningAudience),
      broad: this.expandBroad(winningAudience),
      geographic: this.expandGeographic(winningAudience)
    };

    return {
      original: winningAudience,
      expansions,
      recommendations: this.generateRecommendations(expansions),
      testingPlan: this.createTestingPlan(expansions)
    };
  }

  /**
   * Expand lookalike audiences
   */
  expandLookalike(audience) {
    if (audience.type !== 'lookalike') return [];

    const expansions = [];

    // Expand percentage
    if (audience.percentage === 1) {
      expansions.push({
        name: `LAL 2-3% ${audience.source}`,
        type: 'lookalike',
        percentage: '2-3',
        source: audience.source,
        estimatedSize: 'Medium',
        priority: 'HIGH'
      });
      expansions.push({
        name: `LAL 4-5% ${audience.source}`,
        type: 'lookalike',
        percentage: '4-5',
        source: audience.source,
        estimatedSize: 'Large',
        priority: 'MEDIUM'
      });
    }

    // Expand source
    if (audience.source === 'Purchasers') {
      expansions.push({
        name: `LAL 1% Add to Cart`,
        type: 'lookalike',
        percentage: 1,
        source: 'Add to Cart',
        estimatedSize: 'Small',
        priority: 'MEDIUM'
      });
      expansions.push({
        name: `LAL 1% Website Visitors`,
        type: 'lookalike',
        percentage: 1,
        source: 'Website Visitors',
        estimatedSize: 'Large',
        priority: 'LOW'
      });
    }

    return expansions;
  }

  /**
   * Expand interest audiences
   */
  expandInterest(audience) {
    if (audience.type !== 'interest') return [];

    const expansions = [];

    // Add related interests
    expansions.push({
      name: `Interest Stack - Related`,
      type: 'interest',
      interests: '[Related interests to test]',
      estimatedSize: 'Medium',
      priority: 'HIGH'
    });

    // Add broader interests
    expansions.push({
      name: `Interest Stack - Broader`,
      type: 'interest',
      interests: '[Broader category interests]',
      estimatedSize: 'Large',
      priority: 'MEDIUM'
    });

    return expansions;
  }

  /**
   * Expand to broad
   */
  expandBroad(audience) {
    const expansions = [];

    // Broad with age/gender
    expansions.push({
      name: 'Broad - Core Demo',
      type: 'broad',
      targeting: 'Age 25-54, All Genders',
      estimatedSize: 'Very Large',
      priority: 'HIGH'
    });

    // Broad + expansion
    expansions.push({
      name: 'Broad + Advantage+ Expansion',
      type: 'broad',
      targeting: 'Minimal targeting + Advantage+',
      estimatedSize: 'Maximum',
      priority: 'MEDIUM'
    });

    return expansions;
  }

  /**
   * Expand geographically
   */
  expandGeographic(audience) {
    const expansions = [];

    // Expand to similar countries
    if (audience.countries && audience.countries.includes('US')) {
      expansions.push({
        name: `${audience.name} - Tier 1 Countries`,
        type: audience.type,
        countries: ['US', 'CA', 'UK', 'AU'],
        estimatedSize: 'Large',
        priority: 'HIGH'
      });
    }

    return expansions;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(expansions) {
    const recommendations = [];

    const allExpansions = [
      ...expansions.lookalike,
      ...expansions.interest,
      ...expansions.broad,
      ...expansions.geographic
    ];

    const highPriority = allExpansions.filter(e => e.priority === 'HIGH');
    if (highPriority.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Test high-priority expansions first',
        audiences: highPriority.map(e => e.name),
        timeline: 'Week 1'
      });
    }

    const mediumPriority = allExpansions.filter(e => e.priority === 'MEDIUM');
    if (mediumPriority.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Test medium-priority expansions if high-priority performs',
        audiences: mediumPriority.map(e => e.name),
        timeline: 'Week 2-3'
      });
    }

    return recommendations;
  }

  /**
   * Create testing plan
   */
  createTestingPlan(expansions) {
    const allExpansions = [
      ...expansions.lookalike,
      ...expansions.interest,
      ...expansions.broad,
      ...expansions.geographic
    ];

    return {
      phase1: {
        name: 'Initial Test',
        duration: '5-7 days',
        audiences: allExpansions.filter(e => e.priority === 'HIGH'),
        budget: '$50-100/day per audience',
        successCriteria: 'CPA within 20% of original audience'
      },
      phase2: {
        name: 'Scale Winners',
        duration: 'Ongoing',
        action: 'Scale audiences that meet success criteria',
        method: 'Increase budget 20% every 3 days'
      },
      phase3: {
        name: 'Test Additional',
        duration: 'Week 2+',
        audiences: allExpansions.filter(e => e.priority === 'MEDIUM' || e.priority === 'LOW'),
        budget: '$50/day per audience'
      }
    };
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🎯 AUDIENCE EXPANSION REPORT\n');
    console.log('═'.repeat(60));

    console.log('\n📍 ORIGINAL AUDIENCE\n');
    console.log(`Name: ${result.original.name}`);
    console.log(`Type: ${result.original.type}`);

    const allExpansions = [
      ...result.expansions.lookalike,
      ...result.expansions.interest,
      ...result.expansions.broad,
      ...result.expansions.geographic
    ];

    console.log('\n\n🚀 EXPANSION OPTIONS\n');
    console.log('─'.repeat(60));

    if (result.expansions.lookalike.length > 0) {
      console.log('\nLookalike Expansions:');
      result.expansions.lookalike.forEach((exp, i) => {
        console.log(`  ${i + 1}. ${exp.name} [${exp.priority}]`);
        console.log(`     Size: ${exp.estimatedSize}`);
      });
    }

    if (result.expansions.interest.length > 0) {
      console.log('\nInterest Expansions:');
      result.expansions.interest.forEach((exp, i) => {
        console.log(`  ${i + 1}. ${exp.name} [${exp.priority}]`);
        console.log(`     Size: ${exp.estimatedSize}`);
      });
    }

    if (result.expansions.broad.length > 0) {
      console.log('\nBroad Expansions:');
      result.expansions.broad.forEach((exp, i) => {
        console.log(`  ${i + 1}. ${exp.name} [${exp.priority}]`);
        console.log(`     Size: ${exp.estimatedSize}`);
      });
    }

    console.log('\n\n📋 TESTING PLAN\n');
    console.log('─'.repeat(60));

    Object.keys(result.testingPlan).forEach(phase => {
      const p = result.testingPlan[phase];
      console.log(`\n${p.name} (${p.duration || 'TBD'})`);
      if (p.audiences) {
        console.log(`  Audiences: ${p.audiences.length}`);
        p.audiences.forEach(a => {
          console.log(`    • ${a.name}`);
        });
      }
      if (p.budget) {
        console.log(`  Budget: ${p.budget}`);
      }
      if (p.successCriteria) {
        console.log(`  Success: ${p.successCriteria}`);
      }
      if (p.action) {
        console.log(`  Action: ${p.action}`);
      }
    });

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   Timeline: ${rec.timeline}`);
        console.log(`   Audiences: ${rec.audiences.length} total`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Expansion complete!\n');
  }
}

module.exports = AudienceExpander;

// CLI usage
if (require.main === module) {
  const expander = new AudienceExpander();

  const winningAudience = {
    name: 'LAL 1% Purchasers',
    type: 'lookalike',
    percentage: 1,
    source: 'Purchasers',
    countries: ['US']
  };

  const result = expander.expand(winningAudience);
  expander.formatOutput(result);
}

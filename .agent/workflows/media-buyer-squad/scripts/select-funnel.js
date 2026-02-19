/**
 * Select Funnel Script
 * 
 * Helps select optimal funnel type based on product and audience
 * Based on Jeremy Haynes frameworks
 * 
 * @squad media-buyer-squad
 * @agent ad-midas
 * @skill select-funnel
 */

class FunnelSelector {
  constructor() {
    this.funnelTypes = {
      tripwire: {
        name: 'Tripwire Funnel',
        description: 'Low-cost frontend offer ($7-$47) with backend upsells',
        bestFor: ['Cold traffic', 'Building customer list', 'Testing new markets'],
        priceRange: [7, 47],
        conversionRate: [5, 15],
        avgOrderValue: 'Low frontend, high backend',
        complexity: 'Medium',
        timeToProfit: 'Fast (immediate on upsells)'
      },
      vsl: {
        name: 'VSL (Video Sales Letter)',
        description: 'Long-form video presentation selling high-ticket offer',
        bestFor: ['High-ticket products ($500+)', 'Complex products', 'Educated audiences'],
        priceRange: [500, 5000],
        conversionRate: [1, 5],
        avgOrderValue: 'Very high',
        complexity: 'High',
        timeToProfit: 'Medium (need quality traffic)'
      },
      webinar: {
        name: 'Webinar Funnel',
        description: 'Live or automated webinar selling high-ticket offer',
        bestFor: ['High-ticket coaching/courses', 'B2B services', 'Complex solutions'],
        priceRange: [1000, 10000],
        conversionRate: [10, 30], // of attendees
        avgOrderValue: 'Very high',
        complexity: 'Very high',
        timeToProfit: 'Slow (need show-up rate)'
      },
      challenge: {
        name: 'Challenge Funnel',
        description: '3-5 day challenge with pitch at end',
        bestFor: ['Coaching/courses', 'Transformation products', 'Building authority'],
        priceRange: [500, 3000],
        conversionRate: [15, 40], // of completers
        avgOrderValue: 'High',
        complexity: 'Very high',
        timeToProfit: 'Slow (5-7 days minimum)'
      },
      application: {
        name: 'Application Funnel',
        description: 'Application form to qualify leads for high-ticket sales call',
        bestFor: ['Very high-ticket ($5K+)', 'Done-for-you services', 'B2B'],
        priceRange: [5000, 50000],
        conversionRate: [20, 50], // application to call, 20-40% call to close
        avgOrderValue: 'Extremely high',
        complexity: 'High',
        timeToProfit: 'Medium (need sales team)'
      },
      ecommerce: {
        name: 'E-commerce Funnel',
        description: 'Direct product purchase with optional upsells',
        bestFor: ['Physical products', 'Simple digital products', 'Impulse buys'],
        priceRange: [20, 500],
        conversionRate: [1, 5],
        avgOrderValue: 'Medium',
        complexity: 'Low',
        timeToProfit: 'Fast (immediate)'
      }
    };
  }

  /**
   * Select optimal funnel
   */
  select(criteria) {
    console.log('🎯 Selecting Optimal Funnel...\n');

    const {
      productPrice,
      productType, // physical | digital | service | coaching
      complexity, // low | medium | high
      audienceAwareness, // cold | warm | hot
      timeToProfit, // fast | medium | slow
      salesProcess // automated | semi-automated | manual
    } = criteria;

    const scores = {};
    Object.keys(this.funnelTypes).forEach(key => {
      scores[key] = this.scoreFunnel(key, criteria);
    });

    // Sort by score
    const ranked = Object.keys(scores)
      .map(key => ({
        type: key,
        score: scores[key].total,
        details: scores[key],
        funnel: this.funnelTypes[key]
      }))
      .sort((a, b) => b.score - a.score);

    return {
      recommended: ranked[0],
      alternatives: ranked.slice(1, 3),
      allOptions: ranked,
      reasoning: this.generateReasoning(ranked[0], criteria)
    };
  }

  /**
   * Score funnel based on criteria
   */
  scoreFunnel(funnelKey, criteria) {
    const funnel = this.funnelTypes[funnelKey];
    let score = 0;
    const breakdown = {};

    // Price match
    const priceScore = this.scorePriceMatch(criteria.productPrice, funnel.priceRange);
    score += priceScore;
    breakdown.price = priceScore;

    // Product type match
    const productTypeScore = this.scoreProductType(criteria.productType, funnelKey);
    score += productTypeScore;
    breakdown.productType = productTypeScore;

    // Complexity match
    const complexityScore = this.scoreComplexity(criteria.complexity, funnel.complexity);
    score += complexityScore;
    breakdown.complexity = complexityScore;

    // Audience awareness match
    const awarenessScore = this.scoreAwareness(criteria.audienceAwareness, funnelKey);
    score += awarenessScore;
    breakdown.awareness = awarenessScore;

    // Time to profit match
    const timeScore = this.scoreTimeToProfit(criteria.timeToProfit, funnel.timeToProfit);
    score += timeScore;
    breakdown.time = timeScore;

    return {
      total: score,
      breakdown
    };
  }

  scorePriceMatch(price, range) {
    if (price >= range[0] && price <= range[1]) return 10;
    if (price >= range[0] * 0.5 && price <= range[1] * 1.5) return 5;
    return 0;
  }

  scoreProductType(type, funnelKey) {
    const matches = {
      physical: ['ecommerce', 'tripwire'],
      digital: ['tripwire', 'vsl', 'ecommerce'],
      service: ['application', 'webinar', 'vsl'],
      coaching: ['webinar', 'challenge', 'application', 'vsl']
    };

    return matches[type]?.includes(funnelKey) ? 10 : 0;
  }

  scoreComplexity(productComplexity, funnelComplexity) {
    const complexityMap = { low: 1, medium: 2, high: 3, 'very high': 4 };
    const productLevel = complexityMap[productComplexity.toLowerCase()] || 2;
    const funnelLevel = complexityMap[funnelComplexity.toLowerCase()] || 2;

    const diff = Math.abs(productLevel - funnelLevel);
    if (diff === 0) return 10;
    if (diff === 1) return 5;
    return 0;
  }

  scoreAwareness(awareness, funnelKey) {
    const matches = {
      cold: ['tripwire', 'ecommerce', 'vsl'],
      warm: ['vsl', 'webinar', 'challenge'],
      hot: ['application', 'webinar', 'ecommerce']
    };

    return matches[awareness]?.includes(funnelKey) ? 10 : 0;
  }

  scoreTimeToProfit(desiredTime, funnelTime) {
    if (desiredTime.toLowerCase() === funnelTime.toLowerCase().split(' ')[0]) return 10;
    return 0;
  }

  /**
   * Generate reasoning
   */
  generateReasoning(recommended, criteria) {
    const reasons = [];

    // Price reasoning
    if (criteria.productPrice >= recommended.funnel.priceRange[0] && 
        criteria.productPrice <= recommended.funnel.priceRange[1]) {
      reasons.push(`Price ($${criteria.productPrice}) fits ${recommended.funnel.name} range perfectly`);
    }

    // Product type reasoning
    reasons.push(`${recommended.funnel.name} is ideal for ${criteria.productType} products`);

    // Complexity reasoning
    reasons.push(`Funnel complexity matches product complexity (${criteria.complexity})`);

    // Audience reasoning
    reasons.push(`Works well with ${criteria.audienceAwareness} traffic`);

    // Time reasoning
    if (criteria.timeToProfit) {
      reasons.push(`Matches desired time to profit (${criteria.timeToProfit})`);
    }

    return reasons;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🎯 FUNNEL SELECTION REPORT\n');
    console.log('═'.repeat(60));

    console.log('\n🏆 RECOMMENDED FUNNEL\n');
    console.log('─'.repeat(60));
    console.log(`\nFunnel: ${result.recommended.funnel.name}`);
    console.log(`Score: ${result.recommended.score}/50`);
    console.log(`\nDescription: ${result.recommended.funnel.description}`);
    
    console.log('\n\nBest For:');
    result.recommended.funnel.bestFor.forEach(item => {
      console.log(`  • ${item}`);
    });

    console.log('\n\nKey Metrics:');
    console.log(`  Price Range: $${result.recommended.funnel.priceRange[0]}-$${result.recommended.funnel.priceRange[1]}`);
    console.log(`  Conversion Rate: ${result.recommended.funnel.conversionRate[0]}-${result.recommended.funnel.conversionRate[1]}%`);
    console.log(`  AOV: ${result.recommended.funnel.avgOrderValue}`);
    console.log(`  Complexity: ${result.recommended.funnel.complexity}`);
    console.log(`  Time to Profit: ${result.recommended.funnel.timeToProfit}`);

    console.log('\n\nWhy This Funnel:');
    result.reasoning.forEach((reason, i) => {
      console.log(`  ${i + 1}. ${reason}`);
    });

    if (result.alternatives.length > 0) {
      console.log('\n\n📋 ALTERNATIVE OPTIONS\n');
      console.log('─'.repeat(60));
      result.alternatives.forEach((alt, i) => {
        console.log(`\n${i + 1}. ${alt.funnel.name} (Score: ${alt.score}/50)`);
        console.log(`   ${alt.funnel.description}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Selection complete!\n');
  }
}

module.exports = FunnelSelector;

// CLI usage
if (require.main === module) {
  const selector = new FunnelSelector();

  const criteria = {
    productPrice: 997,
    productType: 'digital', // physical | digital | service | coaching
    complexity: 'medium', // low | medium | high
    audienceAwareness: 'cold', // cold | warm | hot
    timeToProfit: 'fast', // fast | medium | slow
    salesProcess: 'automated' // automated | semi-automated | manual
  };

  const result = selector.select(criteria);
  selector.formatOutput(result);
}

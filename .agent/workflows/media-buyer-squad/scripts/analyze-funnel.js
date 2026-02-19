/**
 * Analyze Funnel Script
 * 
 * Analyzes conversion funnel to identify drop-off points
 * 
 * @squad media-buyer-squad
 * @agent performance-analyst
 * @skill analyze-funnel
 */

class FunnelAnalyzer {
  constructor(config = {}) {
    this.funnelType = config.funnelType || 'ecommerce'; // ecommerce | lead-gen | webinar | vsl
  }

  /**
   * Analyze complete funnel
   */
  analyze(funnelData) {
    console.log('🔍 Analyzing Conversion Funnel...\n');

    const stages = this.defineFunnelStages(this.funnelType);
    const metrics = this.calculateMetrics(funnelData, stages);
    const dropoffs = this.identifyDropoffs(metrics);
    const bottleneck = this.identifyBottleneck(dropoffs);
    const recommendations = this.generateRecommendations(bottleneck, metrics);

    return {
      funnelType: this.funnelType,
      stages,
      metrics,
      dropoffs,
      bottleneck,
      recommendations,
      overallHealth: this.assessOverallHealth(metrics)
    };
  }

  /**
   * Define funnel stages based on type
   */
  defineFunnelStages(type) {
    const stages = {
      ecommerce: [
        { name: 'Ad Impression', metric: 'impressions' },
        { name: 'Ad Click', metric: 'clicks' },
        { name: 'Landing Page View', metric: 'landingPageViews' },
        { name: 'Product View', metric: 'viewContent' },
        { name: 'Add to Cart', metric: 'addToCart' },
        { name: 'Initiate Checkout', metric: 'initiateCheckout' },
        { name: 'Purchase', metric: 'purchase' }
      ],
      'lead-gen': [
        { name: 'Ad Impression', metric: 'impressions' },
        { name: 'Ad Click', metric: 'clicks' },
        { name: 'Landing Page View', metric: 'landingPageViews' },
        { name: 'Form Start', metric: 'formStart' },
        { name: 'Lead Submit', metric: 'lead' }
      ],
      webinar: [
        { name: 'Ad Impression', metric: 'impressions' },
        { name: 'Ad Click', metric: 'clicks' },
        { name: 'Registration Page', metric: 'landingPageViews' },
        { name: 'Registration', metric: 'completeRegistration' },
        { name: 'Webinar Attendance', metric: 'webinarAttendance' },
        { name: 'Purchase', metric: 'purchase' }
      ],
      vsl: [
        { name: 'Ad Impression', metric: 'impressions' },
        { name: 'Ad Click', metric: 'clicks' },
        { name: 'VSL Page View', metric: 'landingPageViews' },
        { name: 'VSL 25% Watch', metric: 'vsl25' },
        { name: 'VSL 50% Watch', metric: 'vsl50' },
        { name: 'VSL 75% Watch', metric: 'vsl75' },
        { name: 'VSL Complete', metric: 'vsl100' },
        { name: 'Purchase', metric: 'purchase' }
      ]
    };

    return stages[type] || stages.ecommerce;
  }

  /**
   * Calculate metrics for each stage
   */
  calculateMetrics(data, stages) {
    const metrics = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const count = data[stage.metric] || 0;
      const previousCount = i > 0 ? metrics[i - 1].count : null;

      const conversionRate = previousCount ? (count / previousCount) * 100 : 100;
      const dropoffRate = previousCount ? ((previousCount - count) / previousCount) * 100 : 0;
      const overallConversion = (count / data.impressions) * 100;

      metrics.push({
        stage: stage.name,
        metric: stage.metric,
        count,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropoffRate: Math.round(dropoffRate * 100) / 100,
        overallConversion: Math.round(overallConversion * 100) / 100,
        benchmark: this.getBenchmark(stage.metric, this.funnelType)
      });
    }

    return metrics;
  }

  /**
   * Get benchmark for metric
   */
  getBenchmark(metric, funnelType) {
    const benchmarks = {
      ecommerce: {
        clicks: { min: 1.0, good: 2.0, excellent: 3.0 }, // CTR
        landingPageViews: { min: 80, good: 90, excellent: 95 },
        viewContent: { min: 60, good: 75, excellent: 85 },
        addToCart: { min: 15, good: 25, excellent: 35 },
        initiateCheckout: { min: 50, good: 65, excellent: 80 },
        purchase: { min: 40, good: 60, excellent: 75 }
      },
      'lead-gen': {
        clicks: { min: 1.5, good: 2.5, excellent: 4.0 },
        landingPageViews: { min: 80, good: 90, excellent: 95 },
        formStart: { min: 30, good: 45, excellent: 60 },
        lead: { min: 50, good: 70, excellent: 85 }
      }
    };

    return benchmarks[funnelType]?.[metric] || { min: 0, good: 50, excellent: 75 };
  }

  /**
   * Identify drop-off points
   */
  identifyDropoffs(metrics) {
    return metrics
      .filter((m, i) => i > 0) // Skip first stage
      .map(m => ({
        stage: m.stage,
        dropoffRate: m.dropoffRate,
        severity: this.assessDropoffSeverity(m.dropoffRate, m.benchmark),
        belowBenchmark: m.conversionRate < m.benchmark.min
      }))
      .filter(d => d.severity !== 'NORMAL')
      .sort((a, b) => b.dropoffRate - a.dropoffRate);
  }

  /**
   * Assess drop-off severity
   */
  assessDropoffSeverity(dropoffRate, benchmark) {
    const conversionRate = 100 - dropoffRate;
    
    if (conversionRate >= benchmark.excellent) return 'NORMAL';
    if (conversionRate >= benchmark.good) return 'NORMAL';
    if (conversionRate >= benchmark.min) return 'WARNING';
    return 'CRITICAL';
  }

  /**
   * Identify biggest bottleneck
   */
  identifyBottleneck(dropoffs) {
    if (dropoffs.length === 0) return null;

    const critical = dropoffs.filter(d => d.severity === 'CRITICAL');
    if (critical.length > 0) return critical[0];

    return dropoffs[0];
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(bottleneck, metrics) {
    const recommendations = [];

    if (!bottleneck) {
      recommendations.push({
        priority: 'INFO',
        stage: 'Overall',
        issue: 'Funnel is healthy',
        action: 'Continue monitoring and testing',
        impact: 'Maintain performance'
      });
      return recommendations;
    }

    // Stage-specific recommendations
    const stageRecommendations = {
      'Ad Click': {
        issue: 'Low CTR',
        actions: [
          'Test new hooks (@creative-analyst *generate-hooks)',
          'Improve creative quality',
          'Refine audience targeting',
          'Test different ad formats'
        ],
        impact: 'Increase traffic to funnel'
      },
      'Landing Page View': {
        issue: 'High click-to-page drop-off',
        actions: [
          'Check page load speed (target < 3s)',
          'Verify tracking is working',
          'Check for broken links',
          'Improve mobile experience'
        ],
        impact: 'Reduce traffic loss'
      },
      'Product View': {
        issue: 'Low engagement with product',
        actions: [
          'Improve product presentation',
          'Add social proof',
          'Clarify value proposition',
          'Test different layouts'
        ],
        impact: 'Increase product interest'
      },
      'Add to Cart': {
        issue: 'Low add-to-cart rate',
        actions: [
          'Reduce friction (simplify process)',
          'Add urgency/scarcity',
          'Improve product descriptions',
          'Test pricing/offers',
          'Add trust signals'
        ],
        impact: 'Increase cart additions'
      },
      'Initiate Checkout': {
        issue: 'Cart abandonment',
        actions: [
          'Simplify checkout process',
          'Add trust badges',
          'Show shipping costs early',
          'Offer guest checkout',
          'Set up cart abandonment emails'
        ],
        impact: 'Reduce cart abandonment'
      },
      'Purchase': {
        issue: 'Checkout abandonment',
        actions: [
          'Reduce form fields',
          'Add multiple payment options',
          'Show security badges',
          'Optimize for mobile',
          'Test one-page checkout'
        ],
        impact: 'Increase conversion rate'
      },
      'Form Start': {
        issue: 'Low form engagement',
        actions: [
          'Simplify form (fewer fields)',
          'Improve headline/copy',
          'Add social proof above form',
          'Test form placement',
          'Add progress indicator'
        ],
        impact: 'Increase form starts'
      },
      'Lead Submit': {
        issue: 'Form abandonment',
        actions: [
          'Reduce required fields',
          'Improve button copy',
          'Add trust signals',
          'Test multi-step vs single-step',
          'Clarify what happens next'
        ],
        impact: 'Increase lead submissions'
      }
    };

    const stageRec = stageRecommendations[bottleneck.stage];
    if (stageRec) {
      recommendations.push({
        priority: bottleneck.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        stage: bottleneck.stage,
        issue: stageRec.issue,
        dropoffRate: `${bottleneck.dropoffRate}%`,
        actions: stageRec.actions,
        impact: stageRec.impact
      });
    }

    return recommendations;
  }

  /**
   * Assess overall funnel health
   */
  assessOverallHealth(metrics) {
    const finalStage = metrics[metrics.length - 1];
    const overallConversion = finalStage.overallConversion;

    let health = 'POOR';
    let message = '';

    if (this.funnelType === 'ecommerce') {
      if (overallConversion >= 3.0) {
        health = 'EXCELLENT';
        message = 'Funnel is performing excellently';
      } else if (overallConversion >= 2.0) {
        health = 'GOOD';
        message = 'Funnel is performing well';
      } else if (overallConversion >= 1.0) {
        health = 'FAIR';
        message = 'Funnel has room for improvement';
      } else {
        health = 'POOR';
        message = 'Funnel needs significant optimization';
      }
    } else if (this.funnelType === 'lead-gen') {
      if (overallConversion >= 10.0) {
        health = 'EXCELLENT';
        message = 'Funnel is performing excellently';
      } else if (overallConversion >= 5.0) {
        health = 'GOOD';
        message = 'Funnel is performing well';
      } else if (overallConversion >= 2.0) {
        health = 'FAIR';
        message = 'Funnel has room for improvement';
      } else {
        health = 'POOR';
        message = 'Funnel needs significant optimization';
      }
    }

    return {
      health,
      message,
      overallConversion: Math.round(overallConversion * 100) / 100
    };
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🔍 FUNNEL ANALYSIS REPORT\n');
    console.log('═'.repeat(60));

    console.log(`\nFunnel Type: ${result.funnelType.toUpperCase()}`);
    console.log(`Overall Health: ${result.overallHealth.health}`);
    console.log(`Overall Conversion: ${result.overallHealth.overallConversion}%`);
    console.log(`Message: ${result.overallHealth.message}`);

    console.log('\n\n📊 FUNNEL STAGES\n');
    console.log('─'.repeat(60));

    result.metrics.forEach((m, i) => {
      const icon = m.conversionRate >= m.benchmark.good ? '✅' : 
                   m.conversionRate >= m.benchmark.min ? '⚠️' : '❌';
      
      console.log(`\n${i + 1}. ${m.stage} ${icon}`);
      console.log(`   Count: ${m.count.toLocaleString()}`);
      if (i > 0) {
        console.log(`   Conversion Rate: ${m.conversionRate}%`);
        console.log(`   Drop-off Rate: ${m.dropoffRate}%`);
      }
      console.log(`   Overall: ${m.overallConversion}%`);
    });

    if (result.dropoffs.length > 0) {
      console.log('\n\n⚠️ DROP-OFF POINTS\n');
      console.log('─'.repeat(60));
      result.dropoffs.forEach((d, i) => {
        const icon = d.severity === 'CRITICAL' ? '🚨' : '⚠️';
        console.log(`\n${i + 1}. ${icon} ${d.stage}`);
        console.log(`   Drop-off Rate: ${d.dropoffRate}%`);
        console.log(`   Severity: ${d.severity}`);
      });
    }

    if (result.bottleneck) {
      console.log('\n\n🎯 BIGGEST BOTTLENECK\n');
      console.log('─'.repeat(60));
      console.log(`Stage: ${result.bottleneck.stage}`);
      console.log(`Drop-off Rate: ${result.bottleneck.dropoffRate}%`);
      console.log(`Severity: ${result.bottleneck.severity}`);
    }

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.stage}`);
        console.log(`   Issue: ${rec.issue}`);
        if (rec.dropoffRate) {
          console.log(`   Drop-off: ${rec.dropoffRate}`);
        }
        if (rec.actions) {
          console.log('   Actions:');
          rec.actions.forEach(action => {
            console.log(`     • ${action}`);
          });
        } else {
          console.log(`   Action: ${rec.action}`);
        }
        console.log(`   Impact: ${rec.impact}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Analysis complete!\n');
  }
}

module.exports = FunnelAnalyzer;

// CLI usage
if (require.main === module) {
  const analyzer = new FunnelAnalyzer({
    funnelType: 'ecommerce'
  });

  const funnelData = {
    impressions: 100000,
    clicks: 2000,
    landingPageViews: 1800,
    viewContent: 1200,
    addToCart: 240,
    initiateCheckout: 120,
    purchase: 60
  };

  const result = analyzer.analyze(funnelData);
  analyzer.formatOutput(result);
}

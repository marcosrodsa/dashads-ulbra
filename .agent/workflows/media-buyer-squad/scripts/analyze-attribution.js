/**
 * Analyze Attribution Script
 * 
 * Analyzes attribution and conversion paths
 * 
 * @squad media-buyer-squad
 * @agent performance-analyst
 * @skill analyze-attribution
 */

class AttributionAnalyzer {
  constructor(config = {}) {
    this.attributionWindow = config.attributionWindow || '7-day click, 1-day view';
  }

  /**
   * Analyze attribution
   */
  analyze(conversionData) {
    console.log('🔍 Analyzing Attribution...\n');

    const analysis = {
      touchpoints: this.analyzeTouchpoints(conversionData),
      conversionPaths: this.analyzeConversionPaths(conversionData),
      timeToConversion: this.analyzeTimeToConversion(conversionData),
      deviceBreakdown: this.analyzeDeviceBreakdown(conversionData),
      insights: []
    };

    analysis.insights = this.generateInsights(analysis);

    return {
      analysis,
      recommendations: this.generateRecommendations(analysis)
    };
  }

  /**
   * Analyze touchpoints
   */
  analyzeTouchpoints(data) {
    return {
      averageTouchpoints: data.averageTouchpoints || 3.2,
      distribution: {
        '1 touchpoint': data.singleTouch || 25,
        '2-3 touchpoints': data.multiTouch23 || 45,
        '4-5 touchpoints': data.multiTouch45 || 20,
        '6+ touchpoints': data.multiTouch6Plus || 10
      },
      mostCommon: data.mostCommonPath || 'Ad → Landing Page → Purchase'
    };
  }

  /**
   * Analyze conversion paths
   */
  analyzeConversionPaths(data) {
    return {
      topPaths: data.topPaths || [
        { path: 'Ad → LP → Purchase', percentage: 35, avgTime: '2 hours' },
        { path: 'Ad → LP → Exit → Retarget → Purchase', percentage: 25, avgTime: '3 days' },
        { path: 'Ad → LP → Exit → Email → Purchase', percentage: 15, avgTime: '5 days' },
        { path: 'Organic → Ad → Purchase', percentage: 12, avgTime: '1 day' },
        { path: 'Other paths', percentage: 13, avgTime: 'Varies' }
      ],
      assistedConversions: data.assistedConversions || 45 // % of conversions with multiple touchpoints
    };
  }

  /**
   * Analyze time to conversion
   */
  analyzeTimeToConversion(data) {
    return {
      average: data.avgTimeToConversion || '2.5 days',
      distribution: {
        '< 1 hour': data.immediate || 15,
        '1-24 hours': data.sameDay || 25,
        '1-3 days': data.days13 || 30,
        '4-7 days': data.days47 || 20,
        '> 7 days': data.daysPlus7 || 10
      }
    };
  }

  /**
   * Analyze device breakdown
   */
  analyzeDeviceBreakdown(data) {
    return {
      click: {
        mobile: data.clickMobile || 70,
        desktop: data.clickDesktop || 25,
        tablet: data.clickTablet || 5
      },
      conversion: {
        mobile: data.conversionMobile || 45,
        desktop: data.conversionDesktop || 50,
        tablet: data.conversionTablet || 5
      },
      crossDevice: data.crossDevice || 30 // % of conversions involving multiple devices
    };
  }

  /**
   * Generate insights
   */
  generateInsights(analysis) {
    const insights = [];

    // Multi-touch insight
    const multiTouch = 100 - (analysis.touchpoints.distribution['1 touchpoint'] || 0);
    if (multiTouch > 50) {
      insights.push({
        category: 'Multi-Touch',
        finding: `${multiTouch}% of conversions involve multiple touchpoints`,
        implication: 'Retargeting and nurture sequences are critical',
        action: 'Invest in retargeting campaigns and email sequences'
      });
    }

    // Time to conversion insight
    const delayed = (analysis.timeToConversion.distribution['4-7 days'] || 0) + 
                    (analysis.timeToConversion.distribution['> 7 days'] || 0);
    if (delayed > 25) {
      insights.push({
        category: 'Conversion Timeline',
        finding: `${delayed}% of conversions take 4+ days`,
        implication: 'Need longer attribution window and patience',
        action: 'Use 7-day click attribution minimum, don\'t kill campaigns too early'
      });
    }

    // Cross-device insight
    if (analysis.deviceBreakdown.crossDevice > 20) {
      insights.push({
        category: 'Cross-Device',
        finding: `${analysis.deviceBreakdown.crossDevice}% of conversions involve multiple devices`,
        implication: 'Users research on mobile, buy on desktop',
        action: 'Optimize mobile for awareness, desktop for conversion'
      });
    }

    // Device conversion gap
    const clickMobile = analysis.deviceBreakdown.click.mobile;
    const conversionMobile = analysis.deviceBreakdown.conversion.mobile;
    if (clickMobile - conversionMobile > 20) {
      insights.push({
        category: 'Mobile Conversion Gap',
        finding: `${clickMobile}% clicks on mobile, but only ${conversionMobile}% conversions`,
        implication: 'Mobile experience may need improvement',
        action: 'Optimize mobile checkout, reduce friction'
      });
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Attribution window
    const delayed = (analysis.timeToConversion.distribution['4-7 days'] || 0) + 
                    (analysis.timeToConversion.distribution['> 7 days'] || 0);
    if (delayed > 25) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Attribution Window',
        action: 'Use 7-day click, 1-day view attribution',
        reasoning: `${delayed}% of conversions take 4+ days`
      });
    }

    // Retargeting
    const multiTouch = 100 - (analysis.touchpoints.distribution['1 touchpoint'] || 0);
    if (multiTouch > 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Retargeting',
        action: 'Allocate 30%+ of budget to retargeting',
        reasoning: `${multiTouch}% of conversions are multi-touch`
      });
    }

    // Mobile optimization
    const clickMobile = analysis.deviceBreakdown.click.mobile;
    const conversionMobile = analysis.deviceBreakdown.conversion.mobile;
    if (clickMobile - conversionMobile > 20) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Mobile Optimization',
        action: 'Improve mobile checkout experience',
        reasoning: 'Large gap between mobile clicks and conversions'
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🔍 ATTRIBUTION ANALYSIS\n');
    console.log('═'.repeat(60));

    console.log('\n📊 TOUCHPOINTS\n');
    console.log(`Average Touchpoints: ${result.analysis.touchpoints.averageTouchpoints}`);
    console.log('\nDistribution:');
    Object.keys(result.analysis.touchpoints.distribution).forEach(key => {
      console.log(`  ${key}: ${result.analysis.touchpoints.distribution[key]}%`);
    });

    console.log('\n\n🛤️ TOP CONVERSION PATHS\n');
    console.log('─'.repeat(60));
    result.analysis.conversionPaths.topPaths.forEach((path, i) => {
      console.log(`\n${i + 1}. ${path.path}`);
      console.log(`   ${path.percentage}% of conversions`);
      console.log(`   Avg time: ${path.avgTime}`);
    });
    console.log(`\nAssisted Conversions: ${result.analysis.conversionPaths.assistedConversions}%`);

    console.log('\n\n⏱️ TIME TO CONVERSION\n');
    console.log('─'.repeat(60));
    console.log(`Average: ${result.analysis.timeToConversion.average}`);
    console.log('\nDistribution:');
    Object.keys(result.analysis.timeToConversion.distribution).forEach(key => {
      console.log(`  ${key}: ${result.analysis.timeToConversion.distribution[key]}%`);
    });

    console.log('\n\n📱 DEVICE BREAKDOWN\n');
    console.log('─'.repeat(60));
    console.log('\nClicks:');
    Object.keys(result.analysis.deviceBreakdown.click).forEach(device => {
      console.log(`  ${device}: ${result.analysis.deviceBreakdown.click[device]}%`);
    });
    console.log('\nConversions:');
    Object.keys(result.analysis.deviceBreakdown.conversion).forEach(device => {
      console.log(`  ${device}: ${result.analysis.deviceBreakdown.conversion[device]}%`);
    });
    console.log(`\nCross-Device: ${result.analysis.deviceBreakdown.crossDevice}%`);

    if (result.analysis.insights.length > 0) {
      console.log('\n\n💡 KEY INSIGHTS\n');
      console.log('─'.repeat(60));
      result.analysis.insights.forEach((insight, i) => {
        console.log(`\n${i + 1}. ${insight.category}`);
        console.log(`   Finding: ${insight.finding}`);
        console.log(`   Implication: ${insight.implication}`);
        console.log(`   Action: ${insight.action}`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log('\n\n📋 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.category}`);
        console.log(`   Action: ${rec.action}`);
        console.log(`   Reasoning: ${rec.reasoning}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Attribution analysis complete!\n');
  }
}

module.exports = AttributionAnalyzer;

// CLI usage
if (require.main === module) {
  const analyzer = new AttributionAnalyzer({
    attributionWindow: '7-day click, 1-day view'
  });

  const conversionData = {
    averageTouchpoints: 3.2,
    singleTouch: 25,
    multiTouch23: 45,
    multiTouch45: 20,
    multiTouch6Plus: 10,
    avgTimeToConversion: '2.5 days',
    immediate: 15,
    sameDay: 25,
    days13: 30,
    days47: 20,
    daysPlus7: 10,
    clickMobile: 70,
    clickDesktop: 25,
    clickTablet: 5,
    conversionMobile: 45,
    conversionDesktop: 50,
    conversionTablet: 5,
    crossDevice: 30,
    assistedConversions: 45
  };

  const result = analyzer.analyze(conversionData);
  analyzer.formatOutput(result);
}

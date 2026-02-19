/**
 * Detect Creative Fatigue Script
 * 
 * Detects creative fatigue using frequency, CTR, and hook rate metrics
 * 
 * @squad media-buyer-squad
 * @agent performance-analyst
 * @skill detect-fatigue
 */

class CreativeFatigueDetector {
  constructor(config = {}) {
    this.frequencyThreshold = config.frequencyThreshold || 3.5;
    this.ctrDropThreshold = config.ctrDropThreshold || 0.3; // 30% drop
    this.hookRateDropThreshold = config.hookRateDropThreshold || 0.3; // 30% drop
  }

  /**
   * Detect fatigue for all ads
   */
  detect(performanceData) {
    console.log('🔍 Detecting Creative Fatigue...\n');

    const results = performanceData.map(ad => this.detectForAd(ad));

    const summary = this.generateSummary(results);
    const recommendations = this.generateRecommendations(results);

    return {
      results,
      summary,
      recommendations
    };
  }

  /**
   * Detect fatigue for single ad
   */
  detectForAd(ad) {
    const {
      name,
      frequency,
      ctr,
      hookRate,
      peakCTR,
      peakHookRate,
      daysRunning,
      impressions
    } = ad;

    const indicators = [];
    let fatigueScore = 0;
    let fatigueLevel = 'NONE';

    // Indicator 1: High frequency
    if (frequency >= 4.0) {
      indicators.push({
        type: 'HIGH_FREQUENCY',
        severity: 'HIGH',
        message: `Frequency is ${frequency} (threshold: 4.0)`,
        contribution: 40
      });
      fatigueScore += 40;
    } else if (frequency >= this.frequencyThreshold) {
      indicators.push({
        type: 'ELEVATED_FREQUENCY',
        severity: 'MEDIUM',
        message: `Frequency is ${frequency} (threshold: ${this.frequencyThreshold})`,
        contribution: 25
      });
      fatigueScore += 25;
    }

    // Indicator 2: CTR drop
    if (peakCTR && ctr) {
      const ctrDrop = (peakCTR - ctr) / peakCTR;
      
      if (ctrDrop >= 0.5) {
        indicators.push({
          type: 'SEVERE_CTR_DROP',
          severity: 'HIGH',
          message: `CTR dropped ${(ctrDrop * 100).toFixed(0)}% from peak (${peakCTR}% → ${ctr}%)`,
          contribution: 35
        });
        fatigueScore += 35;
      } else if (ctrDrop >= this.ctrDropThreshold) {
        indicators.push({
          type: 'CTR_DROP',
          severity: 'MEDIUM',
          message: `CTR dropped ${(ctrDrop * 100).toFixed(0)}% from peak (${peakCTR}% → ${ctr}%)`,
          contribution: 20
        });
        fatigueScore += 20;
      }
    }

    // Indicator 3: Hook rate drop
    if (peakHookRate && hookRate) {
      const hookRateDrop = (peakHookRate - hookRate) / peakHookRate;
      
      if (hookRateDrop >= 0.5) {
        indicators.push({
          type: 'SEVERE_HOOK_RATE_DROP',
          severity: 'HIGH',
          message: `Hook rate dropped ${(hookRateDrop * 100).toFixed(0)}% from peak (${peakHookRate}% → ${hookRate}%)`,
          contribution: 35
        });
        fatigueScore += 35;
      } else if (hookRateDrop >= this.hookRateDropThreshold) {
        indicators.push({
          type: 'HOOK_RATE_DROP',
          severity: 'MEDIUM',
          message: `Hook rate dropped ${(hookRateDrop * 100).toFixed(0)}% from peak (${peakHookRate}% → ${hookRate}%)`,
          contribution: 20
        });
        fatigueScore += 20;
      }
    }

    // Indicator 4: Long runtime
    if (daysRunning >= 14) {
      indicators.push({
        type: 'LONG_RUNTIME',
        severity: 'LOW',
        message: `Ad running for ${daysRunning} days`,
        contribution: 10
      });
      fatigueScore += 10;
    }

    // Indicator 5: High impression count
    if (impressions >= 100000) {
      indicators.push({
        type: 'HIGH_IMPRESSIONS',
        severity: 'LOW',
        message: `${impressions.toLocaleString()} impressions delivered`,
        contribution: 5
      });
      fatigueScore += 5;
    }

    // Determine fatigue level
    if (fatigueScore >= 70) {
      fatigueLevel = 'SEVERE';
    } else if (fatigueScore >= 50) {
      fatigueLevel = 'HIGH';
    } else if (fatigueScore >= 30) {
      fatigueLevel = 'MODERATE';
    } else if (fatigueScore >= 10) {
      fatigueLevel = 'LOW';
    } else {
      fatigueLevel = 'NONE';
    }

    // Determine action
    let action = 'MONITOR';
    let urgency = 'LOW';

    if (fatigueLevel === 'SEVERE') {
      action = 'PAUSE_IMMEDIATELY';
      urgency = 'CRITICAL';
    } else if (fatigueLevel === 'HIGH') {
      action = 'REFRESH_CREATIVE';
      urgency = 'HIGH';
    } else if (fatigueLevel === 'MODERATE') {
      action = 'PREPARE_REFRESH';
      urgency = 'MEDIUM';
    }

    return {
      name,
      fatigueLevel,
      fatigueScore,
      indicators,
      action,
      urgency,
      metrics: {
        frequency,
        ctr,
        hookRate,
        peakCTR,
        peakHookRate,
        daysRunning,
        impressions
      }
    };
  }

  /**
   * Generate summary
   */
  generateSummary(results) {
    const levelCounts = {
      SEVERE: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      NONE: 0
    };

    results.forEach(result => {
      levelCounts[result.fatigueLevel]++;
    });

    const totalFatigued = levelCounts.SEVERE + levelCounts.HIGH + levelCounts.MODERATE;
    const percentageFatigued = (totalFatigued / results.length) * 100;

    return {
      totalAds: results.length,
      levelCounts,
      totalFatigued,
      percentageFatigued: Math.round(percentageFatigued),
      requiresAction: levelCounts.SEVERE + levelCounts.HIGH
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Severe fatigue
    const severeAds = results.filter(r => r.fatigueLevel === 'SEVERE');
    if (severeAds.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Severe Fatigue',
        action: 'Pause immediately and replace',
        ads: severeAds.map(ad => ad.name),
        impact: 'Performance will continue to decline rapidly',
        timeline: 'Today',
        owner: '@creative-analyst + @media-buyer'
      });
    }

    // High fatigue
    const highAds = results.filter(r => r.fatigueLevel === 'HIGH');
    if (highAds.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'High Fatigue',
        action: 'Refresh creative within 2-3 days',
        ads: highAds.map(ad => ad.name),
        impact: 'Performance declining, will worsen without refresh',
        timeline: '2-3 days',
        owner: '@creative-analyst'
      });
    }

    // Moderate fatigue
    const moderateAds = results.filter(r => r.fatigueLevel === 'MODERATE');
    if (moderateAds.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Moderate Fatigue',
        action: 'Prepare creative refresh',
        ads: moderateAds.map(ad => ad.name),
        impact: 'Early signs of fatigue, plan refresh',
        timeline: '5-7 days',
        owner: '@creative-analyst'
      });
    }

    // General recommendation
    if (results.length > 0) {
      recommendations.push({
        priority: 'INFO',
        category: 'Prevention',
        action: 'Implement continuous creative testing',
        impact: 'Prevent fatigue before it occurs',
        timeline: 'Ongoing',
        owner: '@creative-analyst',
        details: [
          'Test 2-3 new hooks every week',
          'Rotate creatives when frequency > 3.0',
          'Monitor hook rate and CTR daily',
          'Build creative library for quick swaps'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🔍 CREATIVE FATIGUE DETECTION REPORT\n');
    console.log('═'.repeat(60));

    console.log('\n📊 SUMMARY\n');
    console.log(`Total Ads Analyzed: ${result.summary.totalAds}`);
    console.log(`\nFatigue Levels:`);
    console.log(`  SEVERE: ${result.summary.levelCounts.SEVERE} (pause immediately)`);
    console.log(`  HIGH: ${result.summary.levelCounts.HIGH} (refresh soon)`);
    console.log(`  MODERATE: ${result.summary.levelCounts.MODERATE} (prepare refresh)`);
    console.log(`  LOW: ${result.summary.levelCounts.LOW} (monitor)`);
    console.log(`  NONE: ${result.summary.levelCounts.NONE} (healthy)`);
    console.log(`\nTotal Fatigued: ${result.summary.totalFatigued} (${result.summary.percentageFatigued}%)`);
    console.log(`Requires Action: ${result.summary.requiresAction}`);

    // Group by fatigue level
    const grouped = {
      SEVERE: [],
      HIGH: [],
      MODERATE: [],
      LOW: [],
      NONE: []
    };

    result.results.forEach(ad => {
      grouped[ad.fatigueLevel].push(ad);
    });

    // Show severe and high fatigue ads
    if (grouped.SEVERE.length > 0) {
      console.log('\n\n🚨 SEVERE FATIGUE (Pause Immediately)\n');
      console.log('─'.repeat(60));
      grouped.SEVERE.forEach((ad, i) => {
        console.log(`\n${i + 1}. ${ad.name}`);
        console.log(`   Fatigue Score: ${ad.fatigueScore}/100`);
        console.log(`   Action: ${ad.action}`);
        console.log(`   Indicators:`);
        ad.indicators.forEach(indicator => {
          console.log(`     • [${indicator.severity}] ${indicator.message}`);
        });
      });
    }

    if (grouped.HIGH.length > 0) {
      console.log('\n\n⚠️ HIGH FATIGUE (Refresh Soon)\n');
      console.log('─'.repeat(60));
      grouped.HIGH.forEach((ad, i) => {
        console.log(`\n${i + 1}. ${ad.name}`);
        console.log(`   Fatigue Score: ${ad.fatigueScore}/100`);
        console.log(`   Action: ${ad.action}`);
        console.log(`   Indicators:`);
        ad.indicators.forEach(indicator => {
          console.log(`     • [${indicator.severity}] ${indicator.message}`);
        });
      });
    }

    if (grouped.MODERATE.length > 0) {
      console.log('\n\n📊 MODERATE FATIGUE (Prepare Refresh)\n');
      console.log('─'.repeat(60));
      grouped.MODERATE.forEach((ad, i) => {
        console.log(`\n${i + 1}. ${ad.name}`);
        console.log(`   Fatigue Score: ${ad.fatigueScore}/100`);
        console.log(`   Frequency: ${ad.metrics.frequency}`);
        console.log(`   CTR: ${ad.metrics.ctr}% (peak: ${ad.metrics.peakCTR}%)`);
      });
    }

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.category}`);
        console.log(`   Action: ${rec.action}`);
        console.log(`   Timeline: ${rec.timeline}`);
        console.log(`   Owner: ${rec.owner}`);
        if (rec.ads) {
          console.log(`   Ads: ${rec.ads.length} total`);
        }
        if (rec.details) {
          console.log('   Details:');
          rec.details.forEach(detail => {
            console.log(`     • ${detail}`);
          });
        }
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Detection complete!\n');
  }
}

module.exports = CreativeFatigueDetector;

// CLI usage
if (require.main === module) {
  const detector = new CreativeFatigueDetector({
    frequencyThreshold: 3.5,
    ctrDropThreshold: 0.3,
    hookRateDropThreshold: 0.3
  });

  // Example performance data
  const performanceData = [
    {
      name: 'Hook 1 - Angle A',
      frequency: 4.2,
      ctr: 1.2,
      hookRate: 12,
      peakCTR: 2.5,
      peakHookRate: 22,
      daysRunning: 15,
      impressions: 120000
    },
    {
      name: 'Hook 2 - Angle B',
      frequency: 3.8,
      ctr: 1.8,
      hookRate: 16,
      peakCTR: 2.2,
      peakHookRate: 20,
      daysRunning: 10,
      impressions: 85000
    },
    {
      name: 'Hook 3 - Angle A',
      frequency: 2.1,
      ctr: 2.3,
      hookRate: 19,
      peakCTR: 2.4,
      peakHookRate: 20,
      daysRunning: 5,
      impressions: 35000
    },
    {
      name: 'Hook 4 - Angle C',
      frequency: 5.1,
      ctr: 0.8,
      hookRate: 8,
      peakCTR: 2.8,
      peakHookRate: 24,
      daysRunning: 20,
      impressions: 180000
    }
  ];

  const result = detector.detect(performanceData);
  detector.formatOutput(result);
}

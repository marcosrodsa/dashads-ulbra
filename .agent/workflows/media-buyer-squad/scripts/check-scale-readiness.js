/**
 * Check Scale Readiness Script
 * 
 * Validates if campaign is ready to scale
 * 
 * @squad media-buyer-squad
 * @agent ad-midas
 * @skill check-scale-readiness
 */

class ScaleReadinessChecker {
  constructor(config = {}) {
    this.targetCPA = config.targetCPA;
    this.targetROAS = config.targetROAS || null;
    this.minimumConversions = config.minimumConversions || 50;
    this.minimumDays = config.minimumDays || 7;
  }

  /**
   * Check scale readiness
   */
  check(campaignData) {
    console.log('✅ Checking Scale Readiness...\n');

    const checks = {
      dataVolume: this.checkDataVolume(campaignData),
      performance: this.checkPerformance(campaignData),
      consistency: this.checkConsistency(campaignData),
      tracking: this.checkTracking(campaignData),
      economics: this.checkEconomics(campaignData),
      creative: this.checkCreative(campaignData)
    };

    const overallReadiness = this.assessOverallReadiness(checks);
    const recommendations = this.generateRecommendations(checks, overallReadiness);

    return {
      checks,
      overallReadiness,
      recommendations
    };
  }

  /**
   * Check data volume
   */
  checkDataVolume(data) {
    const checks = [];

    // Minimum conversions
    if (data.conversions >= this.minimumConversions) {
      checks.push({
        criterion: 'Minimum Conversions',
        status: 'PASS',
        value: data.conversions,
        target: this.minimumConversions,
        message: `✅ ${data.conversions} conversions (target: ${this.minimumConversions})`
      });
    } else {
      checks.push({
        criterion: 'Minimum Conversions',
        status: 'FAIL',
        value: data.conversions,
        target: this.minimumConversions,
        message: `❌ Only ${data.conversions} conversions (need: ${this.minimumConversions})`
      });
    }

    // Minimum days
    if (data.daysRunning >= this.minimumDays) {
      checks.push({
        criterion: 'Minimum Days',
        status: 'PASS',
        value: data.daysRunning,
        target: this.minimumDays,
        message: `✅ ${data.daysRunning} days running (target: ${this.minimumDays})`
      });
    } else {
      checks.push({
        criterion: 'Minimum Days',
        status: 'FAIL',
        value: data.daysRunning,
        target: this.minimumDays,
        message: `❌ Only ${data.daysRunning} days (need: ${this.minimumDays})`
      });
    }

    const passed = checks.filter(c => c.status === 'PASS').length;
    return {
      passed: passed === checks.length,
      checks,
      score: (passed / checks.length) * 100
    };
  }

  /**
   * Check performance
   */
  checkPerformance(data) {
    const checks = [];

    // CPA check
    if (this.targetCPA && data.cpa) {
      if (data.cpa <= this.targetCPA * 0.8) {
        checks.push({
          criterion: 'CPA',
          status: 'PASS',
          value: data.cpa,
          target: this.targetCPA,
          message: `✅ CPA $${data.cpa} (target: $${this.targetCPA})`
        });
      } else {
        checks.push({
          criterion: 'CPA',
          status: 'FAIL',
          value: data.cpa,
          target: this.targetCPA,
          message: `❌ CPA $${data.cpa} too high (target: $${this.targetCPA})`
        });
      }
    }

    // ROAS check
    if (this.targetROAS && data.roas) {
      if (data.roas >= this.targetROAS) {
        checks.push({
          criterion: 'ROAS',
          status: 'PASS',
          value: data.roas,
          target: this.targetROAS,
          message: `✅ ROAS ${data.roas} (target: ${this.targetROAS})`
        });
      } else {
        checks.push({
          criterion: 'ROAS',
          status: 'FAIL',
          value: data.roas,
          target: this.targetROAS,
          message: `❌ ROAS ${data.roas} too low (target: ${this.targetROAS})`
        });
      }
    }

    // Frequency check
    if (data.frequency && data.frequency < 3.0) {
      checks.push({
        criterion: 'Frequency',
        status: 'PASS',
        value: data.frequency,
        target: 3.0,
        message: `✅ Frequency ${data.frequency} (not saturated)`
      });
    } else if (data.frequency) {
      checks.push({
        criterion: 'Frequency',
        status: 'WARNING',
        value: data.frequency,
        target: 3.0,
        message: `⚠️ Frequency ${data.frequency} (approaching saturation)`
      });
    }

    const passed = checks.filter(c => c.status === 'PASS').length;
    return {
      passed: checks.filter(c => c.status === 'FAIL').length === 0,
      checks,
      score: (passed / checks.length) * 100
    };
  }

  /**
   * Check consistency
   */
  checkConsistency(data) {
    const checks = [];

    // Daily conversion consistency
    if (data.dailyConversions && data.dailyConversions > 5) {
      checks.push({
        criterion: 'Daily Conversions',
        status: 'PASS',
        value: data.dailyConversions,
        target: 5,
        message: `✅ ${data.dailyConversions} conversions/day (consistent volume)`
      });
    } else if (data.dailyConversions) {
      checks.push({
        criterion: 'Daily Conversions',
        status: 'WARNING',
        value: data.dailyConversions,
        target: 5,
        message: `⚠️ ${data.dailyConversions} conversions/day (low volume)`
      });
    }

    // CPA stability (coefficient of variation)
    if (data.cpaStability && data.cpaStability < 0.3) {
      checks.push({
        criterion: 'CPA Stability',
        status: 'PASS',
        value: data.cpaStability,
        target: 0.3,
        message: `✅ CPA is stable (CV: ${data.cpaStability})`
      });
    } else if (data.cpaStability) {
      checks.push({
        criterion: 'CPA Stability',
        status: 'WARNING',
        value: data.cpaStability,
        target: 0.3,
        message: `⚠️ CPA is volatile (CV: ${data.cpaStability})`
      });
    }

    const passed = checks.filter(c => c.status === 'PASS').length;
    return {
      passed: checks.filter(c => c.status === 'FAIL').length === 0,
      checks,
      score: (passed / checks.length) * 100
    };
  }

  /**
   * Check tracking
   */
  checkTracking(data) {
    const checks = [];

    // Pixel health
    if (data.pixelHealth === 'ACTIVE') {
      checks.push({
        criterion: 'Pixel Health',
        status: 'PASS',
        value: data.pixelHealth,
        message: `✅ Pixel is active`
      });
    } else {
      checks.push({
        criterion: 'Pixel Health',
        status: 'FAIL',
        value: data.pixelHealth,
        message: `❌ Pixel issues detected`
      });
    }

    // Event Match Quality
    if (data.eventMatchQuality && data.eventMatchQuality >= 6.0) {
      checks.push({
        criterion: 'Event Match Quality',
        status: 'PASS',
        value: data.eventMatchQuality,
        target: 6.0,
        message: `✅ EMQ ${data.eventMatchQuality} (target: 6.0)`
      });
    } else if (data.eventMatchQuality) {
      checks.push({
        criterion: 'Event Match Quality',
        status: 'WARNING',
        value: data.eventMatchQuality,
        target: 6.0,
        message: `⚠️ EMQ ${data.eventMatchQuality} (target: 6.0)`
      });
    }

    const passed = checks.filter(c => c.status === 'PASS').length;
    return {
      passed: checks.filter(c => c.status === 'FAIL').length === 0,
      checks,
      score: (passed / checks.length) * 100
    };
  }

  /**
   * Check economics
   */
  checkEconomics(data) {
    const checks = [];

    // LTV:CAC ratio
    if (data.ltvCacRatio && data.ltvCacRatio >= 3.0) {
      checks.push({
        criterion: 'LTV:CAC Ratio',
        status: 'PASS',
        value: data.ltvCacRatio,
        target: 3.0,
        message: `✅ LTV:CAC ${data.ltvCacRatio}:1 (target: 3:1)`
      });
    } else if (data.ltvCacRatio) {
      checks.push({
        criterion: 'LTV:CAC Ratio',
        status: 'FAIL',
        value: data.ltvCacRatio,
        target: 3.0,
        message: `❌ LTV:CAC ${data.ltvCacRatio}:1 (need: 3:1)`
      });
    }

    const passed = checks.filter(c => c.status === 'PASS').length;
    return {
      passed: checks.filter(c => c.status === 'FAIL').length === 0,
      checks,
      score: checks.length > 0 ? (passed / checks.length) * 100 : 100
    };
  }

  /**
   * Check creative
   */
  checkCreative(data) {
    const checks = [];

    // Creative refresh readiness
    if (data.creativeAge && data.creativeAge < 14) {
      checks.push({
        criterion: 'Creative Freshness',
        status: 'PASS',
        value: data.creativeAge,
        target: 14,
        message: `✅ Creative is fresh (${data.creativeAge} days old)`
      });
    } else if (data.creativeAge) {
      checks.push({
        criterion: 'Creative Freshness',
        status: 'WARNING',
        value: data.creativeAge,
        target: 14,
        message: `⚠️ Creative aging (${data.creativeAge} days old)`
      });
    }

    const passed = checks.filter(c => c.status === 'PASS').length;
    return {
      passed: checks.filter(c => c.status === 'FAIL').length === 0,
      checks,
      score: checks.length > 0 ? (passed / checks.length) * 100 : 100
    };
  }

  /**
   * Assess overall readiness
   */
  assessOverallReadiness(checks) {
    const categories = Object.keys(checks);
    const failedCategories = categories.filter(cat => !checks[cat].passed);

    let status, message, canScale;

    if (failedCategories.length === 0) {
      status = 'READY';
      message = 'Campaign is ready to scale';
      canScale = true;
    } else if (failedCategories.some(cat => ['dataVolume', 'performance', 'economics'].includes(cat))) {
      status = 'NOT_READY';
      message = 'Critical issues must be fixed before scaling';
      canScale = false;
    } else {
      status = 'READY_WITH_CAUTION';
      message = 'Can scale but monitor closely';
      canScale = true;
    }

    const avgScore = categories.reduce((sum, cat) => sum + checks[cat].score, 0) / categories.length;

    return {
      status,
      message,
      canScale,
      overallScore: Math.round(avgScore),
      failedCategories
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(checks, readiness) {
    const recommendations = [];

    if (!readiness.canScale) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'DO NOT SCALE - Fix critical issues first',
        categories: readiness.failedCategories
      });
    }

    // Category-specific recommendations
    Object.keys(checks).forEach(category => {
      if (!checks[category].passed) {
        const failedChecks = checks[category].checks.filter(c => c.status === 'FAIL');
        failedChecks.forEach(check => {
          recommendations.push({
            priority: 'HIGH',
            category,
            issue: check.criterion,
            action: `Fix: ${check.message}`
          });
        });
      }
    });

    if (readiness.canScale && readiness.status === 'READY') {
      recommendations.push({
        priority: 'INFO',
        action: 'Ready to scale',
        method: 'Increase budget 20% every 3 days while metrics hold'
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n✅ SCALE READINESS CHECK\n');
    console.log('═'.repeat(60));

    console.log(`\n📊 OVERALL: ${result.overallReadiness.status}`);
    console.log(`Score: ${result.overallReadiness.overallScore}/100`);
    console.log(`Message: ${result.overallReadiness.message}`);
    console.log(`Can Scale: ${result.overallReadiness.canScale ? 'YES ✅' : 'NO ❌'}`);

    Object.keys(result.checks).forEach(category => {
      const cat = result.checks[category];
      const icon = cat.passed ? '✅' : '❌';
      
      console.log(`\n\n${icon} ${category.toUpperCase()} (${Math.round(cat.score)}%)\n`);
      console.log('─'.repeat(60));
      
      cat.checks.forEach(check => {
        console.log(`${check.message}`);
      });
    });

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.action}`);
        if (rec.method) {
          console.log(`   Method: ${rec.method}`);
        }
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Check complete!\n');
  }
}

module.exports = ScaleReadinessChecker;

// CLI usage
if (require.main === module) {
  const checker = new ScaleReadinessChecker({
    targetCPA: 150,
    targetROAS: 3.0,
    minimumConversions: 50,
    minimumDays: 7
  });

  const campaignData = {
    conversions: 75,
    daysRunning: 10,
    cpa: 120,
    roas: 4.2,
    frequency: 2.5,
    dailyConversions: 7.5,
    cpaStability: 0.25,
    pixelHealth: 'ACTIVE',
    eventMatchQuality: 7.2,
    ltvCacRatio: 4.5,
    creativeAge: 8
  };

  const result = checker.check(campaignData);
  checker.formatOutput(result);
}

/**
 * Calculate Unit Economics Script
 * 
 * Calculates and validates unit economics for campaigns
 * Based on Alex Hormozi's frameworks
 * 
 * @squad media-buyer-squad
 * @agent ad-midas
 * @skill calculate-economics
 */

class UnitEconomicsCalculator {
  constructor(config = {}) {
    this.minimumLtvCacRatio = config.minimumLtvCacRatio || 3.0;
    this.targetPaybackPeriod = config.targetPaybackPeriod || 90; // days
  }

  /**
   * Calculate complete unit economics
   */
  calculate(input) {
    console.log('💰 Calculating Unit Economics...\n');

    const {
      productPrice,
      cogs, // Cost of Goods Sold
      targetCPA,
      averageOrderValue,
      repeatPurchaseRate,
      averageLifetimeMonths,
      monthlyChurnRate
    } = input;

    // Calculate LTV
    const ltv = this.calculateLTV({
      averageOrderValue: averageOrderValue || productPrice,
      repeatPurchaseRate,
      averageLifetimeMonths,
      monthlyChurnRate,
      cogs
    });

    // Calculate CAC (Customer Acquisition Cost)
    const cac = targetCPA;

    // Calculate LTV:CAC ratio
    const ltvCacRatio = ltv / cac;

    // Calculate payback period
    const grossMargin = productPrice - (cogs || 0);
    const paybackPeriod = cac / grossMargin; // in orders
    const paybackPeriodDays = this.estimatePaybackDays(paybackPeriod, repeatPurchaseRate);

    // Validate economics
    const validation = this.validateEconomics({
      ltvCacRatio,
      paybackPeriodDays,
      grossMargin,
      cac
    });

    // Calculate scaling potential
    const scalingPotential = this.calculateScalingPotential({
      ltvCacRatio,
      paybackPeriodDays,
      grossMargin
    });

    return {
      ltv: Math.round(ltv * 100) / 100,
      cac: Math.round(cac * 100) / 100,
      ltvCacRatio: Math.round(ltvCacRatio * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
      paybackPeriod: Math.round(paybackPeriod * 100) / 100,
      paybackPeriodDays: Math.round(paybackPeriodDays),
      validation,
      scalingPotential,
      recommendations: this.generateRecommendations(validation, scalingPotential)
    };
  }

  /**
   * Calculate Lifetime Value (LTV)
   */
  calculateLTV(params) {
    const {
      averageOrderValue,
      repeatPurchaseRate,
      averageLifetimeMonths,
      monthlyChurnRate,
      cogs
    } = params;

    let ltv;

    if (repeatPurchaseRate && averageLifetimeMonths) {
      // Method 1: Repeat purchase model
      const averagePurchasesPerMonth = repeatPurchaseRate;
      const totalPurchases = averagePurchasesPerMonth * averageLifetimeMonths;
      const totalRevenue = totalPurchases * averageOrderValue;
      const totalCOGS = totalPurchases * (cogs || 0);
      ltv = totalRevenue - totalCOGS;
    } else if (monthlyChurnRate && monthlyChurnRate > 0) {
      // Method 2: Churn-based model (SaaS)
      const averageLifetimeMonths = 1 / monthlyChurnRate;
      const totalRevenue = averageOrderValue * averageLifetimeMonths;
      const totalCOGS = (cogs || 0) * averageLifetimeMonths;
      ltv = totalRevenue - totalCOGS;
    } else {
      // Method 3: Single purchase (default)
      ltv = averageOrderValue - (cogs || 0);
    }

    return ltv;
  }

  /**
   * Estimate payback period in days
   */
  estimatePaybackDays(paybackPeriodOrders, repeatPurchaseRate) {
    if (!repeatPurchaseRate || repeatPurchaseRate === 0) {
      // Single purchase: immediate payback
      return 0;
    }

    // Estimate days between purchases
    const daysBetweenPurchases = 30 / repeatPurchaseRate;
    return paybackPeriodOrders * daysBetweenPurchases;
  }

  /**
   * Validate unit economics
   */
  validateEconomics(params) {
    const { ltvCacRatio, paybackPeriodDays, grossMargin, cac } = params;

    const checks = {
      ltvCacRatio: {
        value: ltvCacRatio,
        target: this.minimumLtvCacRatio,
        status: ltvCacRatio >= this.minimumLtvCacRatio ? 'PASS' : 'FAIL',
        message: ltvCacRatio >= this.minimumLtvCacRatio
          ? `LTV:CAC ratio is ${ltvCacRatio.toFixed(2)}:1 (target: ${this.minimumLtvCacRatio}:1) ✅`
          : `LTV:CAC ratio is ${ltvCacRatio.toFixed(2)}:1 (target: ${this.minimumLtvCacRatio}:1) ❌`
      },
      paybackPeriod: {
        value: paybackPeriodDays,
        target: this.targetPaybackPeriod,
        status: paybackPeriodDays <= this.targetPaybackPeriod ? 'PASS' : 'WARNING',
        message: paybackPeriodDays <= this.targetPaybackPeriod
          ? `Payback period is ${paybackPeriodDays} days (target: ${this.targetPaybackPeriod} days) ✅`
          : `Payback period is ${paybackPeriodDays} days (target: ${this.targetPaybackPeriod} days) ⚠️`
      },
      profitability: {
        value: grossMargin > cac,
        status: grossMargin > cac ? 'PASS' : 'FAIL',
        message: grossMargin > cac
          ? `Gross margin ($${grossMargin}) > CAC ($${cac}) ✅`
          : `Gross margin ($${grossMargin}) < CAC ($${cac}) ❌ NOT PROFITABLE`
      }
    };

    const overallStatus = Object.values(checks).every(check => check.status === 'PASS')
      ? 'APPROVED'
      : Object.values(checks).some(check => check.status === 'FAIL')
      ? 'REJECTED'
      : 'WARNING';

    return {
      checks,
      overallStatus,
      readyToLaunch: overallStatus !== 'REJECTED'
    };
  }

  /**
   * Calculate scaling potential
   */
  calculateScalingPotential(params) {
    const { ltvCacRatio, paybackPeriodDays, grossMargin } = params;

    let potential = 'LOW';
    let maxMonthlyBudget = 0;
    let reasoning = [];

    if (ltvCacRatio >= 5.0) {
      potential = 'VERY HIGH';
      maxMonthlyBudget = 100000;
      reasoning.push('LTV:CAC ratio > 5:1 allows aggressive scaling');
    } else if (ltvCacRatio >= 4.0) {
      potential = 'HIGH';
      maxMonthlyBudget = 50000;
      reasoning.push('LTV:CAC ratio > 4:1 supports strong scaling');
    } else if (ltvCacRatio >= 3.0) {
      potential = 'MEDIUM';
      maxMonthlyBudget = 25000;
      reasoning.push('LTV:CAC ratio > 3:1 allows moderate scaling');
    } else if (ltvCacRatio >= 2.0) {
      potential = 'LOW';
      maxMonthlyBudget = 10000;
      reasoning.push('LTV:CAC ratio > 2:1 allows limited scaling');
    } else {
      potential = 'VERY LOW';
      maxMonthlyBudget = 5000;
      reasoning.push('LTV:CAC ratio < 2:1 limits scaling potential');
    }

    if (paybackPeriodDays <= 30) {
      reasoning.push('Fast payback period (< 30 days) enables rapid reinvestment');
    } else if (paybackPeriodDays <= 90) {
      reasoning.push('Moderate payback period (< 90 days) allows steady growth');
    } else {
      reasoning.push('Long payback period (> 90 days) requires patient capital');
      maxMonthlyBudget = Math.min(maxMonthlyBudget, 15000);
    }

    return {
      potential,
      maxMonthlyBudget,
      reasoning
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(validation, scalingPotential) {
    const recommendations = [];

    if (validation.overallStatus === 'REJECTED') {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Unit Economics',
        issue: 'Economics not viable',
        action: 'Do NOT launch - fix economics first',
        options: [
          'Increase product price',
          'Reduce COGS',
          'Lower target CPA',
          'Improve conversion rate',
          'Add upsells/cross-sells to increase LTV'
        ]
      });
    }

    if (validation.checks.ltvCacRatio.status === 'FAIL') {
      recommendations.push({
        priority: 'HIGH',
        category: 'LTV:CAC Ratio',
        issue: `LTV:CAC ratio too low (${validation.checks.ltvCacRatio.value.toFixed(2)}:1)`,
        action: 'Improve ratio to minimum 3:1',
        options: [
          'Increase LTV: Add subscription, upsells, repeat purchases',
          'Decrease CAC: Improve conversion rate, reduce ad costs',
          'Increase price (if market allows)',
          'Reduce COGS'
        ]
      });
    }

    if (validation.checks.paybackPeriod.status === 'WARNING') {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Payback Period',
        issue: `Payback period too long (${validation.checks.paybackPeriod.value} days)`,
        action: 'Reduce payback period to < 90 days',
        options: [
          'Increase repeat purchase rate',
          'Add immediate upsells',
          'Improve gross margin',
          'Lower CAC'
        ]
      });
    }

    if (scalingPotential.potential === 'VERY HIGH' || scalingPotential.potential === 'HIGH') {
      recommendations.push({
        priority: 'INFO',
        category: 'Scaling',
        issue: 'Strong scaling potential',
        action: `Can scale to $${scalingPotential.maxMonthlyBudget.toLocaleString()}/month`,
        options: [
          'Start with conservative budget ($5-10K/month)',
          'Scale 20% every 3 days if metrics hold',
          'Monitor LTV:CAC ratio closely during scaling',
          'Prepare for increased inventory/fulfillment needs'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n💰 UNIT ECONOMICS REPORT\n');
    console.log('═'.repeat(60));

    console.log('\n📊 KEY METRICS\n');
    console.log(`LTV (Lifetime Value): $${result.ltv}`);
    console.log(`CAC (Customer Acquisition Cost): $${result.cac}`);
    console.log(`LTV:CAC Ratio: ${result.ltvCacRatio}:1`);
    console.log(`Gross Margin: $${result.grossMargin}`);
    console.log(`Payback Period: ${result.paybackPeriod} orders (${result.paybackPeriodDays} days)`);

    console.log('\n\n✅ VALIDATION\n');
    console.log('─'.repeat(60));
    console.log(`Overall Status: ${result.validation.overallStatus}`);
    console.log(`Ready to Launch: ${result.validation.readyToLaunch ? 'YES ✅' : 'NO ❌'}\n`);

    Object.keys(result.validation.checks).forEach(key => {
      const check = result.validation.checks[key];
      console.log(`${check.message}`);
    });

    console.log('\n\n🚀 SCALING POTENTIAL\n');
    console.log('─'.repeat(60));
    console.log(`Potential: ${result.scalingPotential.potential}`);
    console.log(`Max Monthly Budget: $${result.scalingPotential.maxMonthlyBudget.toLocaleString()}`);
    console.log('\nReasoning:');
    result.scalingPotential.reasoning.forEach(reason => {
      console.log(`  • ${reason}`);
    });

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   Action: ${rec.action}`);
        if (rec.options) {
          console.log('   Options:');
          rec.options.forEach(option => {
            console.log(`     • ${option}`);
          });
        }
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Calculation complete!\n');
  }
}

module.exports = UnitEconomicsCalculator;

// CLI usage
if (require.main === module) {
  const calculator = new UnitEconomicsCalculator({
    minimumLtvCacRatio: 3.0,
    targetPaybackPeriod: 90
  });

  // Example: E-commerce product
  const ecommerceExample = {
    productPrice: 997,
    cogs: 200,
    targetCPA: 150,
    averageOrderValue: 997,
    repeatPurchaseRate: 0.5, // 0.5 purchases per month
    averageLifetimeMonths: 12,
    monthlyChurnRate: null
  };

  console.log('Example 1: E-commerce Product\n');
  const result1 = calculator.calculate(ecommerceExample);
  calculator.formatOutput(result1);

  console.log('\n\n' + '='.repeat(60) + '\n\n');

  // Example: SaaS subscription
  const saasExample = {
    productPrice: 97, // monthly subscription
    cogs: 10, // monthly cost to serve
    targetCPA: 200,
    averageOrderValue: 97,
    repeatPurchaseRate: null,
    averageLifetimeMonths: null,
    monthlyChurnRate: 0.05 // 5% monthly churn = 20 month average lifetime
  };

  console.log('Example 2: SaaS Subscription\n');
  const result2 = calculator.calculate(saasExample);
  calculator.formatOutput(result2);
}

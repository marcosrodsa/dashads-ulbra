/**
 * Allocate Budget Script
 * 
 * Intelligently allocates budget across ad sets based on performance
 * 
 * @squad media-buyer-squad
 * @agent performance-analyst
 * @skill allocate-budget
 */

class BudgetAllocator {
  constructor(config = {}) {
    this.totalBudget = config.totalBudget;
    this.allocationStrategy = config.allocationStrategy || 'performance'; // performance | equal | weighted
  }

  /**
   * Allocate budget across ad sets
   */
  allocate(adSets) {
    console.log(`💰 Allocating Budget ($${this.totalBudget}/day)...\n`);

    let allocation;

    switch (this.allocationStrategy) {
      case 'performance':
        allocation = this.allocateByPerformance(adSets);
        break;
      case 'equal':
        allocation = this.allocateEqually(adSets);
        break;
      case 'weighted':
        allocation = this.allocateWeighted(adSets);
        break;
      default:
        allocation = this.allocateByPerformance(adSets);
    }

    return {
      strategy: this.allocationStrategy,
      totalBudget: this.totalBudget,
      allocation,
      summary: this.generateSummary(allocation),
      recommendations: this.generateRecommendations(allocation)
    };
  }

  /**
   * Allocate by performance (best performers get more budget)
   */
  allocateByPerformance(adSets) {
    // Calculate performance scores
    const scored = adSets.map(adSet => ({
      ...adSet,
      performanceScore: this.calculatePerformanceScore(adSet)
    }));

    // Calculate total score
    const totalScore = scored.reduce((sum, adSet) => sum + adSet.performanceScore, 0);

    // Allocate proportionally
    const allocation = scored.map(adSet => {
      const proportion = adSet.performanceScore / totalScore;
      const allocatedBudget = Math.round(this.totalBudget * proportion);

      return {
        name: adSet.name,
        currentBudget: adSet.currentBudget || 0,
        newBudget: allocatedBudget,
        change: allocatedBudget - (adSet.currentBudget || 0),
        changePercent: adSet.currentBudget ? Math.round(((allocatedBudget - adSet.currentBudget) / adSet.currentBudget) * 100) : 0,
        performanceScore: adSet.performanceScore,
        metrics: {
          cpa: adSet.cpa,
          roas: adSet.roas,
          conversions: adSet.conversions
        }
      };
    });

    return allocation;
  }

  /**
   * Calculate performance score
   */
  calculatePerformanceScore(adSet) {
    let score = 0;

    // CPA score (lower is better)
    if (adSet.cpa && adSet.targetCPA) {
      const cpaRatio = adSet.targetCPA / adSet.cpa;
      score += cpaRatio * 30; // Max 30 points
    }

    // ROAS score (higher is better)
    if (adSet.roas) {
      score += Math.min(adSet.roas * 10, 40); // Max 40 points
    }

    // Conversion volume score
    if (adSet.conversions) {
      score += Math.min(adSet.conversions, 30); // Max 30 points
    }

    return Math.max(score, 1); // Minimum score of 1
  }

  /**
   * Allocate equally
   */
  allocateEqually(adSets) {
    const budgetPerAdSet = Math.round(this.totalBudget / adSets.length);

    return adSets.map(adSet => ({
      name: adSet.name,
      currentBudget: adSet.currentBudget || 0,
      newBudget: budgetPerAdSet,
      change: budgetPerAdSet - (adSet.currentBudget || 0),
      changePercent: adSet.currentBudget ? Math.round(((budgetPerAdSet - adSet.currentBudget) / adSet.currentBudget) * 100) : 0,
      metrics: {
        cpa: adSet.cpa,
        roas: adSet.roas,
        conversions: adSet.conversions
      }
    }));
  }

  /**
   * Allocate with weights
   */
  allocateWeighted(adSets) {
    // Use provided weights or default to equal
    const totalWeight = adSets.reduce((sum, adSet) => sum + (adSet.weight || 1), 0);

    return adSets.map(adSet => {
      const weight = adSet.weight || 1;
      const proportion = weight / totalWeight;
      const allocatedBudget = Math.round(this.totalBudget * proportion);

      return {
        name: adSet.name,
        currentBudget: adSet.currentBudget || 0,
        newBudget: allocatedBudget,
        change: allocatedBudget - (adSet.currentBudget || 0),
        changePercent: adSet.currentBudget ? Math.round(((allocatedBudget - adSet.currentBudget) / adSet.currentBudget) * 100) : 0,
        weight,
        metrics: {
          cpa: adSet.cpa,
          roas: adSet.roas,
          conversions: adSet.conversions
        }
      };
    });
  }

  /**
   * Generate summary
   */
  generateSummary(allocation) {
    const increases = allocation.filter(a => a.change > 0);
    const decreases = allocation.filter(a => a.change < 0);
    const unchanged = allocation.filter(a => a.change === 0);

    return {
      totalAdSets: allocation.length,
      increases: increases.length,
      decreases: decreases.length,
      unchanged: unchanged.length,
      totalAllocated: allocation.reduce((sum, a) => sum + a.newBudget, 0),
      avgBudget: Math.round(allocation.reduce((sum, a) => sum + a.newBudget, 0) / allocation.length)
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(allocation) {
    const recommendations = [];

    // Check for large budget changes
    const largeChanges = allocation.filter(a => Math.abs(a.changePercent) > 50);
    if (largeChanges.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Budget Changes',
        issue: `${largeChanges.length} ad sets have >50% budget change`,
        action: 'Monitor closely for first 24-48 hours after change',
        adSets: largeChanges.map(a => a.name)
      });
    }

    // Check for very low budgets
    const lowBudgets = allocation.filter(a => a.newBudget < 50);
    if (lowBudgets.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Low Budgets',
        issue: `${lowBudgets.length} ad sets have <$50/day budget`,
        action: 'Consider consolidating or pausing these ad sets',
        adSets: lowBudgets.map(a => a.name)
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n💰 BUDGET ALLOCATION REPORT\n');
    console.log('═'.repeat(60));

    console.log(`\nStrategy: ${result.strategy.toUpperCase()}`);
    console.log(`Total Budget: $${result.totalBudget}/day`);

    console.log('\n\n📊 SUMMARY\n');
    console.log(`Total Ad Sets: ${result.summary.totalAdSets}`);
    console.log(`Increases: ${result.summary.increases}`);
    console.log(`Decreases: ${result.summary.decreases}`);
    console.log(`Unchanged: ${result.summary.unchanged}`);
    console.log(`Average Budget: $${result.summary.avgBudget}/day`);

    console.log('\n\n💵 ALLOCATION\n');
    console.log('─'.repeat(60));

    result.allocation
      .sort((a, b) => b.newBudget - a.newBudget)
      .forEach((adSet, i) => {
        const changeIcon = adSet.change > 0 ? '📈' : adSet.change < 0 ? '📉' : '➡️';
        console.log(`\n${i + 1}. ${adSet.name} ${changeIcon}`);
        console.log(`   Current: $${adSet.currentBudget}/day`);
        console.log(`   New: $${adSet.newBudget}/day`);
        console.log(`   Change: ${adSet.change >= 0 ? '+' : ''}$${adSet.change}/day (${adSet.changePercent >= 0 ? '+' : ''}${adSet.changePercent}%)`);
        if (adSet.metrics.cpa) {
          console.log(`   CPA: $${adSet.metrics.cpa} | ROAS: ${adSet.metrics.roas || 'N/A'} | Conversions: ${adSet.metrics.conversions || 0}`);
        }
      });

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.category}`);
        console.log(`   Issue: ${rec.issue}`);
        console.log(`   Action: ${rec.action}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Allocation complete!\n');
  }
}

module.exports = BudgetAllocator;

// CLI usage
if (require.main === module) {
  const allocator = new BudgetAllocator({
    totalBudget: 1000,
    allocationStrategy: 'performance'
  });

  const adSets = [
    { name: 'LAL 1% Purchasers', currentBudget: 200, cpa: 20, roas: 8.5, conversions: 25, targetCPA: 150 },
    { name: 'LAL 2-3% Purchasers', currentBudget: 150, cpa: 35, roas: 6.0, conversions: 12, targetCPA: 150 },
    { name: 'Interest - Online Business', currentBudget: 200, cpa: 45, roas: 4.5, conversions: 10, targetCPA: 150 },
    { name: 'Broad + Expansion', currentBudget: 200, cpa: 180, roas: 1.8, conversions: 3, targetCPA: 150 },
    { name: 'Website Visitors 30d', currentBudget: 150, cpa: 25, roas: 7.0, conversions: 15, targetCPA: 150 },
    { name: 'Engaged 90d', currentBudget: 100, cpa: 30, roas: 6.5, conversions: 8, targetCPA: 150 }
  ];

  const result = allocator.allocate(adSets);
  allocator.formatOutput(result);
}

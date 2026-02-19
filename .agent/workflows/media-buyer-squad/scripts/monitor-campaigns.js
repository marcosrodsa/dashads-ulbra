/**
 * Monitor Campaigns Script
 * 
 * Automated campaign monitoring with alerts
 * 
 * @squad media-buyer-squad
 * @agent performance-analyst
 * @skill monitor-campaigns
 */

class CampaignMonitor {
  constructor(config = {}) {
    this.targetCPA = config.targetCPA;
    this.targetROAS = config.targetROAS || null;
    this.budgetAlertThreshold = config.budgetAlertThreshold || 0.2; // 20%
    this.frequencyThreshold = config.frequencyThreshold || 3.5;
  }

  /**
   * Monitor all campaigns
   */
  monitor(campaigns) {
    console.log('📊 Monitoring Campaigns...\n');

    const alerts = [];
    const summary = {
      total: campaigns.length,
      healthy: 0,
      warning: 0,
      critical: 0
    };

    campaigns.forEach(campaign => {
      const campaignAlerts = this.monitorCampaign(campaign);
      
      if (campaignAlerts.length === 0) {
        summary.healthy++;
      } else {
        const hasCritical = campaignAlerts.some(a => a.severity === 'CRITICAL');
        if (hasCritical) {
          summary.critical++;
        } else {
          summary.warning++;
        }
      }

      alerts.push({
        campaign: campaign.name,
        status: campaignAlerts.length === 0 ? 'HEALTHY' : 
                campaignAlerts.some(a => a.severity === 'CRITICAL') ? 'CRITICAL' : 'WARNING',
        alerts: campaignAlerts
      });
    });

    return {
      summary,
      alerts: alerts.filter(a => a.alerts.length > 0),
      recommendations: this.generateRecommendations(alerts)
    };
  }

  /**
   * Monitor single campaign
   */
  monitorCampaign(campaign) {
    const alerts = [];

    // Check delivery status
    if (campaign.status !== 'ACTIVE') {
      alerts.push({
        type: 'DELIVERY',
        severity: 'CRITICAL',
        message: `Campaign is ${campaign.status}`,
        action: 'Investigate why campaign is not active'
      });
    }

    // Check budget pacing
    const budgetPacing = campaign.spend / campaign.dailyBudget;
    if (budgetPacing > 1 + this.budgetAlertThreshold) {
      alerts.push({
        type: 'BUDGET',
        severity: 'WARNING',
        message: `Spending ${Math.round(budgetPacing * 100)}% of daily budget`,
        action: 'Check bid strategy or reduce budget'
      });
    } else if (budgetPacing < 1 - this.budgetAlertThreshold) {
      alerts.push({
        type: 'BUDGET',
        severity: 'WARNING',
        message: `Only spending ${Math.round(budgetPacing * 100)}% of daily budget`,
        action: 'Check audience size or increase bids'
      });
    }

    // Check CPA
    if (this.targetCPA && campaign.cpa) {
      if (campaign.cpa > this.targetCPA * 2.0) {
        alerts.push({
          type: 'CPA',
          severity: 'CRITICAL',
          message: `CPA is $${campaign.cpa} (target: $${this.targetCPA})`,
          action: 'Consider pausing campaign'
        });
      } else if (campaign.cpa > this.targetCPA * 1.5) {
        alerts.push({
          type: 'CPA',
          severity: 'WARNING',
          message: `CPA is $${campaign.cpa} (target: $${this.targetCPA})`,
          action: 'Monitor closely, may need optimization'
        });
      }
    }

    // Check ROAS
    if (this.targetROAS && campaign.roas) {
      if (campaign.roas < this.targetROAS * 0.5) {
        alerts.push({
          type: 'ROAS',
          severity: 'CRITICAL',
          message: `ROAS is ${campaign.roas} (target: ${this.targetROAS})`,
          action: 'Consider pausing campaign'
        });
      } else if (campaign.roas < this.targetROAS * 0.75) {
        alerts.push({
          type: 'ROAS',
          severity: 'WARNING',
          message: `ROAS is ${campaign.roas} (target: ${this.targetROAS})`,
          action: 'Monitor closely, may need optimization'
        });
      }
    }

    // Check frequency
    if (campaign.frequency > 4.0) {
      alerts.push({
        type: 'FREQUENCY',
        severity: 'CRITICAL',
        message: `Frequency is ${campaign.frequency}`,
        action: 'Refresh creative immediately'
      });
    } else if (campaign.frequency > this.frequencyThreshold) {
      alerts.push({
        type: 'FREQUENCY',
        severity: 'WARNING',
        message: `Frequency is ${campaign.frequency}`,
        action: 'Prepare creative refresh'
      });
    }

    // Check for no conversions
    if (campaign.spend >= 500 && campaign.conversions === 0) {
      alerts.push({
        type: 'CONVERSIONS',
        severity: 'CRITICAL',
        message: 'No conversions after $500 spend',
        action: 'Check tracking and pause if necessary'
      });
    }

    // Check for errors
    if (campaign.errors && campaign.errors.length > 0) {
      alerts.push({
        type: 'ERRORS',
        severity: 'CRITICAL',
        message: `${campaign.errors.length} error(s) detected`,
        action: 'Review and fix errors immediately'
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(alerts) {
    const recommendations = [];

    const criticalCampaigns = alerts.filter(a => a.status === 'CRITICAL');
    if (criticalCampaigns.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Address critical issues immediately',
        campaigns: criticalCampaigns.map(c => c.campaign),
        timeline: 'Today'
      });
    }

    const warningCampaigns = alerts.filter(a => a.status === 'WARNING');
    if (warningCampaigns.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Monitor and optimize warning campaigns',
        campaigns: warningCampaigns.map(c => c.campaign),
        timeline: '1-2 days'
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n📊 CAMPAIGN MONITORING REPORT\n');
    console.log('═'.repeat(60));

    console.log('\n📈 SUMMARY\n');
    console.log(`Total Campaigns: ${result.summary.total}`);
    console.log(`Healthy: ${result.summary.healthy} ✅`);
    console.log(`Warning: ${result.summary.warning} ⚠️`);
    console.log(`Critical: ${result.summary.critical} 🚨`);

    if (result.alerts.length > 0) {
      console.log('\n\n🚨 ALERTS\n');
      console.log('─'.repeat(60));

      result.alerts.forEach((campaign, i) => {
        const icon = campaign.status === 'CRITICAL' ? '🚨' : '⚠️';
        console.log(`\n${i + 1}. ${icon} ${campaign.campaign} (${campaign.status})`);
        
        campaign.alerts.forEach(alert => {
          console.log(`   [${alert.severity}] ${alert.type}: ${alert.message}`);
          console.log(`   → ${alert.action}`);
        });
      });
    }

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   Campaigns: ${rec.campaigns.join(', ')}`);
        console.log(`   Timeline: ${rec.timeline}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Monitoring complete!\n');
  }
}

module.exports = CampaignMonitor;

// CLI usage
if (require.main === module) {
  const monitor = new CampaignMonitor({
    targetCPA: 150,
    targetROAS: 3.0,
    budgetAlertThreshold: 0.2,
    frequencyThreshold: 3.5
  });

  const campaigns = [
    {
      name: 'Campaign A - LAL 1%',
      status: 'ACTIVE',
      dailyBudget: 100,
      spend: 95,
      conversions: 10,
      cpa: 9.5,
      roas: 8.2,
      frequency: 2.1,
      errors: []
    },
    {
      name: 'Campaign B - Interests',
      status: 'ACTIVE',
      dailyBudget: 100,
      spend: 520,
      conversions: 0,
      cpa: null,
      roas: null,
      frequency: 4.2,
      errors: []
    },
    {
      name: 'Campaign C - Retargeting',
      status: 'PAUSED',
      dailyBudget: 50,
      spend: 0,
      conversions: 0,
      cpa: null,
      roas: null,
      frequency: 0,
      errors: ['Payment method failed']
    }
  ];

  const result = monitor.monitor(campaigns);
  monitor.formatOutput(result);
}

/**
 * Structure Campaign Script
 * 
 * Creates optimal campaign structure based on strategy
 * 
 * @squad media-buyer-squad
 * @agent ad-midas
 * @skill structure-campaign
 */

class CampaignStructurer {
  constructor(config = {}) {
    this.budget = config.budget || 1000;
    this.funnelType = config.funnelType || 'ecommerce';
  }

  /**
   * Structure complete campaign
   */
  structure(input) {
    console.log('🏗️ Structuring Campaign...\n');

    const {
      campaignName,
      objective, // conversions | traffic | leads
      audiences, // array of audience definitions
      creativeCount
    } = input;

    const structure = {
      campaign: this.structureCampaign(campaignName, objective),
      adSets: this.structureAdSets(audiences),
      ads: this.structureAds(creativeCount),
      budgetAllocation: this.allocateBudget(audiences.length)
    };

    return {
      structure,
      summary: this.generateSummary(structure),
      recommendations: this.generateRecommendations(structure)
    };
  }

  /**
   * Structure campaign level
   */
  structureCampaign(name, objective) {
    return {
      name: name || 'Campaign - ' + new Date().toISOString().split('T')[0],
      objective: objective || 'CONVERSIONS',
      budgetType: 'CBO', // Campaign Budget Optimization
      dailyBudget: this.budget,
      bidStrategy: 'LOWEST_COST',
      schedule: 'CONTINUOUS',
      optimizationGoal: objective === 'conversions' ? 'PURCHASE' : 'LINK_CLICKS'
    };
  }

  /**
   * Structure ad sets
   */
  structureAdSets(audiences) {
    const adSets = [];

    // Prospecting ad sets
    const prospectingBudget = this.budget * 0.7; // 70% to prospecting
    const prospectingPerAdSet = prospectingBudget / Math.max(audiences.filter(a => a.type === 'prospecting').length, 1);

    audiences.filter(a => a.type === 'prospecting').forEach((audience, i) => {
      adSets.push({
        name: `Prospecting - ${audience.name}`,
        type: 'prospecting',
        targeting: audience.targeting,
        budget: Math.round(prospectingPerAdSet),
        bidStrategy: 'LOWEST_COST',
        optimizationEvent: 'PURCHASE',
        placements: 'AUTOMATIC'
      });
    });

    // Retargeting ad sets
    const retargetingBudget = this.budget * 0.3; // 30% to retargeting
    const retargetingPerAdSet = retargetingBudget / Math.max(audiences.filter(a => a.type === 'retargeting').length, 1);

    audiences.filter(a => a.type === 'retargeting').forEach((audience, i) => {
      adSets.push({
        name: `Retargeting - ${audience.name}`,
        type: 'retargeting',
        targeting: audience.targeting,
        budget: Math.round(retargetingPerAdSet),
        bidStrategy: 'LOWEST_COST',
        optimizationEvent: 'PURCHASE',
        placements: 'AUTOMATIC'
      });
    });

    return adSets;
  }

  /**
   * Structure ads
   */
  structureAds(creativeCount) {
    const ads = [];

    for (let i = 1; i <= creativeCount; i++) {
      ads.push({
        name: `Ad ${i}`,
        creative: {
          hook: `Hook ${Math.ceil(i / 2)}`,
          angle: i % 2 === 1 ? 'Angle A' : 'Angle B',
          format: 'VIDEO' // or IMAGE
        },
        copy: {
          primaryText: '[Generated copy]',
          headline: '[Generated headline]',
          description: '[Generated description]'
        },
        cta: 'LEARN_MORE',
        destinationUrl: '[Landing page URL]',
        utmParameters: {
          source: 'facebook',
          medium: 'paid',
          campaign: '[campaign_name]',
          content: `ad_${i}`,
          term: '[audience_name]'
        }
      });
    }

    return ads;
  }

  /**
   * Allocate budget
   */
  allocateBudget(audienceCount) {
    const prospectingCount = Math.ceil(audienceCount * 0.7);
    const retargetingCount = audienceCount - prospectingCount;

    return {
      total: this.budget,
      prospecting: {
        total: Math.round(this.budget * 0.7),
        perAdSet: Math.round((this.budget * 0.7) / prospectingCount),
        adSets: prospectingCount
      },
      retargeting: {
        total: Math.round(this.budget * 0.3),
        perAdSet: retargetingCount > 0 ? Math.round((this.budget * 0.3) / retargetingCount) : 0,
        adSets: retargetingCount
      }
    };
  }

  /**
   * Generate summary
   */
  generateSummary(structure) {
    return {
      campaign: 1,
      adSets: structure.adSets.length,
      ads: structure.ads.length,
      totalBudget: structure.campaign.dailyBudget,
      prospectingAdSets: structure.adSets.filter(a => a.type === 'prospecting').length,
      retargetingAdSets: structure.adSets.filter(a => a.type === 'retargeting').length
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(structure) {
    const recommendations = [];

    if (structure.adSets.length < 3) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Ad Sets',
        issue: 'Few ad sets',
        action: 'Consider adding more audience variations for testing'
      });
    }

    if (structure.ads.length < 6) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Ads',
        issue: 'Few ad variations',
        action: 'Create at least 6-9 ads for proper testing (3 hooks × 2-3 angles)'
      });
    }

    if (structure.campaign.dailyBudget < 500) {
      recommendations.push({
        priority: 'INFO',
        category: 'Budget',
        issue: 'Low budget',
        action: 'Consider increasing budget to $500-1000/day for faster learning'
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🏗️ CAMPAIGN STRUCTURE\n');
    console.log('═'.repeat(60));

    console.log('\n📊 SUMMARY\n');
    console.log(`Campaign: ${result.summary.campaign}`);
    console.log(`Ad Sets: ${result.summary.adSets} (${result.summary.prospectingAdSets} prospecting, ${result.summary.retargetingAdSets} retargeting)`);
    console.log(`Ads: ${result.summary.ads}`);
    console.log(`Total Budget: $${result.summary.totalBudget}/day`);

    console.log('\n\n🎯 CAMPAIGN LEVEL\n');
    console.log('─'.repeat(60));
    console.log(`Name: ${result.structure.campaign.name}`);
    console.log(`Objective: ${result.structure.campaign.objective}`);
    console.log(`Budget Type: ${result.structure.campaign.budgetType}`);
    console.log(`Daily Budget: $${result.structure.campaign.dailyBudget}`);
    console.log(`Bid Strategy: ${result.structure.campaign.bidStrategy}`);

    console.log('\n\n📍 AD SETS\n');
    console.log('─'.repeat(60));
    result.structure.adSets.forEach((adSet, i) => {
      console.log(`\n${i + 1}. ${adSet.name}`);
      console.log(`   Type: ${adSet.type}`);
      console.log(`   Budget: $${adSet.budget}/day`);
      console.log(`   Optimization: ${adSet.optimizationEvent}`);
    });

    console.log('\n\n💰 BUDGET ALLOCATION\n');
    console.log('─'.repeat(60));
    console.log(`\nProspecting: $${result.structure.budgetAllocation.prospecting.total}/day`);
    console.log(`  ${result.structure.budgetAllocation.prospecting.adSets} ad sets × $${result.structure.budgetAllocation.prospecting.perAdSet}/day`);
    console.log(`\nRetargeting: $${result.structure.budgetAllocation.retargeting.total}/day`);
    console.log(`  ${result.structure.budgetAllocation.retargeting.adSets} ad sets × $${result.structure.budgetAllocation.retargeting.perAdSet}/day`);

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
    console.log('\n✅ Structure complete!\n');
  }
}

module.exports = CampaignStructurer;

// CLI usage
if (require.main === module) {
  const structurer = new CampaignStructurer({
    budget: 1000,
    funnelType: 'ecommerce'
  });

  const input = {
    campaignName: 'Q1 2026 - Product Launch',
    objective: 'conversions',
    audiences: [
      { name: 'LAL 1% Purchasers', type: 'prospecting', targeting: 'LAL' },
      { name: 'LAL 2-3% Purchasers', type: 'prospecting', targeting: 'LAL' },
      { name: 'Interest - Online Business', type: 'prospecting', targeting: 'Interest' },
      { name: 'Broad + Expansion', type: 'prospecting', targeting: 'Broad' },
      { name: 'Website Visitors 30d', type: 'retargeting', targeting: 'Custom' },
      { name: 'Engaged 90d', type: 'retargeting', targeting: 'Custom' }
    ],
    creativeCount: 9
  };

  const result = structurer.structure(input);
  structurer.formatOutput(result);
}

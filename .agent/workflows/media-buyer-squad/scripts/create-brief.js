/**
 * Create Brief Script
 * 
 * Creates comprehensive creative briefs
 * 
 * @squad media-buyer-squad
 * @agent creative-analyst
 * @skill create-brief
 */

class BriefCreator {
  constructor(config = {}) {
    this.campaignInfo = config.campaignInfo || {};
  }

  /**
   * Create creative brief
   */
  create(input) {
    console.log('📝 Creating Creative Brief...\n');

    const brief = {
      overview: this.createOverview(input),
      audience: this.defineAudience(input.audience),
      messaging: this.defineMessaging(input),
      creative: this.defineCreativeRequirements(input),
      deliverables: this.defineDeliverables(input),
      timeline: this.createTimeline(input)
    };

    return {
      brief,
      summary: this.generateSummary(brief)
    };
  }

  /**
   * Create overview section
   */
  createOverview(input) {
    return {
      campaignName: input.campaignName || 'Campaign Name',
      objective: input.objective || 'Drive conversions',
      product: input.product || 'Product/Service Name',
      offer: input.offer || 'Main offer details',
      budget: input.budget || 'TBD',
      timeline: input.timeline || 'TBD'
    };
  }

  /**
   * Define audience
   */
  defineAudience(audienceInput) {
    return {
      primary: {
        demographics: audienceInput?.demographics || 'Age 25-54, All Genders',
        psychographics: audienceInput?.psychographics || 'Entrepreneurs, business owners',
        painPoints: audienceInput?.painPoints || [],
        desires: audienceInput?.desires || [],
        awarenessLevel: audienceInput?.awarenessLevel || 'Problem-Aware'
      },
      secondary: audienceInput?.secondary || null
    };
  }

  /**
   * Define messaging
   */
  defineMessaging(input) {
    return {
      coreMessage: input.coreMessage || 'Main value proposition',
      hooks: input.hooks || [
        'Hook option 1',
        'Hook option 2',
        'Hook option 3'
      ],
      angles: input.angles || [
        'Angle 1: Mechanism',
        'Angle 2: Transformation',
        'Angle 3: Authority'
      ],
      objections: input.objections || [
        'Objection 1',
        'Objection 2',
        'Objection 3'
      ],
      cta: input.cta || 'Learn More'
    };
  }

  /**
   * Define creative requirements
   */
  defineCreativeRequirements(input) {
    return {
      format: input.format || 'Video (9:16, 15-30s)',
      style: input.style || 'UGC, authentic, mobile-first',
      mustInclude: input.mustInclude || [
        'Hook in first 3 seconds',
        'Clear CTA',
        'Social proof',
        'Product demonstration'
      ],
      mustAvoid: input.mustAvoid || [
        'Generic stock footage',
        'Overly salesy tone',
        'Long intros'
      ],
      brandGuidelines: input.brandGuidelines || {
        colors: 'Brand colors',
        fonts: 'Brand fonts',
        logo: 'Logo usage guidelines'
      }
    };
  }

  /**
   * Define deliverables
   */
  defineDeliverables(input) {
    return {
      quantity: input.quantity || '6-9 ad variations',
      breakdown: input.breakdown || {
        hooks: 3,
        anglesPerHook: 2,
        totalAds: 6
      },
      formats: input.formats || [
        '9:16 vertical video (Stories/Reels)',
        '1:1 square video (Feed)',
        '16:9 horizontal video (optional)'
      ],
      specifications: {
        videoLength: '15-30 seconds',
        fileFormat: 'MP4, H.264',
        resolution: '1080x1920 (9:16)',
        maxFileSize: '4GB',
        captions: 'Required (burned-in)'
      }
    };
  }

  /**
   * Create timeline
   */
  createTimeline(input) {
    const today = new Date();
    const addDays = (days) => {
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    };

    return {
      briefDelivery: addDays(0),
      creativeReview: addDays(2),
      revisions: addDays(4),
      finalDelivery: addDays(6),
      launchDate: addDays(8)
    };
  }

  /**
   * Generate summary
   */
  generateSummary(brief) {
    return {
      campaignName: brief.overview.campaignName,
      objective: brief.overview.objective,
      targetAudience: brief.audience.primary.demographics,
      deliverables: brief.deliverables.quantity,
      timeline: `${brief.timeline.briefDelivery} → ${brief.timeline.launchDate}`
    };
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n📝 CREATIVE BRIEF\n');
    console.log('═'.repeat(60));

    console.log('\n📊 OVERVIEW\n');
    console.log(`Campaign: ${result.brief.overview.campaignName}`);
    console.log(`Objective: ${result.brief.overview.objective}`);
    console.log(`Product: ${result.brief.overview.product}`);
    console.log(`Offer: ${result.brief.overview.offer}`);
    console.log(`Budget: ${result.brief.overview.budget}`);

    console.log('\n\n👥 TARGET AUDIENCE\n');
    console.log('─'.repeat(60));
    console.log(`Demographics: ${result.brief.audience.primary.demographics}`);
    console.log(`Psychographics: ${result.brief.audience.primary.psychographics}`);
    console.log(`Awareness Level: ${result.brief.audience.primary.awarenessLevel}`);

    if (result.brief.audience.primary.painPoints.length > 0) {
      console.log('\nPain Points:');
      result.brief.audience.primary.painPoints.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p}`);
      });
    }

    console.log('\n\n💬 MESSAGING\n');
    console.log('─'.repeat(60));
    console.log(`Core Message: ${result.brief.messaging.coreMessage}`);
    
    console.log('\nHooks:');
    result.brief.messaging.hooks.forEach((h, i) => {
      console.log(`  ${i + 1}. ${h}`);
    });

    console.log('\nAngles:');
    result.brief.messaging.angles.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a}`);
    });

    console.log(`\nCTA: ${result.brief.messaging.cta}`);

    console.log('\n\n🎨 CREATIVE REQUIREMENTS\n');
    console.log('─'.repeat(60));
    console.log(`Format: ${result.brief.creative.format}`);
    console.log(`Style: ${result.brief.creative.style}`);

    console.log('\nMust Include:');
    result.brief.creative.mustInclude.forEach((item, i) => {
      console.log(`  ✓ ${item}`);
    });

    console.log('\nMust Avoid:');
    result.brief.creative.mustAvoid.forEach((item, i) => {
      console.log(`  ✗ ${item}`);
    });

    console.log('\n\n📦 DELIVERABLES\n');
    console.log('─'.repeat(60));
    console.log(`Quantity: ${result.brief.deliverables.quantity}`);
    console.log(`Breakdown: ${result.brief.deliverables.breakdown.hooks} hooks × ${result.brief.deliverables.breakdown.anglesPerHook} angles = ${result.brief.deliverables.breakdown.totalAds} ads`);

    console.log('\nFormats:');
    result.brief.deliverables.formats.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f}`);
    });

    console.log('\n\n📅 TIMELINE\n');
    console.log('─'.repeat(60));
    console.log(`Brief Delivery: ${result.brief.timeline.briefDelivery}`);
    console.log(`Creative Review: ${result.brief.timeline.creativeReview}`);
    console.log(`Revisions: ${result.brief.timeline.revisions}`);
    console.log(`Final Delivery: ${result.brief.timeline.finalDelivery}`);
    console.log(`Launch Date: ${result.brief.timeline.launchDate}`);

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Brief complete!\n');
  }
}

module.exports = BriefCreator;

// CLI usage
if (require.main === module) {
  const creator = new BriefCreator();

  const input = {
    campaignName: 'Q1 2026 - Product Launch',
    objective: 'Drive course sales',
    product: 'Ad Scaling Masterclass',
    offer: '$997 course + bonuses',
    budget: '$10,000',
    audience: {
      demographics: 'Age 25-54, All Genders, US/CA/UK/AU',
      psychographics: 'Online entrepreneurs, e-commerce owners, course creators',
      painPoints: [
        'Stuck at $10K/month',
        'Can\'t scale profitably',
        'Wasting money on testing'
      ],
      desires: [
        'Scale to $50K+/month',
        'Proven system',
        'Fast results'
      ],
      awarenessLevel: 'Problem-Aware'
    },
    coreMessage: 'The proven framework to scale from $5K to $50K/month in 90 days',
    hooks: [
      'Struggling to scale past $10K/month?',
      'What Meta doesn\'t tell you about scaling ads...',
      'From $5K to $50K/month in 90 days...'
    ],
    angles: [
      'Mechanism: The 3-step framework',
      'Transformation: $5K → $50K case study',
      'Authority: $2M spent on ads'
    ],
    cta: 'Get The Framework',
    format: 'Video (9:16, 15-30s)',
    style: 'UGC, authentic, mobile-first',
    quantity: '9 ad variations',
    breakdown: {
      hooks: 3,
      anglesPerHook: 3,
      totalAds: 9
    }
  };

  const result = creator.create(input);
  creator.formatOutput(result);
}

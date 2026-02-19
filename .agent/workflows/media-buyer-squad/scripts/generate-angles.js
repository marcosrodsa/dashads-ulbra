/**
 * Generate Angles Script
 * 
 * Generates creative angles for testing
 * 
 * @squad media-buyer-squad
 * @agent creative-analyst
 * @skill generate-angles
 */

class AngleGenerator {
  constructor(config = {}) {
    this.product = config.product || {};
    this.audience = config.audience || {};
  }

  /**
   * Generate angles
   */
  generate() {
    console.log('🎯 Generating Creative Angles...\n');

    const angles = {
      mechanism: this.generateMechanismAngles(),
      transformation: this.generateTransformationAngles(),
      authority: this.generateAuthorityAngles(),
      social: this.generateSocialAngles(),
      urgency: this.generateUrgencyAngles()
    };

    return {
      angles,
      allAngles: this.flattenAngles(angles),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate mechanism angles
   */
  generateMechanismAngles() {
    return [
      {
        name: 'The Framework',
        description: 'Focus on the unique system/method',
        example: 'The 3-step framework that took me from $5K to $50K/month',
        whenToUse: 'When you have a proprietary system',
        expectedPerformance: 'High'
      },
      {
        name: 'The Secret',
        description: 'Focus on hidden knowledge',
        example: 'The secret that 7-figure brands use to scale profitably',
        whenToUse: 'When you have insider knowledge',
        expectedPerformance: 'High'
      },
      {
        name: 'The Mistake',
        description: 'Focus on what NOT to do',
        example: 'The #1 mistake keeping you stuck at $10K/month',
        whenToUse: 'When you can identify common errors',
        expectedPerformance: 'Medium-High'
      }
    ];
  }

  /**
   * Generate transformation angles
   */
  generateTransformationAngles() {
    return [
      {
        name: 'Before/After',
        description: 'Show the journey',
        example: 'How I went from $5K to $50K/month in 90 days',
        whenToUse: 'When you have strong results',
        expectedPerformance: 'Very High'
      },
      {
        name: 'Case Study',
        description: 'Tell a specific story',
        example: 'How Sarah scaled from $8K to $45K/month using this framework',
        whenToUse: 'When you have client success stories',
        expectedPerformance: 'High'
      },
      {
        name: 'Timeline',
        description: 'Focus on speed of results',
        example: 'Scale to $50K/month in 90 days (or less)',
        whenToUse: 'When you have fast results',
        expectedPerformance: 'High'
      }
    ];
  }

  /**
   * Generate authority angles
   */
  generateAuthorityAngles() {
    return [
      {
        name: 'Investment',
        description: 'Show skin in the game',
        example: 'I spent $2M on ads so you don\'t have to make these mistakes',
        whenToUse: 'When you have significant experience',
        expectedPerformance: 'High'
      },
      {
        name: 'Credentials',
        description: 'Leverage expertise',
        example: 'After helping 500+ brands scale, here\'s what I learned',
        whenToUse: 'When you have impressive credentials',
        expectedPerformance: 'Medium-High'
      },
      {
        name: 'Contrarian',
        description: 'Challenge conventional wisdom',
        example: 'What Meta doesn\'t tell you about scaling ads',
        whenToUse: 'When you have unique insights',
        expectedPerformance: 'High'
      }
    ];
  }

  /**
   * Generate social angles
   */
  generateSocialAngles() {
    return [
      {
        name: 'Bandwagon',
        description: 'Show popularity',
        example: 'The system 500+ brands use to scale profitably',
        whenToUse: 'When you have many users/clients',
        expectedPerformance: 'Medium-High'
      },
      {
        name: 'Testimonial',
        description: 'Let customers speak',
        example: '"This framework 10x\'d my business" - Sarah, E-commerce Owner',
        whenToUse: 'When you have strong testimonials',
        expectedPerformance: 'High'
      },
      {
        name: 'Community',
        description: 'Emphasize belonging',
        example: 'Join 500+ entrepreneurs scaling to $50K+/month',
        whenToUse: 'When you have an active community',
        expectedPerformance: 'Medium'
      }
    ];
  }

  /**
   * Generate urgency angles
   */
  generateUrgencyAngles() {
    return [
      {
        name: 'Scarcity',
        description: 'Limited availability',
        example: 'Only 50 spots left for Q1 cohort',
        whenToUse: 'When you have genuine scarcity',
        expectedPerformance: 'High'
      },
      {
        name: 'Deadline',
        description: 'Time-limited offer',
        example: 'Enrollment closes Friday at midnight',
        whenToUse: 'When you have a real deadline',
        expectedPerformance: 'High'
      },
      {
        name: 'Opportunity Cost',
        description: 'Cost of inaction',
        example: 'Every day you wait costs you $500 in lost revenue',
        whenToUse: 'When you can quantify the cost',
        expectedPerformance: 'Medium-High'
      }
    ];
  }

  /**
   * Flatten angles
   */
  flattenAngles(angles) {
    const flattened = [];
    let index = 1;

    Object.keys(angles).forEach(category => {
      angles[category].forEach(angle => {
        flattened.push({
          id: index++,
          category,
          ...angle
        });
      });
    });

    return flattened;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    return [
      {
        priority: 'HIGH',
        action: 'Test 2-3 angles per hook',
        reasoning: 'Different angles resonate with different audience segments'
      },
      {
        priority: 'HIGH',
        action: 'Start with Transformation and Mechanism angles',
        reasoning: 'These typically perform best for cold traffic'
      },
      {
        priority: 'MEDIUM',
        action: 'Use Authority angles for warm traffic',
        reasoning: 'Works better when audience already knows you'
      },
      {
        priority: 'MEDIUM',
        action: 'Add Urgency angles after proving concept',
        reasoning: 'Urgency works best when demand is established'
      }
    ];
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n🎯 CREATIVE ANGLES\n');
    console.log('═'.repeat(60));

    console.log('\n📊 SUMMARY\n');
    console.log(`Total Angles: ${result.allAngles.length}`);
    console.log(`Categories: ${Object.keys(result.angles).length}`);

    Object.keys(result.angles).forEach(category => {
      console.log(`\n\n${category.toUpperCase()} ANGLES (${result.angles[category].length})\n`);
      console.log('─'.repeat(60));

      result.angles[category].forEach((angle, i) => {
        console.log(`\n${i + 1}. ${angle.name}`);
        console.log(`   Description: ${angle.description}`);
        console.log(`   Example: "${angle.example}"`);
        console.log(`   When to Use: ${angle.whenToUse}`);
        console.log(`   Expected Performance: ${angle.expectedPerformance}`);
      });
    });

    if (result.recommendations.length > 0) {
      console.log('\n\n💡 RECOMMENDATIONS\n');
      console.log('─'.repeat(60));
      result.recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   Reasoning: ${rec.reasoning}`);
      });
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Angle generation complete!\n');
  }
}

module.exports = AngleGenerator;

// CLI usage
if (require.main === module) {
  const generator = new AngleGenerator({
    product: {
      name: 'Ad Scaling Framework',
      type: 'Course'
    },
    audience: {
      type: 'Entrepreneurs',
      awarenessLevel: 'Problem-Aware'
    }
  });

  const result = generator.generate();
  generator.formatOutput(result);
}

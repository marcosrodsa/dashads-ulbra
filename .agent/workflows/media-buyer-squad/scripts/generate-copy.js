/**
 * Generate Copy Script
 * 
 * Generates ad copy using proven frameworks (PAS, AIDA, BAB, STORY)
 * 
 * @squad media-buyer-squad
 * @agent creative-analyst
 * @skill generate-copy
 */

class CopyGenerator {
  constructor(config = {}) {
    this.hook = config.hook || '';
    this.framework = config.framework || 'PAS'; // PAS | AIDA | BAB | STORY
    this.productInfo = config.productInfo || {};
    this.targetAudience = config.targetAudience || {};
  }

  /**
   * Generate copy using selected framework
   */
  generate() {
    console.log(`✍️ Generating Copy (${this.framework} Framework)...\n`);

    let copy;

    switch (this.framework) {
      case 'PAS':
        copy = this.generatePAS();
        break;
      case 'AIDA':
        copy = this.generateAIDA();
        break;
      case 'BAB':
        copy = this.generateBAB();
        break;
      case 'STORY':
        copy = this.generateSTORY();
        break;
      default:
        copy = this.generatePAS();
    }

    return {
      framework: this.framework,
      copy,
      wordCount: this.countWords(copy.primaryText),
      characterCount: copy.primaryText.length,
      recommendations: this.generateRecommendations(copy)
    };
  }

  /**
   * Generate PAS (Problem-Agitate-Solution) copy
   */
  generatePAS() {
    return {
      hook: this.hook || 'Struggling to scale past $10K/month?',
      primaryText: `${this.hook || 'Struggling to scale past $10K/month?'}

Here's why...

Most entrepreneurs hit a wall because they're missing ONE critical piece: a proven system for scaling ads profitably.

You're spending hours testing, burning through budget, and still not seeing results.

Every failed campaign feels like throwing money away. And the "gurus" selling courses? They've never actually scaled a real business.

But here's the truth: Scaling isn't about luck. It's about having the right framework.

The same framework that helped 500+ brands go from $5K to $50K+/month in 90 days.

Click below to discover the exact 3-step system we use to scale profitably (without wasting money on endless testing).`,
      headline: 'The Scaling System 500+ Brands Use',
      description: 'Go from $5K to $50K/month in 90 days',
      cta: 'Get The System Now',
      structure: {
        problem: 'Struggling to scale past $10K/month',
        agitate: 'Spending hours testing, burning budget, no results',
        solution: '3-step system to scale profitably'
      }
    };
  }

  /**
   * Generate AIDA (Attention-Interest-Desire-Action) copy
   */
  generateAIDA() {
    return {
      hook: this.hook || 'What Meta doesn\'t tell you about scaling ads...',
      primaryText: `${this.hook || 'What Meta doesn\'t tell you about scaling ads...'}

Most people think scaling is just "increase budget and hope for the best."

Wrong.

The brands crushing it at $50K+/month know something you don't: There's a specific sequence to scaling that Meta's algorithm LOVES.

It's the same sequence that:
→ Helped Sarah go from $8K to $45K/month in 60 days
→ Allowed Mike to 3x his ROAS while scaling
→ Enabled 500+ brands to break through their plateau

And the best part? It's simpler than you think.

No complex funnels. No expensive agencies. Just a proven 3-step framework you can implement this week.

Ready to scale the right way?`,
      headline: 'The Scaling Sequence Meta Loves',
      description: 'Used by 500+ brands to break $50K/month',
      cta: 'Show Me The Sequence',
      structure: {
        attention: 'What Meta doesn\'t tell you',
        interest: 'Specific sequence Meta loves',
        desire: 'Helped 500+ brands scale',
        action: 'Show me the sequence'
      }
    };
  }

  /**
   * Generate BAB (Before-After-Bridge) copy
   */
  generateBAB() {
    return {
      hook: this.hook || 'From $5K to $50K/month in 90 days...',
      primaryText: `${this.hook || 'From $5K to $50K/month in 90 days...'}

BEFORE: Stuck at $5-10K/month. Every time I tried to scale, CPA would skyrocket and ROAS would tank. Felt like I hit a ceiling.

AFTER: Consistently doing $50K+/month with BETTER metrics than before. CPA down 30%, ROAS up 2x. Scaling feels easy now.

What changed?

I discovered the exact framework that 7-figure brands use to scale profitably.

It's not about spending more. It's about scaling SMART.

The framework covers:
✓ When to scale (most people do this too early)
✓ How to scale (the 20% rule that prevents CPA spikes)
✓ What to scale (horizontal vs vertical - and when to use each)

This is the same system that helped 500+ brands break through their plateau.

Want the framework?`,
      headline: 'The Framework That Took Me From $5K to $50K/Month',
      description: 'Used by 500+ brands to scale profitably',
      cta: 'Get The Framework',
      structure: {
        before: 'Stuck at $5-10K/month, CPA spikes when scaling',
        after: '$50K+/month, CPA down 30%, ROAS up 2x',
        bridge: 'Framework 7-figure brands use'
      }
    };
  }

  /**
   * Generate STORY copy
   */
  generateSTORY() {
    return {
      hook: this.hook || 'I spent $2M on ads so you don\'t have to make these mistakes...',
      primaryText: `${this.hook || 'I spent $2M on ads so you don\'t have to make these mistakes...'}

3 years ago, I was where you are now.

Stuck at $10K/month. Afraid to scale because every time I did, I'd lose money.

I tried everything:
→ Hired expensive agencies ($5K/month retainers)
→ Bought every course (wasted $10K+)
→ Tested endlessly (burned $50K+ learning)

Nothing worked. Until I discovered ONE thing that changed everything.

It wasn't a new strategy. It wasn't a secret tactic.

It was a SYSTEM. A repeatable framework for scaling profitably.

Once I had it, everything clicked:
→ Month 1: $10K → $25K
→ Month 2: $25K → $40K
→ Month 3: $40K → $60K

Same business. Same offer. Just a better system.

Now I've helped 500+ brands do the same thing.

And today, I'm sharing the exact framework (for free).

No fluff. No theory. Just the 3-step system that works.`,
      headline: 'How I Went From $10K to $60K/Month in 90 Days',
      description: 'The framework that changed everything',
      cta: 'Get The Framework Free',
      structure: {
        setup: 'Stuck at $10K/month 3 years ago',
        struggle: 'Tried agencies, courses, testing - nothing worked',
        discovery: 'Found a repeatable system',
        transformation: '$10K → $60K in 90 days',
        offer: 'Sharing the framework for free'
      }
    };
  }

  /**
   * Count words
   */
  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(copy) {
    const recommendations = [];
    const wordCount = this.countWords(copy.primaryText);

    // Word count recommendation
    if (wordCount < 100) {
      recommendations.push({
        category: 'Length',
        issue: 'Copy is too short',
        action: 'Expand to 125-150 words for optimal engagement',
        priority: 'MEDIUM'
      });
    } else if (wordCount > 200) {
      recommendations.push({
        category: 'Length',
        issue: 'Copy is too long',
        action: 'Trim to 125-150 words to maintain attention',
        priority: 'MEDIUM'
      });
    } else {
      recommendations.push({
        category: 'Length',
        issue: 'Word count is optimal',
        action: 'Keep length as is',
        priority: 'INFO'
      });
    }

    // CTA recommendation
    if (!copy.cta || copy.cta.length < 10) {
      recommendations.push({
        category: 'CTA',
        issue: 'CTA is weak or missing',
        action: 'Add clear, action-oriented CTA',
        priority: 'HIGH'
      });
    }

    // Framework-specific recommendations
    if (this.framework === 'PAS') {
      recommendations.push({
        category: 'Framework',
        issue: 'Using PAS framework',
        action: 'Ensure Problem → Agitate → Solution flow is clear',
        priority: 'INFO'
      });
    }

    return recommendations;
  }

  /**
   * Format output
   */
  formatOutput(result) {
    console.log('\n✍️ GENERATED COPY\n');
    console.log('═'.repeat(60));

    console.log(`\nFramework: ${result.framework}`);
    console.log(`Word Count: ${result.wordCount} words`);
    console.log(`Character Count: ${result.characterCount} characters`);

    console.log('\n\n📝 COPY ELEMENTS\n');
    console.log('─'.repeat(60));

    console.log('\nHook:');
    console.log(`"${result.copy.hook}"`);

    console.log('\n\nPrimary Text:');
    console.log('─'.repeat(60));
    console.log(result.copy.primaryText);

    console.log('\n\nHeadline:');
    console.log(`"${result.copy.headline}"`);

    console.log('\n\nDescription:');
    console.log(`"${result.copy.description}"`);

    console.log('\n\nCTA:');
    console.log(`"${result.copy.cta}"`);

    console.log('\n\n🏗️ STRUCTURE\n');
    console.log('─'.repeat(60));
    Object.keys(result.copy.structure).forEach(key => {
      console.log(`${key}: ${result.copy.structure[key]}`);
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
    console.log('\n✅ Copy generation complete!\n');
  }
}

module.exports = CopyGenerator;

// CLI usage
if (require.main === module) {
  console.log('Example 1: PAS Framework\n');
  const generator1 = new CopyGenerator({
    hook: 'Struggling to scale past $10K/month?',
    framework: 'PAS'
  });
  const result1 = generator1.generate();
  generator1.formatOutput(result1);

  console.log('\n\n' + '='.repeat(60) + '\n\n');

  console.log('Example 2: STORY Framework\n');
  const generator2 = new CopyGenerator({
    hook: 'I spent $2M on ads so you don\'t have to make these mistakes...',
    framework: 'STORY'
  });
  const result2 = generator2.generate();
  generator2.formatOutput(result2);
}

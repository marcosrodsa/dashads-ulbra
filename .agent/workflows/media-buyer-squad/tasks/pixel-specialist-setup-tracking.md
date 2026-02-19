---
task: Setup Tracking
responsavel: "@pixel-specialist"
responsavel_type: agent
atomic_layer: task
Entrada: |
  - website_url: Website URL where pixel will be installed
  - platform: Platform type (Shopify, WordPress, Custom, etc.)
  - conversion_events: List of conversion events needed
  - access_credentials: Access to website and Meta Business Manager
Saida: |
  - pixel_id: Meta Pixel ID
  - installation_status: Pixel installation status
  - capi_status: CAPI integration status
  - event_match_quality: Event match quality score
  - test_results: Test conversion results
  - validation_report: Complete validation report
Checklist:
  - "[ ] Create/verify Meta Pixel"
  - "[ ] Install pixel on website"
  - "[ ] Configure standard events"
  - "[ ] Set up Conversions API (CAPI)"
  - "[ ] Configure event parameters"
  - "[ ] Test all conversion events"
  - "[ ] Validate event match quality (> 6.0)"
  - "[ ] Set attribution window"
  - "[ ] Document setup"
  - "[ ] Provide validation report"
---

# \*setup-tracking

Set up complete tracking infrastructure including Meta Pixel, Conversions API (CAPI), and all conversion events.

## Purpose

Ensure accurate tracking of all user actions and conversions. Proper tracking is CRITICAL for campaign optimization and ROI measurement. Without it, you're flying blind.

## When to Use

- Before launching any new campaign
- When setting up a new website/funnel
- When tracking is broken or inaccurate
- When migrating to new tracking setup
- After strategy is defined by @ad-midas

## Prerequisites

### Access Requirements

- [ ] Access to website (FTP, CMS admin, or developer)
- [ ] Access to Meta Business Manager
- [ ] Access to Meta Events Manager
- [ ] Admin access to Meta Pixel
- [ ] (Optional) Access to Google Tag Manager

### Technical Requirements

- [ ] Website is live and accessible
- [ ] HTTPS enabled (required for pixel)
- [ ] Conversion pages identified (thank you, confirmation, etc.)
- [ ] Developer available (if custom implementation)

### Information Needed

- [ ] Website platform (Shopify, WordPress, Custom, etc.)
- [ ] Conversion events needed (Purchase, Lead, etc.)
- [ ] Conversion values (order value, lead value)
- [ ] Attribution window preference

## Process

### Phase 1: Meta Pixel Setup (15-30 minutes)

#### Step 1.1: Create or Verify Meta Pixel

**Action**: Access Meta Events Manager

**Steps**:

1. Go to Meta Business Manager
2. Navigate to Events Manager
3. Click "Data Sources" → "Pixels"
4. Either:
   - Create new pixel (if first time)
   - Verify existing pixel (if already created)

**Create New Pixel**:

```
1. Click "Add" → "Meta Pixel"
2. Name: "[Business Name] Pixel"
3. Enter website URL
4. Click "Create"
5. Note Pixel ID: [SAVE THIS]
```

**Pixel ID Format**: 15-digit number (e.g., 123456789012345)

**Output**:

```
✅ Meta Pixel Created

Pixel ID: [123456789012345]
Pixel Name: [Business Name] Pixel
Website: [website-url.com]
Status: Active
Created: [Date]

Next: Install pixel on website
```

#### Step 1.2: Choose Installation Method

**Options**:

**Option A: Direct Installation** (Best for custom sites)

- Copy pixel base code
- Paste in website <head> section
- Requires developer access

**Option B: Google Tag Manager** (Recommended for most)

- Install via GTM container
- Easier to manage and update
- No code changes needed

**Option C: Platform Integration** (Easiest for platforms)

- Shopify: Use Meta app
- WordPress: Use plugin (PixelYourSite, etc.)
- WooCommerce: Use integration
- Other platforms: Check for native integration

**Recommendation**: Use Google Tag Manager for flexibility and ease of management.

#### Step 1.3: Install Pixel Base Code

**Method A: Direct Installation**

**Base Code**:

```html
<!-- Meta Pixel Code -->
<script>
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
  fbq("init", "YOUR_PIXEL_ID");
  fbq("track", "PageView");
</script>
<noscript>
  <img
    height="1"
    width="1"
    style="display:none"
    src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"
  />
</noscript>
<!-- End Meta Pixel Code -->
```

**Installation**:

1. Replace `YOUR_PIXEL_ID` with actual Pixel ID
2. Paste in <head> section of ALL pages
3. Save and publish

**Method B: Google Tag Manager**

**Steps**:

1. Log into Google Tag Manager
2. Create new tag:
   - Tag Type: "Custom HTML"
   - Name: "Meta Pixel - Base Code"
3. Paste pixel base code
4. Trigger: "All Pages"
5. Save and publish container

**Method C: Platform Integration**

**Shopify**:

1. Install "Facebook & Instagram" app
2. Connect Meta Business Manager
3. Select Pixel
4. App handles installation automatically

**WordPress (PixelYourSite)**:

1. Install PixelYourSite plugin
2. Enter Pixel ID in settings
3. Enable automatic PageView tracking
4. Save settings

#### Step 1.4: Verify Pixel Installation

**Action**: Use Meta Pixel Helper (Chrome extension)

**Steps**:

1. Install Meta Pixel Helper extension
2. Visit your website
3. Click extension icon
4. Verify pixel is firing

**Expected Result**:

```
✅ Pixel Found

Pixel ID: [123456789012345]
Status: Active
Events Detected:
- PageView ✅

No errors found
```

**Common Issues**:

**Pixel not found**:

- Check if code is in <head> section
- Check if GTM container is published
- Clear browser cache and retry

**Multiple pixels detected**:

- Remove duplicate installations
- Keep only one pixel per page

**Pixel not loading**:

- Check HTTPS is enabled
- Check for JavaScript errors
- Check ad blockers (disable for testing)

### Phase 2: Standard Events Configuration (30-60 minutes)

#### Step 2.1: Identify Required Events

**Standard Events**:

| Event                | When to Use          | Priority    |
| -------------------- | -------------------- | ----------- |
| PageView             | Every page load      | REQUIRED    |
| ViewContent          | Product/content page | Recommended |
| AddToCart            | Add to cart action   | Recommended |
| InitiateCheckout     | Checkout page load   | Recommended |
| Purchase             | Order confirmation   | CRITICAL    |
| Lead                 | Form submission      | CRITICAL    |
| CompleteRegistration | Account creation     | Optional    |
| Search               | Search action        | Optional    |

**For E-commerce**: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase

**For Lead Generation**: PageView, ViewContent, Lead

**For SaaS**: PageView, ViewContent, CompleteRegistration, Purchase (subscription)

#### Step 2.2: Configure Purchase Event (E-commerce)

**Event Code**:

```javascript
fbq("track", "Purchase", {
  value: 99.99, // Order total
  currency: "USD", // Currency code
  content_ids: ["SKU123"], // Product SKUs
  content_type: "product", // 'product' or 'product_group'
  num_items: 2, // Number of items
});
```

**Installation Location**: Order confirmation / Thank you page

**Dynamic Values** (requires developer):

```javascript
fbq('track', 'Purchase', {
  value: {{ order.total }},
  currency: '{{ order.currency }}',
  content_ids: {{ order.product_ids }},
  content_type: 'product',
  num_items: {{ order.quantity }}
});
```

**Platform-Specific**:

**Shopify**: Automatic via Facebook app (verify in checkout settings)

**WooCommerce**: Use PixelYourSite plugin (configure in settings)

**Custom**: Add code to thank you page template

#### Step 2.3: Configure Lead Event (Lead Gen)

**Event Code**:

```javascript
fbq("track", "Lead", {
  value: 50.0, // Lead value (optional)
  currency: "USD",
  content_name: "Contact Form", // Form name
  content_category: "Lead",
});
```

**Installation Location**: Form submission success page or thank you page

**Form Integration Options**:

**Option A: Thank You Page**

- Redirect to thank you page after submission
- Add Lead event to thank you page
- Simplest method

**Option B: AJAX Form**

- Fire event on form submit success
- Requires JavaScript knowledge
- No page redirect needed

**Example (AJAX)**:

```javascript
// On form submit success
$("#contact-form").on("submit", function (e) {
  e.preventDefault();

  // Submit form via AJAX
  $.ajax({
    // ... form submission code
    success: function () {
      // Fire Lead event
      fbq("track", "Lead", {
        value: 50.0,
        currency: "USD",
        content_name: "Contact Form",
      });

      // Show success message
      alert("Thank you! We will contact you soon.");
    },
  });
});
```

#### Step 2.4: Configure Other Events

**ViewContent** (Product page):

```javascript
fbq("track", "ViewContent", {
  content_ids: ["SKU123"],
  content_type: "product",
  value: 99.99,
  currency: "USD",
});
```

**AddToCart** (Add to cart button):

```javascript
fbq("track", "AddToCart", {
  content_ids: ["SKU123"],
  content_type: "product",
  value: 99.99,
  currency: "USD",
});
```

**InitiateCheckout** (Checkout page):

```javascript
fbq("track", "InitiateCheckout", {
  content_ids: ["SKU123", "SKU456"],
  content_type: "product",
  value: 199.98,
  currency: "USD",
  num_items: 2,
});
```

#### Step 2.5: Test Events

**Action**: Use Meta Pixel Helper and Test Events tool

**Steps**:

1. Open website in browser
2. Perform actions (view product, add to cart, checkout, purchase)
3. Check Pixel Helper for events
4. Go to Events Manager → Test Events
5. Enter website URL
6. Perform actions again
7. Verify events appear in Test Events

**Expected Result**:

```
✅ Events Firing Correctly

PageView: ✅ (All pages)
ViewContent: ✅ (Product pages)
AddToCart: ✅ (Add to cart action)
InitiateCheckout: ✅ (Checkout page)
Purchase: ✅ (Thank you page)

All parameters correct:
- value: ✅
- currency: ✅
- content_ids: ✅

No errors detected
```

### Phase 3: Conversions API (CAPI) Setup (45-90 minutes)

#### Step 3.1: Why CAPI is Critical

**Benefits**:

- **Bypass ad blockers** (20-40% of users block pixels)
- **Improve attribution** (iOS 14+ tracking limitations)
- **Reduce data loss** (browser-side tracking can fail)
- **Better event matching** (server-side has more data)
- **Higher event match quality** (improves campaign performance)

**Result**: 20-30% more conversions tracked vs. pixel alone

#### Step 3.2: Choose CAPI Implementation Method

**Options**:

**Option A: Platform Integration** (Easiest)

- Shopify: Built-in CAPI support
- WooCommerce: PixelYourSite Pro (paid)
- Other platforms: Check for native support

**Option B: Partner Integration**

- Use Meta Business Partner (e.g., Elevar, Littledata)
- Managed setup and maintenance
- Usually paid service

**Option C: Custom Implementation**

- Use Meta Conversions API directly
- Requires developer
- Most flexible but complex

**Recommendation**: Use platform integration if available, otherwise use partner integration.

#### Step 3.3: Set Up CAPI (Platform Integration Example)

**Shopify Example**:

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Facebook & Instagram"
3. Navigate to "Data sharing" settings
4. Enable "Maximum data sharing"
5. This automatically enables CAPI

**Verification**:

- Go to Meta Events Manager
- Click on your Pixel
- Go to "Settings" → "Conversions API"
- Should show "Active" with events being received

**WooCommerce (PixelYourSite Pro)**:

1. Install PixelYourSite Pro plugin
2. Go to PixelYourSite → Settings → Conversions API
3. Generate Access Token in Meta Events Manager
4. Paste Access Token in plugin settings
5. Enable "Send events via Conversions API"
6. Save settings

#### Step 3.4: Configure CAPI Parameters

**Required Parameters**:

```javascript
{
  "event_name": "Purchase",
  "event_time": 1234567890,  // Unix timestamp
  "event_source_url": "https://example.com/thank-you",
  "action_source": "website",
  "user_data": {
    "em": "hashed_email",      // SHA256 hashed
    "ph": "hashed_phone",      // SHA256 hashed
    "fn": "hashed_first_name", // SHA256 hashed
    "ln": "hashed_last_name",  // SHA256 hashed
    "ct": "hashed_city",
    "st": "hashed_state",
    "zp": "hashed_zip",
    "country": "hashed_country",
    "fbp": "_fbp_cookie_value",
    "fbc": "_fbc_cookie_value",
    "client_ip_address": "123.456.789.012",
    "client_user_agent": "Mozilla/5.0..."
  },
  "custom_data": {
    "value": 99.99,
    "currency": "USD",
    "content_ids": ["SKU123"],
    "content_type": "product"
  }
}
```

**Critical for Event Match Quality**:

- **Email** (hashed): +2.0 to EMQ score
- **Phone** (hashed): +1.5 to EMQ score
- **fbp cookie**: +1.0 to EMQ score
- **fbc cookie**: +0.5 to EMQ score

**Target**: Event Match Quality > 6.0 (minimum), > 8.0 (excellent)

#### Step 3.5: Implement Deduplication

**Why**: Prevent counting same conversion twice (browser pixel + CAPI)

**Method**: Use `event_id` parameter

**Browser Pixel**:

```javascript
fbq(
  "track",
  "Purchase",
  {
    value: 99.99,
    currency: "USD",
  },
  {
    eventID: "unique_event_id_12345",
  },
);
```

**CAPI**:

```javascript
{
  "event_name": "Purchase",
  "event_id": "unique_event_id_12345",  // Same ID
  // ... other parameters
}
```

**Event ID Requirements**:

- Must be unique per event
- Same ID for browser and server event
- Recommended format: `order_id_timestamp` or UUID

**Platform Integration**: Usually handles deduplication automatically

#### Step 3.6: Test CAPI

**Action**: Send test event and verify in Events Manager

**Steps**:

1. Perform test conversion (purchase or lead)
2. Go to Events Manager → Test Events
3. Look for event with "Server" source
4. Verify all parameters are present
5. Check event match quality score

**Expected Result**:

```
✅ CAPI Working

Event: Purchase
Source: Server ✅
Event Match Quality: 7.2 ✅

Parameters:
- event_name: Purchase ✅
- event_time: [timestamp] ✅
- user_data: [8 parameters] ✅
  - em (email): ✅
  - ph (phone): ✅
  - fbp: ✅
  - fbc: ✅
- custom_data: ✅
  - value: 99.99 ✅
  - currency: USD ✅

Deduplication: Working ✅
- event_id present
- No duplicate events

Status: CAPI ACTIVE ✅
```

### Phase 4: Attribution Configuration (15-30 minutes)

#### Step 4.1: Set Attribution Window

**Options**:

| Window   | Click  | View  | Use Case           |
| -------- | ------ | ----- | ------------------ |
| Default  | 7-day  | 1-day | Most campaigns     |
| Extended | 28-day | 1-day | Long sales cycles  |
| Short    | 1-day  | 1-day | Short sales cycles |

**Recommendation**: Start with 7-day click, 1-day view (default)

**How to Set**:

1. Go to Events Manager
2. Click on Pixel
3. Go to "Settings" → "Attribution"
4. Select attribution window
5. Save

#### Step 4.2: Choose Attribution Model

**Models**:

**Last Click** (Default):

- 100% credit to last ad clicked
- Best for: Direct response campaigns

**First Click**:

- 100% credit to first ad clicked
- Best for: Awareness campaigns

**Linear**:

- Equal credit across all touchpoints
- Best for: Multi-touch journeys

**Time Decay**:

- More credit to recent touchpoints
- Best for: Long sales cycles

**Data-Driven** (Requires volume):

- ML-based credit distribution
- Best for: High-volume campaigns (1000+ conversions/month)

**Recommendation**: Use Last Click for most paid traffic campaigns

### Phase 5: Validation & Testing (30-45 minutes)

#### Step 5.1: Complete Pixel Health Check

**Checklist**:

**Pixel Installation**:

- [ ] Pixel fires on all pages
- [ ] No duplicate pixels
- [ ] No JavaScript errors
- [ ] Pixel Helper shows green checkmark

**Standard Events**:

- [ ] PageView fires on all pages
- [ ] ViewContent fires on product pages
- [ ] AddToCart fires on add to cart action
- [ ] InitiateCheckout fires on checkout page
- [ ] Purchase fires on thank you page
- [ ] Lead fires on form submission

**Event Parameters**:

- [ ] value parameter present and correct
- [ ] currency parameter present
- [ ] content_ids present (where applicable)
- [ ] All parameters match actual data

**CAPI**:

- [ ] CAPI active and sending events
- [ ] Event match quality > 6.0
- [ ] Deduplication working (event_id)
- [ ] User data parameters present (email, phone, fbp, fbc)

**Events Manager**:

- [ ] No errors in Diagnostics tab
- [ ] No warnings
- [ ] Events showing in Activity log
- [ ] Event count matches expectations

#### Step 5.2: Run Test Conversions

**Action**: Perform complete conversion flow

**E-commerce Test**:

1. Visit homepage (PageView)
2. View product page (ViewContent)
3. Add to cart (AddToCart)
4. Go to checkout (InitiateCheckout)
5. Complete purchase (Purchase)

**Lead Gen Test**:

1. Visit homepage (PageView)
2. View landing page (ViewContent)
3. Submit form (Lead)

**Verification**:

- Check Pixel Helper after each step
- Verify events in Test Events tool
- Confirm events in Events Manager Activity
- Verify both Browser and Server events (CAPI)

**Expected Result**:

```
✅ Test Conversion Complete

Flow: Homepage → Product → Cart → Checkout → Purchase

Events Tracked:
1. PageView (Browser) ✅
2. ViewContent (Browser + Server) ✅
3. AddToCart (Browser + Server) ✅
4. InitiateCheckout (Browser + Server) ✅
5. Purchase (Browser + Server) ✅

Deduplication: Working ✅
- No duplicate Purchase events

Event Match Quality: 7.5 ✅

Purchase Details:
- Value: $99.99 ✅
- Currency: USD ✅
- Product ID: SKU123 ✅

Status: ALL SYSTEMS GO ✅
```

#### Step 5.3: Monitor for 24 Hours

**Action**: Monitor Events Manager for any issues

**What to Check**:

- Events continue to fire correctly
- No errors appear
- Event match quality stays > 6.0
- Event count matches website traffic

**Common Issues**:

**Events stop firing**:

- Check if pixel code was removed
- Check for JavaScript errors
- Check if GTM container was unpublished

**Event match quality drops**:

- Check CAPI configuration
- Verify user data parameters
- Check email/phone hashing

**Duplicate events**:

- Check deduplication (event_id)
- Check for multiple pixel installations

### Phase 6: Documentation & Handoff (15-30 minutes)

#### Step 6.1: Create Validation Report

**Report Template**:

```markdown
# Tracking Setup Validation Report

**Date**: [Date]
**Website**: [URL]
**Pixel ID**: [ID]
**Completed by**: @pixel-specialist

## Setup Summary

### Meta Pixel

- **Status**: ACTIVE ✅
- **Installation Method**: [Direct / GTM / Platform]
- **Pages Covered**: All pages ✅

### Standard Events

| Event            | Status | Location      | Parameters                   |
| ---------------- | ------ | ------------- | ---------------------------- |
| PageView         | ✅     | All pages     | -                            |
| ViewContent      | ✅     | Product pages | value, currency, content_ids |
| AddToCart        | ✅     | Add to cart   | value, currency, content_ids |
| InitiateCheckout | ✅     | Checkout      | value, currency, num_items   |
| Purchase         | ✅     | Thank you     | value, currency, content_ids |

### Conversions API (CAPI)

- **Status**: ACTIVE ✅
- **Event Match Quality**: [score] ✅
- **Deduplication**: ENABLED ✅
- **User Data Parameters**: email, phone, fbp, fbc ✅

### Attribution

- **Attribution Window**: 7-day click, 1-day view
- **Attribution Model**: Last click

## Test Results

### Test Conversion

- **Type**: [Purchase / Lead]
- **Date/Time**: [Timestamp]
- **Result**: SUCCESS ✅

**Events Tracked**:

1. PageView ✅
2. ViewContent ✅
3. AddToCart ✅
4. InitiateCheckout ✅
5. Purchase ✅

**Browser Events**: 5/5 ✅
**Server Events (CAPI)**: 4/4 ✅
**Deduplication**: Working ✅

### Event Match Quality

- **Score**: [7.2] ✅ (Target: > 6.0)
- **Parameters Contributing**:
  - Email (hashed): ✅
  - Phone (hashed): ✅
  - fbp cookie: ✅
  - fbc cookie: ✅

## Validation Checklist

- [✅] Pixel installed on all pages
- [✅] All required events configured
- [✅] Event parameters correct
- [✅] CAPI integrated and active
- [✅] Event match quality > 6.0
- [✅] Test conversions successful
- [✅] Deduplication working
- [✅] No errors in Events Manager
- [✅] Attribution configured

## Status

**READY FOR CAMPAIGN LAUNCH** ✅

All tracking components are properly configured and validated. The system is ready to track conversions accurately.

## Next Steps

1. @ad-midas can proceed with campaign launch
2. Monitor Events Manager for first 24 hours post-launch
3. Verify real conversions are tracking correctly
4. Report any issues immediately

## Support

For tracking issues, contact:

- @pixel-specialist
- Use: *audit-tracking or *troubleshoot

---

**Validated by**: @pixel-specialist
**Date**: [Date]
**Signature**: ✅
```

#### Step 6.2: Handoff to @ad-midas

**Handoff Message**:

```
@ad-midas

✅ Tracking setup is COMPLETE and VALIDATED.

**Pixel ID**: [123456789012345]

**Status Summary**:
- Meta Pixel: ACTIVE ✅
- Standard Events: ALL CONFIGURED ✅
- CAPI: ACTIVE (EMQ = 7.2) ✅
- Test Conversions: SUCCESSFUL ✅
- Validation: COMPLETE ✅

**Events Configured**:
- PageView ✅
- ViewContent ✅
- AddToCart ✅
- InitiateCheckout ✅
- Purchase ✅

**Event Match Quality**: 7.2 ✅ (Target: > 6.0)

**Test Results**:
- Test purchase tracked successfully
- Both browser and server events firing
- Deduplication working
- No errors detected

**Documentation**:
- Full validation report: [link/attachment]
- Setup guide: [link]

**Status**: READY FOR CAMPAIGN LAUNCH 🚀

You can proceed with *launch-campaign.

I will monitor Events Manager for the first 24 hours post-launch and report any issues immediately.

— @pixel-specialist 🎯
```

## Output Format

### Setup Complete

```markdown
✅ TRACKING SETUP COMPLETE

**Meta Pixel**:

- Pixel ID: [123456789012345]
- Status: ACTIVE
- Installation: [Method]
- Coverage: All pages

**Standard Events**: [X] configured

- PageView ✅
- ViewContent ✅
- AddToCart ✅
- InitiateCheckout ✅
- Purchase ✅
- Lead ✅

**Conversions API (CAPI)**:

- Status: ACTIVE ✅
- Event Match Quality: [7.2] ✅
- Deduplication: ENABLED ✅
- User Data: email, phone, fbp, fbc ✅

**Test Results**:

- Test conversions: SUCCESSFUL ✅
- Browser events: FIRING ✅
- Server events: FIRING ✅
- No errors: ✅

**Attribution**:

- Window: 7-day click, 1-day view
- Model: Last click

**Validation Report**: [Attached]

**Status**: READY FOR LAUNCH 🚀

**Next**: @ad-midas \*launch-campaign
```

### If Issues Found

```markdown
⚠️ TRACKING SETUP - ISSUES FOUND

**Issues**:

1. [Issue description]
2. [Issue description]

**Impact**: [HIGH / MEDIUM / LOW]

**Required Actions**:

- [ ] [Action 1]
- [ ] [Action 2]

**Timeline**: [Estimated fix time]

**Status**: NOT READY FOR LAUNCH ⚠️

**Next**: Fix issues, then re-test
```

## Common Issues & Solutions

### Issue: Pixel Not Firing

**Symptoms**:

- Pixel Helper shows "No pixel found"
- No events in Events Manager

**Causes**:

- Pixel code not installed
- JavaScript errors on page
- Ad blocker enabled

**Solutions**:

1. Verify pixel code is in <head> section
2. Check browser console for errors
3. Disable ad blockers for testing
4. Clear browser cache

### Issue: Events Not Firing

**Symptoms**:

- Pixel fires but specific events don't

**Causes**:

- Event code not on correct page
- Event code has errors
- Event triggered before pixel loads

**Solutions**:

1. Verify event code is on correct page
2. Check event code syntax
3. Ensure pixel loads before event fires
4. Use Pixel Helper to debug

### Issue: Low Event Match Quality

**Symptoms**:

- EMQ score < 6.0

**Causes**:

- Missing user data parameters
- Incorrect hashing
- Missing cookies

**Solutions**:

1. Add email and phone (hashed)
2. Verify SHA256 hashing
3. Ensure fbp/fbc cookies are set
4. Check CAPI configuration

### Issue: Duplicate Events

**Symptoms**:

- Same event appears multiple times

**Causes**:

- Multiple pixel installations
- Browser + CAPI without deduplication
- Event triggered multiple times

**Solutions**:

1. Remove duplicate pixels
2. Implement event_id for deduplication
3. Fix event trigger logic

## Success Criteria

✅ **Setup Successful**:

- Pixel installed on all pages
- All required events configured
- Event parameters correct
- CAPI integrated (EMQ > 6.0)
- Test conversions successful
- Deduplication working
- No errors in Events Manager
- Validation report complete

✅ **Ready for Launch**:

- All checklist items complete
- @ad-midas notified
- Monitoring plan in place
- Support available for issues

## Related Tasks

- `ad-midas-launch-campaign.md` - Campaign launch (next step)
- `pixel-specialist-audit-tracking.md` - Ongoing tracking audits
- `performance-analyst-monitor-metrics.md` - Post-launch monitoring

## Related Checklists

- `pre-launch-checklist.md` - Pre-launch validation
- `tracking-validation-checklist.md` - Tracking validation

---

**Agent**: @pixel-specialist  
**Category**: Tracking Infrastructure  
**Complexity**: High  
**Estimated Time**: 2-4 hours  
**Critical**: YES - Required before any campaign launch

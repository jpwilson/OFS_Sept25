import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Pages to prerender with their content
const pages = {
  '/': {
    title: 'Our Family Socials - Private Family Social Network',
    description: 'A private, ad-free social network designed specifically for families to share life events, photos, and stories with GPS-tagged journey maps, without algorithms or data selling.',
    content: `
      <h1>Never miss your family's greatest adventures</h1>
      <p>From weekend getaways to once-in-a-lifetime trips, keep up with what your family is doing. See where they've been, relive the moments, and stay connected across any distance.</p>
      <h2>Your memories are yours</h2>
      <p>No ads. No data selling. No algorithms. Just a private space for your family.</p>
      <ul>
        <li>Private by default - Every event is private. Share only with family you approve.</li>
        <li>No ads, ever - We'll never sell your data or show ads. Your memories aren't a product.</li>
        <li>Built for families - Made by a family, for families. We get what matters to you.</li>
      </ul>
      <h2>Features</h2>
      <ul>
        <li><strong>Follow Family Members</strong> - See what your family is up to, always. Never miss a birthday party, graduation, vacation, or Sunday dinner.</li>
        <li><strong>Rich Event Pages</strong> - Create beautiful event pages with photo galleries, stories, and all the details. Document every adventure with all the context that makes it special.</li>
        <li><strong>Interactive Maps & Timeline</strong> - See every trip on an interactive map. Watch your family's adventures unfold chronologically.</li>
        <li><strong>GPS Photo Extraction</strong> - Automatically extract location data from your photo metadata.</li>
        <li><strong>AI-Powered Stories</strong> - Let AI help you write event descriptions from your photos.</li>
        <li><strong>Family Trees</strong> - Visual family tree showing verified relationships.</li>
      </ul>
      <h2>Simple, transparent pricing</h2>
      <p>Start for free. Upgrade when you need more. Only published events count towards your limit—drafts and deleted events are free!</p>
      <ul>
        <li><strong>Free Plan ($0/forever)</strong> - View-only access, like and comment, follow family members, interactive maps & timeline. 30-day Pro trial included.</li>
        <li><strong>Pro Plan ($9/month annual, $12/month monthly)</strong> - Create unlimited events, unlimited photo uploads, GPS extraction, journey mapping, privacy controls.</li>
        <li><strong>Lifetime Plan ($294 one-time)</strong> - Everything in Pro, no recurring fees, all future updates.</li>
      </ul>
      <p><strong>30-day free trial on all accounts.</strong></p>
      <a href="/login?signup=true">Get started for free</a>
    `
  },
  '/pricing': {
    title: 'Pricing - Our Family Socials',
    description: 'Simple, transparent pricing for Our Family Socials. Free plan for viewing, Pro plan at $9/month (annual) for unlimited event creation, or Lifetime for $294.',
    content: `
      <h1>Simple, transparent pricing</h1>
      <p>Start for free. Upgrade when you need more. Only published events count towards your limit—drafts and deleted events are free!</p>
      <h2>Free to View ($0/forever)</h2>
      <p>Perfect for family viewers</p>
      <ul>
        <li>View-only — cannot create events</li>
        <li>View all shared events</li>
        <li>Like and comment</li>
        <li>Follow family members</li>
        <li>Interactive maps & timeline</li>
        <li>30-day Pro trial included</li>
      </ul>
      <h2>Pro ($9/month annual, $12/month monthly)</h2>
      <p>Most Popular - Billed annually at $108/year or monthly at $12/month</p>
      <ul>
        <li><strong>Create unlimited events</strong></li>
        <li>Photo and video uploads</li>
        <li>Journey mapping</li>
        <li>GPS extraction from photos</li>
        <li>Privacy controls</li>
        <li>Rich text editor</li>
      </ul>
      <h2>Lifetime ($294 one-time)</h2>
      <p>Pay once, use forever</p>
      <ul>
        <li><strong>Everything in Pro</strong></li>
        <li>No recurring fees</li>
        <li>All future updates</li>
        <li>Priority support</li>
        <li>Early access to features</li>
        <li>Best long-term value</li>
      </ul>
      <p><strong>30-day free trial on all accounts.</strong> Subscribe within 5 days for an extra month free!</p>
      <a href="/login?signup=true">Start Free Trial</a>
    `
  },
  '/about': {
    title: 'About - Our Family Socials',
    description: 'Our Family Socials is a private, ad-free social network designed specifically for families to share life events, photos, and memories together.',
    content: `
      <h1>About Our Family Socials</h1>
      <p>A private social network designed specifically for families</p>
      <h2>What is Our Family Socials?</h2>
      <p>Our Family Socials is a private, ad-free social network designed specifically for families to share life events, photos, and memories together. Unlike public social media platforms, everything is private by default, and there are no algorithms manipulating what you see.</p>
      <p>We built this platform because existing social networks weren't designed for families. They're cluttered with ads, algorithms hide your posts, and your family photos end up mixed with everything else in an endless scroll. Our Family Socials gives families a dedicated space to preserve memories the way they deserve.</p>
      <h2>Why We're Different</h2>
      <ul>
        <li><strong>Private by Default</strong> - Every event is private unless you explicitly share it. You control exactly who can see each memory.</li>
        <li><strong>No Ads, Ever</strong> - We'll never sell your data or show you ads. Your family memories aren't a product to be monetized.</li>
        <li><strong>Rich Event Pages</strong> - Create beautiful event pages with photo galleries, detailed stories, multiple locations, and GPS-tagged journey maps.</li>
        <li><strong>Interactive Maps & Timeline</strong> - See your family's adventures on an interactive world map. Watch years of memories unfold chronologically.</li>
        <li><strong>AI-Powered Stories</strong> - Let AI help you write event descriptions. Upload your photos, and we'll generate a story based on what's in them.</li>
        <li><strong>Built for Families</strong> - Made by a family, for families. We use this app ourselves to stay connected with our own loved ones.</li>
      </ul>
      <h2>How It Works</h2>
      <ol>
        <li><strong>Create an Account</strong> - Sign up for free at ourfamilysocials.com. You'll get a 30-day Pro trial automatically.</li>
        <li><strong>Follow Your Family</strong> - Send follow requests to family members. Once they accept, you'll see each other's events.</li>
        <li><strong>Share Life Events</strong> - Create event pages with photos, stories, locations, and dates. Choose who can see each event.</li>
        <li><strong>Stay Connected</strong> - View your family's events in the feed, on the map, or in the timeline. Comment, like, and engage.</li>
      </ol>
      <h2>Pricing</h2>
      <p>We offer a free plan for family members who want to view and engage with events (but not create them), and a Pro plan ($9/month annual or $12/month) for unlimited event creation. We also offer a one-time Lifetime plan ($294) for long-term users.</p>
      <p><strong>All new accounts get a 30-day free trial of Pro features.</strong> Only published events count toward your limit—drafts and deleted events are free.</p>
      <a href="/pricing">View Pricing Details</a>
      <h2>Who It's For</h2>
      <ul>
        <li><strong>Parents</strong> wanting to share kids' milestones with grandparents</li>
        <li><strong>Extended families</strong> staying connected across distance</li>
        <li><strong>Travelers</strong> documenting vacations with rich photo albums and maps</li>
        <li><strong>Anyone</strong> tired of public social media and seeking a private alternative</li>
        <li><strong>Families</strong> who value privacy and want to preserve memories without ads</li>
      </ul>
      <a href="/login?signup=true">Sign Up Free</a>
    `
  },
  '/faq': {
    title: 'FAQ - Our Family Socials',
    description: 'Frequently asked questions about Our Family Socials, a private family social network.',
    content: `
      <h1>Help Center</h1>
      <p>Frequently asked questions about Our Family Socials</p>
      <h2>Getting Started</h2>
      <h3>What is Our Family Socials?</h3>
      <p>Our Family Socials is a private social network designed for families. It lets you share life events, photos, and stories with your closest family members and friends. Unlike public social media, everything is private by default and there are no ads or algorithms.</p>
      <h3>Is it really free?</h3>
      <p>Yes! The free plan is free forever and includes unlimited viewing of shared events, following family members, commenting, and liking. You can also create up to 5 events. For unlimited event creation and premium features, you can upgrade to Pro.</p>
      <h3>How do I invite my family members?</h3>
      <p>Go to your Profile and you'll find an invite option. You can send email invitations to family members. When they sign up using your invite link, you'll automatically be connected.</p>
      <h3>Can I use it on my phone?</h3>
      <p>Absolutely! Our Family Socials is fully responsive and works great on phones, tablets, and computers. Just visit ourfamilysocials.com in your mobile browser.</p>
      <h2>Events & Content</h2>
      <h3>What is an "event"?</h3>
      <p>An event is a collection of photos, stories, and details about something that happened - like a vacation, birthday party, graduation, or Sunday dinner. Think of it as a rich, detailed post that tells the full story of a moment.</p>
      <h3>How many photos can I add to an event?</h3>
      <p>Pro users can add unlimited photos to each event. Free users can create up to 5 events total. We support high-resolution images and will preserve your original photo quality.</p>
      <h3>Can I add locations to my events?</h3>
      <p>Yes! You can add multiple locations to each event, perfect for road trips and multi-destination adventures. We can also automatically extract GPS data from your photos to suggest locations.</p>
      <h2>Privacy & Sharing</h2>
      <h3>Who can see my events?</h3>
      <p>Only people you've approved as followers can see your events. When someone wants to follow you, you'll receive a request that you can accept or decline. You have full control over your audience.</p>
      <h3>Can I share an event with someone who doesn't have an account?</h3>
      <p>Yes! Each event can be shared via a private link. Recipients can view that specific event without needing an account, but they won't see your other events or be able to follow you.</p>
      <h3>Is my data safe?</h3>
      <p>Yes. We take privacy seriously. We never sell your data, show ads, or use algorithms to manipulate what you see. Your photos and stories are yours, and we're just here to help you preserve and share them with family.</p>
      <h2>Subscription & Billing</h2>
      <h3>What's included in the free trial?</h3>
      <p>Every new account gets a 30-day free trial of Pro features. During the trial, you can create unlimited events and access all premium features. After the trial, you'll revert to the free plan unless you subscribe.</p>
      <h3>How do I upgrade to Pro?</h3>
      <p>Go to Settings > Membership from your profile page. You can choose monthly ($12/mo) or annual ($9/mo billed yearly) billing. We also offer a one-time Lifetime option.</p>
      <h3>Can I cancel anytime?</h3>
      <p>Yes! You can cancel your subscription anytime. You'll keep Pro access until the end of your billing period. Your events and data are never deleted when you cancel.</p>
      <a href="/contact">Contact Us</a>
    `
  },
  '/compare/facebook-groups': {
    title: 'Our Family Socials vs. Private Facebook Groups',
    description: 'Why families are switching from Facebook groups to a purpose-built family network. True privacy, no ads, chronological feed, better organization.',
    content: `
      <h1>Our Family Socials vs. Private Facebook Groups</h1>
      <p>Why families are switching from Facebook groups to a purpose-built family network</p>
      <h2>The Problem with Private Facebook Groups</h2>
      <p>Private Facebook groups are a common way for families to stay connected, but they have significant limitations. They're built for general groups, not families, and they come with all the downsides of the Facebook platform: ads, algorithmic feeds, privacy concerns, and a cluttered interface that wasn't designed for preserving family memories.</p>
      <h2>Key Differences</h2>
      <h3>Platform Privacy</h3>
      <p><strong>Private Facebook Group:</strong> Still on Facebook's platform, subject to their data collection, ad targeting, and policy changes</p>
      <p><strong>Our Family Socials:</strong> Completely separate platform with no data selling, no ad targeting, no connection to Meta</p>
      <h3>Feed Algorithm</h3>
      <p><strong>Private Facebook Group:</strong> Algorithmic feed hides posts, even in groups. You might miss important family updates</p>
      <p><strong>Our Family Socials:</strong> Chronological feed always. See every post from family members in the order they're shared</p>
      <h3>Advertising</h3>
      <p><strong>Private Facebook Group:</strong> Ads appear in your feed, even in private groups. Your family photos appear next to ads</p>
      <p><strong>Our Family Socials:</strong> Zero ads, ever. Your family memories are never interrupted by advertising</p>
      <h3>Content Organization</h3>
      <p><strong>Private Facebook Group:</strong> Posts get lost in endless scroll. Hard to find that vacation album from last year</p>
      <p><strong>Our Family Socials:</strong> Events organized by date, location, and person. Timeline and map views for easy browsing</p>
      <h2>Why Families Are Switching</h2>
      <ul>
        <li><strong>True Privacy:</strong> Not on Meta's platform, no data collection for ad targeting</li>
        <li><strong>No Missed Posts:</strong> Chronological feed ensures you see everything</li>
        <li><strong>Better Organization:</strong> Events, timeline, and map views make it easy to browse years of memories</li>
        <li><strong>Ad-Free Experience:</strong> Family photos without advertisements interrupting</li>
        <li><strong>Purpose-Built:</strong> Designed for families from the ground up</li>
        <li><strong>GPS Features:</strong> Journey maps and location tracking perfect for vacation documentation</li>
      </ul>
      <a href="/login?signup=true">Start Free Trial</a>
    `
  },
  '/compare/tinybeans': {
    title: 'Our Family Socials vs. Tinybeans',
    description: 'When your kids grow up, you need a platform that grows with them. Compare Tinybeans and Our Family Socials for all family events.',
    content: `
      <h1>Our Family Socials vs. Tinybeans</h1>
      <p>When your kids grow up, you need a platform that grows with them</p>
      <h2>Tinybeans Is Great... Until Your Kids Grow Up</h2>
      <p>Tinybeans is a popular app for parents to share baby and toddler photos. But as your children get older, families find themselves needing something more comprehensive. What happens when you want to share your teenager's graduation, your anniversary trip, or grandparents' milestone birthdays? Tinybeans is focused on young children, leaving families searching for a platform that covers the whole family's story.</p>
      <h2>Key Differences</h2>
      <h3>Family Scope</h3>
      <p><strong>Tinybeans:</strong> Designed specifically for babies and young kids. Limited scope for broader family events</p>
      <p><strong>Our Family Socials:</strong> All family events: kids' milestones, vacations, anniversaries, grandparents, cousins, everyone</p>
      <h3>Event Types</h3>
      <p><strong>Tinybeans:</strong> Daily photo journals focused on children's daily activities and milestones</p>
      <p><strong>Our Family Socials:</strong> Rich event pages for any occasion: vacations, birthdays, graduations, reunions, holidays, dinners</p>
      <h3>Journey Maps</h3>
      <p><strong>Tinybeans:</strong> No map or location-based features</p>
      <p><strong>Our Family Socials:</strong> Interactive world map showing all events, multi-location journey maps, GPS extraction from photos</p>
      <h3>Family Network</h3>
      <p><strong>Tinybeans:</strong> Invite-only viewers for your child's journal. Focused on one immediate family</p>
      <p><strong>Our Family Socials:</strong> Follow extended family members, see their events, build a full family network across generations</p>
      <h3>Long-Term Value</h3>
      <p><strong>Tinybeans:</strong> Great for baby/toddler years, but families outgrow it as kids age</p>
      <p><strong>Our Family Socials:</strong> Lifetime value: birth to college graduation to weddings to grandchildren—one platform forever</p>
      <h2>When Families Switch from Tinybeans</h2>
      <ul>
        <li><strong>Kids are getting older:</strong> Your 10-year-old's soccer tournament doesn't fit Tinybeans' baby-focused model</li>
        <li><strong>Need more than kid content:</strong> You want to share your vacation, your anniversary, grandma's 80th birthday</li>
        <li><strong>Extended family events:</strong> Tinybeans doesn't handle family reunions, weddings, or multi-generational gatherings</li>
        <li><strong>Want richer content:</strong> Need journey maps, detailed stories, and better organization beyond daily photo journals</li>
        <li><strong>Building family history:</strong> Want a platform that captures the whole family's story, not just the kids</li>
      </ul>
      <a href="/login?signup=true">Start Free Trial</a>
    `
  },
  '/compare/how-to-share-photos-privately': {
    title: 'How to Share Kids\' Photos Privately with Family',
    description: 'A complete guide to private photo sharing without public social media. Compare options like private family networks, cloud albums, and more.',
    content: `
      <h1>How to Share Kids' Photos Privately with Family</h1>
      <p>A complete guide to private photo sharing without public social media</p>
      <h2>The Problem with Public Social Media</h2>
      <p>Many parents are uncomfortable posting their children's photos on public platforms like Facebook and Instagram. Privacy concerns, unwanted attention, data collection, and the permanence of online content make parents think twice. Yet grandparents, aunts, uncles, and extended family want to stay connected and see those precious moments.</p>
      <p>The good news? There are better ways to share family photos privately while still keeping everyone connected.</p>
      <h2>What to Look for in a Private Photo Sharing Solution</h2>
      <ul>
        <li><strong>Privacy by default:</strong> Photos should be private unless you explicitly share them</li>
        <li><strong>No public platform:</strong> Not on Facebook, Instagram, or other ad-driven social networks</li>
        <li><strong>Control over audience:</strong> Choose exactly who sees each photo or album</li>
        <li><strong>No data selling:</strong> Your family photos shouldn't be monetized</li>
        <li><strong>Easy for grandparents:</strong> Simple enough for less tech-savvy family members</li>
        <li><strong>Organized by events:</strong> Group photos by occasion (vacation, birthday, etc.)</li>
        <li><strong>Long-term storage:</strong> Build a family archive over years</li>
      </ul>
      <h2>Option 1: Private Family Social Network (Recommended)</h2>
      <p>A purpose-built family social network like <strong>Our Family Socials</strong> gives you all the convenience of social media without the privacy concerns.</p>
      <h3>Pros:</h3>
      <ul>
        <li>Private by default—only approved family sees content</li>
        <li>No ads or data collection</li>
        <li>Organized by events with dates, locations, and context</li>
        <li>Easy for grandparents to use (simple interface)</li>
        <li>Comment and engage just like social media</li>
        <li>Interactive maps showing where photos were taken</li>
        <li>Chronological feed (no algorithm hiding posts)</li>
      </ul>
      <h3>Cons:</h3>
      <ul>
        <li>Requires family members to create an account (though it's simple)</li>
        <li>Pro plan costs $9-12/month for unlimited uploads (free viewing available)</li>
      </ul>
      <p><strong>Best for:</strong> Families who want an ongoing, organized way to share life updates, not just photos but stories, milestones, and context.</p>
      <a href="/login?signup=true">Try Our Family Socials Free</a>
      <h2>Why Private Family Networks Are the Best Solution</h2>
      <p>After trying all the options, most families find that a private, purpose-built family network offers the best balance of convenience, privacy, and family engagement. You get:</p>
      <ul>
        <li>The social features of Facebook without the privacy concerns</li>
        <li>Better organization than cloud albums</li>
        <li>Real-time sharing that physical photos can't provide</li>
        <li>A long-term family archive that grows over years</li>
        <li>Context around photos (dates, locations, stories)</li>
        <li>A platform designed specifically for families, not adapted from something else</li>
      </ul>
      <h2>Getting Grandparents On Board</h2>
      <p>Concerned about tech-challenged grandparents? Here's what helps:</p>
      <ul>
        <li><strong>Simple signup:</strong> Just email and password, no complicated process</li>
        <li><strong>View-only accounts are free:</strong> Grandparents can view everything without creating content</li>
        <li><strong>Email notifications:</strong> They'll get notified when you post something new</li>
        <li><strong>Works on any device:</strong> Phone, tablet, or computer—whatever they're comfortable with</li>
        <li><strong>No learning curve:</strong> If they can use Facebook, they can use Our Family Socials</li>
      </ul>
      <a href="/login?signup=true">Start Free Trial</a>
    `
  }
}

// Read the base index.html
const indexPath = join(__dirname, '../dist/index.html')
const baseHtml = readFileSync(indexPath, 'utf-8')

// Generate prerendered HTML for each page
for (const [route, pageData] of Object.entries(pages)) {
  const htmlWithContent = baseHtml
    .replace('<title>Our Family Socials - Private Family Social Network</title>', `<title>${pageData.title}</title>`)
    .replace(
      /<meta name="description" content="[^"]*" \/>/,
      `<meta name="description" content="${pageData.description}" />`
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root"><div style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #e4e4e7;">${pageData.content}</div></div><noscript><p>Please enable JavaScript to use Our Family Socials.</p></noscript>`
    )

  // Determine output path
  let outputPath
  if (route === '/') {
    outputPath = join(__dirname, '../dist/index.html')
  } else {
    const routePath = route.slice(1) // Remove leading slash
    const dirPath = join(__dirname, '../dist', routePath)
    mkdirSync(dirPath, { recursive: true })
    outputPath = join(dirPath, 'index.html')
  }

  writeFileSync(outputPath, htmlWithContent, 'utf-8')
  console.log(`✓ Prerendered ${route} → ${outputPath}`)
}

console.log('\\n✓ All pages prerendered successfully!')

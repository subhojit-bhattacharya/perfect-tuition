# Research: hyperlocal SEO requirements for the Dum Dum Park catchment

Resolves issue #4. Researched 2026-08-17 against primary sources (Google Search Central, Google
Business Profile Help, schema.org, GitHub Pages docs, Astro docs). Every claim below is either
sourced or explicitly flagged as unverified/contested.

---

## Summary

**Schema type.** One JSON-LD node co-typed `["LocalBusiness", "EducationalOrganization"]`.
`LocalBusiness` is the only one of the three candidate types Google actually consumes for a rich
result; schema.org has no tutoring subtype, so plain `LocalBusiness` already *is* "the most specific
subtype". `EducationalOrganization` adds semantic accuracy at zero cost but buys no Search feature.
`Service` buys nothing on its own — use it nested under `hasOfferCatalog` to describe the Coaching
Centre and Home Tutor Matching offerings. Google's Organization guide explicitly says to follow the
`LocalBusiness` fields *in addition to* the Organization ones for a local business, so this is one
merged node, not competing ones.

**Structure — single page or many.** Small multi-page site organised by **offering**, not by
keyword. Five pages: Home, Coaching Centre, Home Tutor Matching, About, Contact. Do **not** create a
page per subject, per class, or per neighbourhood — nine near-identical subject stubs is exactly what
Google's scaled-content and doorway policies describe, and there is not a page's worth of genuinely
distinct content behind each subject. Per-locality pages ("tuition in Lake Town", "tuition in
Bangur") are the textbook doorway example Google names verbatim and must not be built.

**NAP naming.** Use `Perfect Tuition` as the visible brand name everywhere (title, `<h1>`, logo,
footer). Put the awkward full listing string in `alternateName` in structured data and reproduce it
verbatim exactly once, in the Contact page's citation block. Do not use it as the `<title>` or
`<h1>`. Reason: Google's site-names guidance asks for a concise commonly-recognised name and offers
`alternateName` as precisely this fallback; and the current listing name arguably breaks Google's own
Business Profile naming rule (it embeds service information), so it is not a string worth
entrenching. Address and phone, by contrast, must be reproduced byte-identically with the profile.

**GBP website field.** Point it at `https://perfect-tuition.co.in/` — the apex, with trailing slash,
the exact canonical URL, no redirect hop. Google documents no ranking difference between apex and
www. What matters is that the field lands on the final canonical URL, because GBP policy says the
website must not redirect users elsewhere.

---

## 1. Structured data

### 1.1 What Google actually supports vs what schema.org defines

These differ, and the difference decides what is worth building.

| Type | Defined by schema.org | Google rich result | Verdict |
|---|---|---|---|
| `LocalBusiness` | yes | **yes** — knowledge panel details, hours, directions, business carousel | **Use.** Primary type. |
| `EducationalOrganization` | yes | no dedicated feature in the search gallery | Use as a co-type. Free, semantically honest, no Search payoff. |
| `Organization` | yes | **yes** — logo, knowledge panel, disambiguation | Merge into the same node; Google says to combine. |
| `Service` | yes | **no** — absent from the supported-features gallery | Descriptive only. Nest under `hasOfferCatalog`. |
| `Course` / course list | yes | **yes**, still supported | Optional, later. See §1.5. |
| `FAQPage` | yes | **removed from Search** | Do not build. See §1.6. |
| `Review` / `AggregateRating` on own site | yes | **ineligible** (self-serving) | Do not build. See §1.7. |

Google's local business guide is explicit about subtype selection: *"Use the most specific
`LocalBusiness` sub-type possible; for example, `Restaurant`, `DaySpa`, `HealthClub`, and so on."*
schema.org's `LocalBusiness` has 33 direct subtypes and **none of them is education or tutoring**, so
plain `LocalBusiness` is already the most specific available. Do not reach for `School`,
`ElementarySchool` or `HighSchool` — Perfect Tuition is not a school, and misdescribing the entity is
a worse error than being one level too general.

`EducationalOrganization` sits under both `Organization` and `CivicStructure > Place`;
`LocalBusiness` sits under both `Organization` and `Place`. Co-typing them in a `@type` array is
therefore coherent — both branches resolve to `Organization` + `Place` — and is valid JSON-LD.

Google's caveat applies throughout: *"Google does not guarantee that features that consume
structured data will show up in search results."* Structured data is an eligibility precondition,
not a lever.

### 1.2 Required vs recommended properties (`LocalBusiness`)

Straight from Google's local business guide.

**Required (Google will not treat the item as valid without these):**

- `name` — Text. The name of the business.
- `address` — `PostalAddress`. The physical location. *"Include as many properties as possible"* —
  `streetAddress`, `addressLocality`, `addressRegion`, `postalCode`, `addressCountry`.

**Recommended:**

- `telephone` — *"Include the country code and area code in the phone number."*
- `url`
- `geo` — `GeoCoordinates`. *"The precision must be at least 5 decimal places"* for both latitude and
  longitude.
- `openingHoursSpecification` — time format `hh:mm:ss`; `dayOfWeek` as `"Monday"` etc.; optional
  `validFrom` / `validThrough` as `YYYY-MM-DD` for seasonal hours.
- `priceRange`
- `department` — only for businesses with genuinely distinct sub-units. Not applicable here.
- `aggregateRating` / `review` — only for sites capturing reviews about *other* businesses. Not
  applicable here, and actively disallowed for self-reviews (§1.7).
- `menu`, `servesCuisine` — food-only, ignore.

From the Organization guide (no required properties; *"add the properties that apply to your
organization"*): `logo` (minimum 112x112px), `sameAs`, `contactPoint`, `description`, `founder`,
`foundingDate`, `areaServed`.

### 1.3 Where to put it

*"You can add `LocalBusiness` structured data to any page on your site, though it may make more sense
to put it on a page that contains information about your business."*

Practical decision for this site: emit the **same single business node on every page** from a shared
Astro layout component, with a stable `@id` of `https://perfect-tuition.co.in/#business`. One source
of truth, no drift between pages, and it satisfies the mobile-first requirement that structured data
be equivalent across viewports (there is only one rendering, so this is automatic on a static
responsive site).

### 1.4 Ready-to-use JSON-LD

Uses the real NAP. Paste into a shared layout as `<script type="application/ld+json">`.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://perfect-tuition.co.in/#website",
      "url": "https://perfect-tuition.co.in/",
      "name": "Perfect Tuition",
      "alternateName": "Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor",
      "inLanguage": "en-IN",
      "publisher": { "@id": "https://perfect-tuition.co.in/#business" }
    },
    {
      "@type": ["LocalBusiness", "EducationalOrganization"],
      "@id": "https://perfect-tuition.co.in/#business",
      "name": "Perfect Tuition",
      "alternateName": "Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor",
      "description": "Coaching centre in Dum Dum Park, Kolkata, teaching classes 3-8 across all subjects and classes 9-12 in the Commerce stream. Also matches home tutors to families across Kolkata. Established 2012.",
      "url": "https://perfect-tuition.co.in/",
      "telephone": "+91 62911 65454",
      "foundingDate": "2012",
      "founder": {
        "@type": "Person",
        "name": "Jayeeta Bhattacharya"
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Arnab Apartment, 444, Dum Dum Park Road, Dum Dum Park",
        "addressLocality": "Kolkata",
        "addressRegion": "West Bengal",
        "postalCode": "700055",
        "addressCountry": "IN"
      },
      "areaServed": {
        "@type": "City",
        "name": "Kolkata"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
          ],
          "opens": "08:00:00",
          "closes": "22:00:00"
        }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Tuition offerings",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Coaching Centre - Junior Classes (3-8)",
              "serviceType": "Tuition",
              "description": "Small-batch teaching at the Dum Dum Park premises for classes 3 to 8, across English, Mathematics, Science, History, Geography and Bengali."
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Coaching Centre - Senior Classes (9-12, Commerce)",
              "serviceType": "Tuition",
              "description": "Small-batch teaching at the Dum Dum Park premises for classes 9 to 12 in the Commerce stream: Accounts, Business Studies and Economics."
            }
          },
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Home Tutor Matching",
              "serviceType": "Home tutor matching",
              "description": "Matching a private tutor to a family, taught at the family's own home, across Kolkata.",
              "areaServed": { "@type": "City", "name": "Kolkata" }
            }
          }
        ]
      },
      "sameAs": []
    }
  ]
}
```

**Two things to fill in before shipping.**

1. `sameAs` — add the Google Maps / Business Profile share URL and any real social profiles. Leave
   the array empty rather than guessing URLs; a wrong `sameAs` actively misidentifies the entity.
2. `geo` — deliberately omitted. Google requires **at least 5 decimal places** of precision, and I
   have no verified pin for Arnab Apartment. Read the exact coordinates off the Business Profile map
   pin (the `@lat,lng` segment of the Google Maps URL) and add:

   ```json
   "geo": {
     "@type": "GeoCoordinates",
     "latitude": 22.XXXXX,
     "longitude": 88.XXXXX
   }
   ```

   Do not ship approximate coordinates — for a distance-ranked local result the pin is the one number
   that should not be invented.

`priceRange` is recommended by Google but is a judgement call for the Owner; omit it rather than
publish a fee band she has not approved.

### 1.5 `Course` / course list — optional, later

Course list rich results are still supported. Eligibility, verbatim from the guide: you must mark up
**at least three courses**; a course is *"a series or unit of curriculum that contains lectures,
lessons, or modules in a particular subject and/or topic"* and *"must have an explicit educational
outcome of knowledge and/or skill in a particular subject and/or topic, and be led by one or more
instructors with a roster of students."* Required properties: `name`, `description` (60-char display
limit), `provider`. The feature is English-only, which suits an English-only v1.

A coaching centre plausibly qualifies. But the payoff is genuinely uncertain — the carousel is
typically surfaced for course providers and aggregators, and building it means committing to
per-course pages, which cuts against the structure verdict in §3. **Recommendation: defer past v1.**
Revisit only if the site later grows real per-course content.

### 1.6 `FAQPage` — do not build

Google removed the FAQ rich result feature and the documentation for it. There is no longer any
Search benefit. If an FAQ section is useful to a Prospective Parent, write it as plain HTML; do not
spend effort on the markup.

### 1.7 Reviews — do not mark up

Verbatim: *"If the entity that's being reviewed controls the reviews about itself, their pages that
use `LocalBusiness` or any other type of `Organization` structured data are ineligible for star
review feature."* This explicitly covers *"an embedded third-party widget (for example, Google
Business reviews or Facebook reviews widget)"*.

So: displaying Google reviews on the site as human-readable social proof is fine and worth doing.
Wrapping them in `Review`/`AggregateRating` markup is not — it earns nothing and is a structured-data
policy violation.

---

## 2. NAP

### 2.1 What Google actually documents (and what it does not)

This is the area where SEO folklore is thickest, so the boundary matters.

**What Google documents.** Local ranking has exactly three named factors:

- **Relevance** — *"how well a Business Profile matches what someone is searching for"*
- **Distance** — *"how far each business is from the customer who's searching"*
- **Prominence** — *"how well-known a business is"*, influenced by *"websites link to your business
  and how many reviews you have"*

**What Google does not document.** Google has *no* published statement that NAP citation consistency
across the web is a ranking factor. That claim is universal in the SEO industry and is plausible —
it is the obvious mechanism by which an entity-matching system would work, and it falls under
"prominence" — but it is inference, not documented fact. `CONTEXT.md` currently states
"inconsistency directly costs local search ranking"; that is stronger than any primary source
supports. The defensible version is: **consistency costs nothing and removes a class of
entity-resolution ambiguity, so do it — but do not trade off readability or policy compliance for
it.** That reframing is what drives the naming decision below.

### 2.2 The name decision

The Business Profile lists the business as:

```
Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor
```

Three primary sources bear on whether to reproduce this verbatim on the site.

1. **GBP naming policy.** *"Represent your business as it's consistently represented and recognized
   in the real world across signage, stationery, and other branding."* Explicitly not allowed:
   marketing taglines, **service or product information**, **location information**, business hours,
   phone numbers, URLs. The parenthetical `( Coaching Class )` and the trailing
   `- Home Tutor & Private Tutor` are service/product information. **The current listing name is
   itself out of policy** and is at standing risk of being edited by Google or reported by a
   competitor.

2. **Google's site-names guidance.** Google picks the site name shown in results automatically, from
   — in order of weight — `WebSite` structured data, `og:site_name`, `<title>`, headings, other home
   page text. It asks for *"a concise, commonly-recognized name"*, warns that *"long site names may
   be truncated on some devices"*, tells you to avoid generic keyword descriptors of the "Best
   Dentists In Iowa" shape, and offers **`alternateName` as the documented fallback** for a second
   name.

3. **Spam policy — keyword stuffing.** *"filling a web page with keywords or numbers in an attempt to
   manipulate rankings."* Repeating "Coaching Class Home Tutor Private Tutor" as the `<h1>` on every
   page is squarely in that shape.

**Decision.**

| Surface | Value |
|---|---|
| `<title>` (home) | `Perfect Tuition — Coaching Centre in Dum Dum Park, Kolkata` |
| `<h1>` | `Perfect Tuition` |
| `og:site_name` | `Perfect Tuition` |
| JSON-LD `name` | `Perfect Tuition` |
| JSON-LD `alternateName` | `Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor` |
| Contact page citation block | full listing string verbatim, once, in normal body text |
| Footer | `Perfect Tuition` |

Reproducing the verbatim string exactly once, in the Contact page citation block, preserves an exact
string match for any human or automated cross-check against the profile, at essentially zero cost to
the reader. Everywhere else the site uses the clean brand name.

**Risk of divergence, stated honestly.** The risk is not a ranking penalty — Google documents no such
penalty. The risk is entity-resolution ambiguity: a matcher that has never seen "Perfect Tuition"
and "Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor" together may not confidently
fuse them. Carrying the full string in `alternateName` and in the Contact block is the mitigation,
and it is a cheap and complete one. The opposite risk — entrenching an out-of-policy name across a
whole website — is larger and harder to unwind.

**Follow-up for the Owner (not a site change).** Consider renaming the Business Profile to
`Perfect Tuition` to bring it into policy. This is a real trade-off, not a free win: a name change
can trigger re-verification and a period of reduced listing visibility, and the current name may be
pulling some literal-match traffic. Flag it as a decision for Jayeeta Bhattacharya, not something to
action unilaterally.

### 2.3 Address and phone — reproduce exactly

No judgement call here. These carry no policy problem, so byte-identical reproduction is free.

**Address**, one canonical string, used in the footer, the Contact page, and the JSON-LD:

```
Arnab Apartment, 444, Dum Dum Park Road, Dum Dum Park, Kolkata, West Bengal 700055, India
```

Store it once in a single Astro constant and render it from there everywhere. Never retype it. In
the JSON-LD split it into `PostalAddress` fields as shown in §1.4 — the string and the structured
fields must recompose to the same address.

**Phone.** Three representations, all derived from the same source constant:

| Use | Value |
|---|---|
| Visible text (matches the profile exactly) | `062911 65454` |
| `href` (RFC 3966) | `tel:+91-62911-65454` |
| JSON-LD `telephone` (Google: include country code) | `+91 62911 65454` |

The visible text matching the profile string is the point of the exercise; the `tel:` and structured
forms carry the country code because Google's guide requires it and because a phone dialler needs it.

Mark up the visible NAP block with `itemscope`-free plain HTML — the JSON-LD is the machine-readable
copy, and mixing microdata with JSON-LD for the same entity risks two conflicting nodes.

---

## 3. Page structure: single page or many

### 3.1 What the doorway policy actually says

Verbatim from Google's spam policies. Doorway abuse is *"sites or pages are created to rank for
specific, similar search queries. They lead users to intermediate pages that are not as useful as the
final destination."* Named examples include:

- *"Having multiple domain names or pages targeted at specific regions or cities that funnel users to
  one page"*
- *"Generating pages to funnel visitors into the actual usable or relevant portion of a site"*
- Substantially similar pages positioned closer to search results than a clear browseable hierarchy

Scaled content abuse: *"many pages are generated for the primary purpose of manipulating search
rankings"* with minimal user value.

And from the helpful-content self-assessment: *"Does the content provide substantial value when
compared to other pages in search results?"*, *"Is the content primarily made to attract visits from
search engines?"*, *"Are you producing lots of content on many different topics in hopes that some of
it might perform well in search results?"*

### 3.2 Verdict

**Build ~5 pages, split by offering. Do not split by subject, class, or locality.**

```
/                    Home — who, where, the two offerings, NAP, enquiry CTA
/coaching-centre/    The primary offering. Junior Classes and Senior Classes as
                     substantial sections on one page, not separate pages.
/home-tutor/         Home Tutor Matching. How matching works, Kolkata-wide.
/about/              Jayeeta Bhattacharya, established 2012, the premises.
/contact/            NAP citation block, hours, map, enquiry form.
```

**Why not one page per subject or class band.** There are six junior subjects and three senior
subjects. Nine pages, each saying roughly "we teach X to classes N–M at Dum Dum Park, call us", is
nine substantially similar pages generated to catch nine query variants — the scaled-content and
doorway shapes almost exactly. There is no page's worth of genuinely distinct content behind
"Geography" as opposed to "History" for this business. The junior/senior split *is* a real
distinction (all subjects vs Commerce-only; different age group; different parent concern), which is
why it earns two substantial sections — but sections on `/coaching-centre/`, not two thin URLs.

**Why not one page per neighbourhood.** *"Multiple domain names or pages targeted at specific regions
or cities that funnel users to one page"* is Google's own wording, and it describes a
"tuition in Lake Town / Bangur / Baguiati / Sreebhumi" page set precisely. The business has one
physical location; distance ranking is computed from that pin, not from how many place names appear
on the site. Locality pages would add risk and no mechanism.

**Why not a single page either.** A one-pager is defensible and lower-risk, but it is weaker here:
one URL means one `<title>`, one canonical, one entry point, and the two offerings serve genuinely
different intents ("commerce tuition class 11 near me" vs "home tutor Kolkata"). Five pages by
offering give distinct titles for distinct intents while keeping every page substantive. This is the
recommendation the information-architecture ticket (#10) should build on.

**Growth rule for the spec.** A new page is justified when there is content that could not sit
comfortably as a section of an existing page and that a Prospective Parent would seek on its own.
Subject pages, fee pages, or result pages may earn their place later — when there is real content
(syllabus detail, batch timetables, named teachers, past results). Not before.

**Where this is genuinely contested.** Whether "location pages" work at all is one of the most
argued questions in local SEO. The industry position is that one page per genuinely-served location,
with unique content, is legitimate and effective; Google's doorway policy is the constraint on that.
For Perfect Tuition the argument is moot — one location, one location page (`/contact/`). The
hyperlocal signal comes from the Business Profile pin, the address on the site, and locally relevant
content, not from a page per suburb.

---

## 4. The Google Business Profile website field

**Point it at `https://perfect-tuition.co.in/` — apex, HTTPS, trailing slash, exact canonical.**

**Does apex vs www matter?** For ranking, no — Google's canonicalisation documentation contains no
statement that www versus non-www affects ranking. It does state that Google *"prefers HTTPS pages
over equivalent HTTP pages as canonical"*, so HTTPS is not optional. Pick one host form, make it the
canonical everywhere, and be consistent.

**What does matter.** GBP policy for the website field: *"Provide... a website that represents your
individual business location"* and it *"cannot redirect users elsewhere."* So the field should be the
**final** URL, not a URL that 301s. If the site canonicalises to apex, the GBP field must be apex —
pointing it at `www.` and relying on GitHub's redirect adds a hop for no benefit and sits awkwardly
against that policy line.

**GitHub Pages mechanics.** GitHub handles the variant redirect automatically once both are
configured: *"if you configure `www.example.com` as the custom domain for your site, and you have
GitHub Pages DNS records set up for the apex and `www` domains, then `example.com` will redirect to
`www.example.com`"* — and the reverse applies when the apex is the configured custom domain. So
setting `perfect-tuition.co.in` as the repo's custom domain, with apex A/AAAA records and a `www`
CNAME, gives www → apex automatically. GitHub separately notes that *"setting up a `www` subdomain
alongside an apex domain is recommended for HTTPS secured websites"*, which the current DNS already
satisfies.

**Also worth fixing.** The profile's website field currently points at a dead domain — nothing
resolves. That is a live defect on the canonical business record and should be updated the moment the
site is published, before any other SEO work is judged.

**Unverified.** Keeping the Cloudflare records DNS-only (grey cloud, as currently configured) is
believed to be necessary for GitHub's automatic certificate provisioning to complete — the proxy can
interfere with the ACME challenge. I did not find a first-party statement of this in either GitHub's
or Cloudflare's documentation during this research. Do not enable the proxy without testing.

---

## 5. Technical baseline for a static Astro site on GitHub Pages

### 5.1 Crawling and indexing

**Sitemap.** Not required. Google: *"You might not need a sitemap if your site is 'small'. By small,
we mean about 500 pages or fewer."* At five pages this site does not need one — but it costs nothing
and helps a brand-new domain with few external links, which Google names as a case where a sitemap
*does* help. Use `@astrojs/sitemap`; it *"needs to know your site's deployed URL"*, so
`site: 'https://perfect-tuition.co.in'` must be set in `astro.config`. It emits
`/sitemap-index.xml` (an index) and `/sitemap-0.xml` (the URLs). Submit `sitemap-index.xml` in
Search Console and reference it from robots.txt.

**robots.txt.** Must live at the root of the host (`/robots.txt`); on Astro that means
`public/robots.txt`. Rules apply per protocol/host/port. Google's caution:
*"it is not a mechanism for keeping a web page out of Google"* — a disallowed page can still be
indexed if linked from elsewhere; use `noindex` for exclusion. For this site:

```
User-agent: *
Allow: /

Sitemap: https://perfect-tuition.co.in/sitemap-index.xml
```

**Canonical URLs.** Google: redirects are *"a strong signal"*, `rel="canonical"` is *"a strong
signal"*, sitemap inclusion is *"a weak signal"*. Without one, *"Google will identify which version
of the URL is objectively the best version"* — do not leave that to chance on a new domain.

Emit a self-referencing absolute `<link rel="canonical">` on every page from the shared layout,
built from `Astro.site` + `Astro.url.pathname`. **Trailing-slash gotcha:** GitHub Pages serves
`/about/` from `/about/index.html`, so with Astro's default directory build format the canonical URL
must carry the trailing slash. Set `trailingSlash` explicitly in `astro.config` and make the
canonical, the sitemap entries, the internal links, and the GBP website field all agree on the same
form. Mismatch here is the single most common way a small static site splits its own signals.

**Mobile-first indexing.** Universal: *"Google uses the mobile version of a site's content, crawled
with the smartphone agent, for indexing and ranking."* Requirements — responsive design (Google:
*"the easiest design pattern to implement and maintain"*), identical content on mobile and desktop,
equivalent `<title>` and meta description across both, the same robots meta tags on both (*"If you
use a different robots meta tag on the mobile site... Google may fail to crawl and index your page"*),
and equivalent structured data on both. A single responsive Astro build satisfies all of these by
construction — but the site must be genuinely responsive, not desktop-first with a cramped mobile
view. For a Dum Dum Park catchment this is not a technicality: essentially all Prospective Parent
traffic will be mobile.

**Search Console.** Verify a **Domain property** via DNS TXT rather than a URL-prefix property, so
apex and www and both protocols are covered by one property. Submit the sitemap there.

### 5.2 Core Web Vitals

Measured at the **75th percentile** of real user visits, segmented by mobile and desktop.

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| Largest Contentful Paint (LCP) | ≤ 2.5 s | 2.5 s – 4.0 s | > 4.0 s |
| Interaction to Next Paint (INP) | ≤ 200 ms | > 200 ms and ≤ 500 ms | > 500 ms |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |

**INP replaced FID.** INP became a stable Core Web Vital on **12 March 2024**, replacing First Input
Delay, which is deprecated and removed from the programme. FID was dropped from Search Console on
that date. Any spec or audit still referencing FID is out of date.

**Honest framing.** Google states there is *"no single signal"* for page experience, that site owners
*"should not focus on only one or two aspects"*, and explicitly that good scores *"doesn't guarantee
that your pages will rank at the top"* — *"Google Search always seeks to show the most relevant
content, even if the page experience is sub-par."* So: treat these as thresholds to clear, not a
score to maximise. A static Astro site with optimised images clears all three comfortably; the
realistic risks are unsized images (CLS) and a heavy hero image (LCP), both solved at build time with
`astro:assets`.

### 5.3 GitHub Pages constraints that bind SEO

| Constraint | SEO consequence | Mitigation |
|---|---|---|
| No server-side redirects (only the built-in custom-domain variant and repo-rename redirects) | Cannot 301 old URLs, cannot fix trailing-slash variants server-side | Get URLs right the first time; the URL set is small and should be treated as frozen once indexed |
| No custom HTTP headers | No `Cache-Control` tuning, no CSP header, no own HSTS header | Accept GitHub's defaults; enable **Enforce HTTPS** in repo settings for the HTTP→HTTPS redirect |
| No server-side logic | No dynamic canonical, no server-side geo/redirect, no `X-Robots-Tag` | All canonical and robots directives must be emitted as HTML at build time |
| Custom 404 only via `404.html` | No control over other status codes | Ship a useful `404.html` with navigation back into the site |
| No image CDN or automatic format negotiation | Unoptimised images become the LCP problem | Pre-optimise at build with `astro:assets`; ship modern formats and explicit `width`/`height` |
| Soft limits: 1 GB published site, 100 GB/month bandwidth, 10 builds/hour | Not a real constraint at this scale | None needed; note the 10-builds/hour ceiling if CI ever gets chatty |
| GitHub's stated intent excludes running commercial/e-commerce operations | Not triggered by a brochure-and-enquiry site, but worth knowing | Keep the site informational; if transactions are ever added, revisit hosting |

---

## 6. Checklist the spec can adopt directly

### Structured data

- [ ] One JSON-LD `@graph` in a shared layout, emitted on every page, containing a `WebSite` node and
      a business node co-typed `["LocalBusiness", "EducationalOrganization"]`
- [ ] Business node has stable `@id` `https://perfect-tuition.co.in/#business`
- [ ] Required present: `name`, `address` (as `PostalAddress` with all five sub-fields)
- [ ] Recommended present: `telephone`, `url`, `openingHoursSpecification` (Mon–Sun 08:00:00–22:00:00)
- [ ] `geo` added with real Business Profile pin coordinates, **≥ 5 decimal places**
- [ ] `alternateName` carries the full listing string verbatim
- [ ] `founder` names Jayeeta Bhattacharya; `foundingDate` is `2012`
- [ ] `hasOfferCatalog` describes Coaching Centre (Junior, Senior) and Home Tutor Matching
- [ ] `sameAs` links the Google Maps / Business Profile URL and any real social profiles
- [ ] No `Review` or `AggregateRating` markup for the business's own reviews
- [ ] No `FAQPage` markup
- [ ] No `Course` markup in v1
- [ ] Validated in the Rich Results Test and the Schema Markup Validator before launch

### NAP

- [ ] Address, phone and hours live in **one** shared Astro constant; every surface renders from it
- [ ] Visible phone reads `062911 65454`; `href` is `tel:+91-62911-65454`; JSON-LD is `+91 62911 65454`
- [ ] Visible address string is byte-identical to the Business Profile everywhere it appears
- [ ] Display name is `Perfect Tuition` in `<title>`, `<h1>`, `og:site_name`, footer, JSON-LD `name`
- [ ] Full listing string appears verbatim exactly once, in the Contact page citation block
- [ ] Hours (08:00–22:00, all seven days) shown on the Contact page and match the profile
- [ ] NAP block present in the footer of every page
- [ ] Raised with the Owner: whether to rename the Business Profile to `Perfect Tuition` for policy
      compliance (decision hers; carries re-verification risk)

### Structure

- [ ] Five pages: `/`, `/coaching-centre/`, `/home-tutor/`, `/about/`, `/contact/`
- [ ] No page per subject, per class, or per neighbourhood
- [ ] Junior and Senior are substantial sections of `/coaching-centre/`, not separate URLs
- [ ] Every page has a unique, descriptive `<title>` and meta description
- [ ] Internal links use the canonical trailing-slash form
- [ ] Growth rule recorded: a new page needs content that cannot sit as a section of an existing page

### Google Business Profile

- [ ] Website field updated from the dead domain to `https://perfect-tuition.co.in/`
- [ ] That URL is the exact canonical — apex, HTTPS, trailing slash, no redirect hop
- [ ] Categories confirmed: primary `Private Tutor`, additional `Coaching Center`
- [ ] Service area confirmed as Kolkata

### Technical

- [ ] `site: 'https://perfect-tuition.co.in'` set in `astro.config`
- [ ] `trailingSlash` set explicitly; canonical, sitemap, internal links and GBP field all agree
- [ ] `@astrojs/sitemap` installed; `/sitemap-index.xml` generated
- [ ] `public/robots.txt` allows all and declares the sitemap
- [ ] Self-referencing absolute `<link rel="canonical">` on every page
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] `lang="en"` on `<html>`
- [ ] Responsive, mobile-first; identical content, titles, meta and structured data across viewports
- [ ] All images via `astro:assets` with explicit dimensions
- [ ] **Enforce HTTPS** enabled in the repository's Pages settings
- [ ] Custom `404.html` shipped
- [ ] Search Console **Domain property** verified by DNS TXT; sitemap submitted
- [ ] CWV verified at the 75th percentile on mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1
- [ ] Cloudflare records confirmed DNS-only before relying on GitHub's certificate

---

## 7. Open questions

1. **Business Profile pin coordinates.** Not obtainable from the material available here. Read them
   off the profile before shipping `geo`.
2. **Renaming the Business Profile.** The current name is out of policy, but renaming carries
   re-verification risk and may lose literal-match traffic. Owner's decision, not a site change.
3. **`priceRange`.** Recommended by Google but needs the Owner's approval of a published fee band.
   Omitted rather than invented.
4. **Cloudflare proxy vs GitHub certificate issuance.** Widely reported, not confirmed in first-party
   documentation. Treat as unverified; test before changing.
5. **Whether NAP consistency is a ranking factor.** Genuinely undocumented by Google. The
   recommendation here holds regardless, because consistency is free — but `CONTEXT.md`'s claim that
   inconsistency "directly costs local search ranking" overstates what any primary source says and
   may be worth softening.

---

## Sources

Google Search Central:

- [Local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Structured data markup that Google Search supports (search gallery)](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
- [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Course list structured data](https://developers.google.com/search/docs/appearance/structured-data/course)
- [Review snippet structured data (self-serving reviews)](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
- [FAQ structured data (feature removed)](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
- [Spam policies for Google web search (doorway abuse, scaled content abuse, keyword stuffing)](https://developers.google.com/search/docs/essentials/spam-policies)
- [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [How to specify a canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Sitemaps overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Mobile-first indexing best practices](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
- [Understanding page experience in Google Search results](https://developers.google.com/search/docs/appearance/page-experience)
- [Site names in Google Search](https://developers.google.com/search/docs/appearance/site-names)
- [Introducing INP to Core Web Vitals](https://developers.google.com/search/blog/2023/05/introducing-inp)

Google Business Profile Help:

- [Guidelines for representing your business on Google](https://support.google.com/business/answer/3038177)
- [Tips to improve your local ranking on Google](https://support.google.com/business/answer/7091)

web.dev / Chrome:

- [Web Vitals](https://web.dev/articles/vitals)
- [Interaction to Next Paint (INP)](https://web.dev/articles/inp)
- [Interaction to Next Paint becomes a Core Web Vital on March 12](https://web.dev/blog/inp-cwv-march-12)
- [Interaction to Next Paint is officially a Core Web Vital](https://web.dev/blog/inp-cwv-launch)

schema.org:

- [LocalBusiness](https://schema.org/LocalBusiness)
- [EducationalOrganization](https://schema.org/EducationalOrganization)

GitHub / Astro:

- [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)

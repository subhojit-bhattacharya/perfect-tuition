# Lawful reuse of Google reviews as on-site social proof

Research resolving [issue #3](https://github.com/subhojit-bhattacharya/perfect-tuition/issues/3).
Date: 2026-08-17. Sources are Google's own terms, API policies, and Search Central documentation.

> **Not legal advice.** I am not a lawyer. This note reports what Google's published terms and
> policies actually say, and separates that from inference and from common industry practice.
> The points flagged **[LAWYER]** genuinely warrant professional advice before launch.

---

## Summary

**Do not reproduce Google review text on the site from the Takeout Export.** Three independent
things block it:

1. **Copyright.** The reviewer wrote the review and retains the copyright in it. Google's Terms of
   Service say so explicitly. The licence the reviewer grants runs to Google, not to the business.
   Perfect Tuition has no licence to republish that text, and this is true regardless of what
   Google's API terms say.
2. **Google's terms.** The Maps Platform Terms of Service prohibit copying and saving user reviews.
   The Business Profile API policies prohibit storing API content for more than 30 days and
   prohibit manipulating or aggregating it. Neither route sanctions a durable static snapshot.
3. **Search Central.** Marking these reviews up as `Review` / `AggregateRating` on the site is
   *self-serving* by Google's own definition and makes the page **ineligible for the star review
   rich result**. Google's guidance names "Google Business reviews widget" as an example of the
   thing it is targeting.

**What is safe and recommended:** state the rating and review count as plain on-page text (a fact
about the business, not copied expression), link to the Google Business Profile so a Prospective
Parent can read the reviews at source, and — if genuine review quotes are wanted on the page —
collect first-party testimonials directly from parents with written permission. Optionally add
Google's own **Places UI Kit** element to render live reviews with Google's attribution baked in.

The Takeout Export stays what `CONTEXT.md` already calls it: seed content and a source of business
facts, not publishable copy.

---

## Yes / no by display option

Verdicts are for **static reproduction on the site, sourced from the Takeout Export** — the thing
actually proposed. The right-hand column notes what changes under the sanctioned live-API route.

| Display option | From Takeout Export (static) | Via Places API (live) |
| --- | --- | --- |
| **Verbatim review text** | **No** — reviewer's copyright; no licence to republish | **Yes**, with full attribution; max 5 reviews; must not be cached |
| **Reviewer display name** | **No** — republishing a named person's content without licence or consent | **Yes** — in fact *required* as attribution |
| **Reviewer profile photo** | **No** — and moot: the Takeout Export contains no reviewer photo URLs at all | **Yes** — required (`authorAttribution.photoUri`), minimum attribution when space is tight |
| **Star rating of an individual review** | **No** — inseparable from the review it belongs to | **Yes**, alongside the attributed review |
| **Aggregate rating + review count** ("4.7 from 62 Google reviews") | **Yes, with care** — a fact, not copied expression; must be accurate and kept current | **Yes** — `rating` + `userRatingCount`, with Google Maps attribution |
| **`Review` / `AggregateRating` schema markup** | **No** — self-serving; page becomes ineligible for the star rich result | **No** — same rule; the API route does not rescue it |
| **Link / button to the Google Business Profile** | **Yes** — unrestricted, and the recommended fallback | **Yes** |
| **Maps Embed API iframe of the profile** | **Yes** — free, unlimited, Google renders rating and review count itself | n/a |
| **Places UI Kit `gmp-place-details` element** | **Yes** — Google's own component; attribution handled for you | n/a |
| **First-party testimonials collected directly from parents** | **Yes** — with the parent's written permission | n/a |

---

## Detail

### 1. Who owns a review

Google's Terms of Service are unambiguous that the reviewer keeps the copyright:

> "Your content remains yours, which means that you retain any intellectual property rights that
> you have in your content."

The user grants Google a licence to "host, reproduce, distribute, communicate, and use your
content", sublicensable to "other users to allow the services to work as designed" and to Google's
contractors. That sublicence is what lets a review appear on Google Maps and in Google Search. It
is **not** a licence to Perfect Tuition, and the terms describe the licence as "personal, which
means it doesn't extend to anyone else".

So the practical position: copying a review's expressive text onto the site is reproduction of a
third party's copyright work without permission. This is independent of Google entirely — even if
Google's API terms permitted it, the reviewer's copyright would still sit there. A short factual
statement *about* the reviews ("62 reviews, 53 of them five-star") is not reproduction of anyone's
expression; facts are not copyrightable.

**[LAWYER]** Whether any Indian fair-dealing exception (Copyright Act 1957, s. 52) covers quoting a
short customer review for commercial promotion — I would not rely on it, and a promotional use on a
business's own marketing site is the weakest possible fair-dealing posture.

The clean way to get quotable text is to **ask**. A parent who left a Google review can be asked for
permission to reproduce their words on the site, or asked to write a testimonial directly. That
gives a real licence and sidesteps the whole problem. It is also the only route that unlocks more
than five quotes.

### 2. What Google's Maps Platform terms say

The Maps Platform Terms of Service, §3.2.3(a) "No Scraping":

> "Customer will not export, extract, or otherwise scrape Google Maps Content for use outside the
> Services. For example, Customer will not: (i) pre-fetch, index, store, reshare, or rehost Google
> Maps Content outside the services; (ii) bulk download Google Maps tiles, Street View images,
> geocodes, directions, distance matrix results, roads information, places information, elevation
> values, and time zone details; **(iii) copy and save business names, addresses, or user reviews**;
> or (iv) use Google Maps Content with text-to-speech services."

§3.2.3(b) "No Caching": "Customer will not cache Google Maps Content except as expressly permitted
under the Maps Service Specific Terms."

The Maps Service Specific Terms then grant a very narrow caching permission for Places:

> "**14.3 Caching.** Customer may temporarily cache latitude and longitude values from the Places
> API for up to 30 consecutive calendar days, after which Customer must delete the cached latitude
> and longitude values."

Plus a separate clause permitting indefinite caching of `place_id`. **Review text is not on either
list.** The Places API policies page states it plainly: "You must not pre-fetch, cache, or store
Places API content beyond the allowed exceptions", with only the place ID exempt.

Note also §14.1/14.2: Places content **may** be used without a Google map, but **must not** be used
alongside a non-Google map. Not a constraint we hit — but worth knowing if a map is ever added.

**Scope caveat:** these terms bind a *Maps Platform customer* — i.e. they attach when we call the
API. They do not, on their face, retroactively govern a Google Takeout export the Owner pulled from
her own profile. But that only removes one of the three blockers; the reviewer's copyright and the
Search Central rules still apply, so the outcome is the same. And the direction of travel is
obvious: Google names "copy and save … user reviews" as the paradigm case of misuse.

### 3. What the Places API permits, and at what price

This is the sanctioned route for **displaying** review content, and its permissions are real but
come with a long list of obligations. From the Places API policies:

- **Attribute every review to its author.** "You must always credit the author when displaying
  photos or reviews. Each photo and review includes an author attribution (author's avatar image,
  name, and profile link)." Use all three (avatar, name, profile link) where space allows; the
  avatar is the bare minimum.
- **Link to the source.** "For each photo and review, end-users must always have access to view the
  individual source photo or review on Google Maps using the provided `googleMapsUri`."
- **Google Maps attribution.** When Places content is displayed *without* a Google map, the Google
  logo / "Google Maps" attribution must be shown, per Google's style guidelines, unobscured.
- **Explain ordering.** "Include a clear notice that describes how reviews are being ordered and
  filtered including any search criteria applied. By default, reviews are ordered by relevance."
- **Recommended:** show `relativePublishTimeDescription`, expose `flagContentUri` so users can
  report content, note when a review has been machine-translated, and tell users about Google's
  review policy when showing reviews and the average rating.
- **Never** remove, hide, obscure, or modify the attribution or the content.

Hard limits that matter here:

- **A maximum of 5 reviews are returned** in a place's `reviews` field. The profile has 62 reviews,
  26 of which carry written text. The API will never surface more than five of them, and we do not
  choose which five.
- **No caching.** Because review text may not be stored, the data has to be fetched live per render.
  On a static Astro site that means a client-side call or a server-side proxy that does not persist
  the response — which is a real architectural cost for a site whose whole point is being static.

Pricing (Google Maps Platform pricing page, per 1,000 calls, first tier):

| SKU | Fields | Free cap / month | Then |
| --- | --- | --- | --- |
| Place Details **Enterprise** (`2D9A-3DE0-3766`) | `rating`, `userRatingCount` | 1,000 | $20.00 / 1,000 |
| Place Details **Enterprise + Atmosphere** (`EB23-5ECC-F753`) | `reviews`, `reviewSummary` | 1,000 | $25.00 / 1,000 |
| Places **UI Kit Query** (`0678-4F72-DA7C`) | UI Kit elements (Essentials) | 10,000 | $1.00 / 1,000 |
| Places **UI Kit Pro** (`42AB-1FB3-B56A`) | UI Kit elements (Pro) | 5,000 | $5.00 / 1,000 |
| **Maps Embed API** (`9C10-8313-F21F`) | embedded place map | **Unlimited** | free |

For a Hyperlocal Radius site the free caps are likely sufficient, but a raw Places API call per
pageview burns the 1,000/month Enterprise cap fast and then costs ~$0.025 per pageview. The UI Kit
caps are 5–10× more generous. The Embed API is free and unlimited.

**Places UI Kit** (`gmp-place-details` with `gmp-place-content-config`) is worth a serious look: it
is Google's own web component, renders reviews and rating, includes a `gmp-place-attribution`
element that satisfies the attribution requirements automatically, and the Service Specific Terms
§15.1 explicitly allow it "with or without any map". It converts the whole attribution checklist
above into a configuration problem. **[UNSETTLED]** I could not pin down from the docs exactly
which UI Kit SKU tier a reviews-enabled Place Details element bills under — Google states only that
"Places UI Kit requests are always billed at the Places UI Kit API rate", not the Places API rate.
Verify in Cloud Console billing after a trial integration.

### 4. What the Business Profile API permits

The Business Profile API is the Owner-authenticated route and *does* return all 62 reviews with
`comment`, `starRating`, `reviewer`, `createTime` and `reviewReply`. It is nonetheless **the wrong
tool for this job**, for two reasons in its own policies:

> "You can only use the Business Profile APIs to create, manage, and report on business listings
> that you either own or are authorized to manage on behalf of the business owner, or to develop
> tools for end-clients to similarly manage their listings. **Use of the Business Profile APIs for
> purposes outside the scope of these policies is prohibited.**"

Publishing reviews as marketing copy on a separate website is not creating, managing, or reporting
on a listing. And the storage rule closes the door on a snapshot:

> "**Content storage** — You cannot pre-fetch, cache, index, or store any content provided through
> the Business Profile APIs ("Content") for use outside of your Business Profile project except for
> limited amounts of Content. You can store limited amounts of Content only to improve the
> performance of your project. Stored Content must meet the following requirements: It must be
> stored temporarily for no more than 30 calendar days. It must be stored securely. **It cannot be
> manipulated or aggregated in any way.**"

Also: "Your Business Profile APIs must not replicate the look and feel of the Business Profile user
interface."

So the Business Profile API is for reading and replying to reviews inside a management tool. It is
not a content feed for a marketing site. **Places API is the display route; Business Profile API is
the management route.**

### 5. The structured-data trap — confirmed, and it bites

This is the part that is easy to get wrong, and the answer is a firm **no**.

Google Search Central's Review snippet guidelines, under "additional guidelines" for local
businesses and organizations:

> "If the entity that's being reviewed controls the reviews about itself, their pages that use
> `LocalBusiness` or any other type of `Organization` structured data are **ineligible for star
> review feature**. For example, a review about entity A is placed on the website of entity A,
> either directly in their structured data **or through an embedded third-party widget (for
> example, Google Business reviews or Facebook reviews widget)**."

Google's announcement of the rule defines the term:

> "We call reviews 'self-serving' when a review about entity A is placed on the website of entity A
> - either directly in their markup or via an embedded third-party widget. That's why, with this
> change, we're not going to display review rich results anymore for the schema types
> `LocalBusiness` and `Organization` (and their subtypes) in cases when the entity being reviewed
> controls the reviews themselves."

The `LocalBusiness` reference page reinforces it at property level: both `aggregateRating` and
`review` are annotated "**This property is only recommended for sites that capture reviews about
other local businesses.**"

A **second, separate** guideline is also violated by this plan: "**Don't aggregate reviews or
ratings from other websites.**" The reviews live on Google. Pulling them onto perfecttuition's own
pages and marking them up is precisely aggregating ratings from another website.

**Is it a manual action or just ineligibility?** Be precise here, because the two are different:

- **Emitting the markup for our own Google reviews → ineligibility, not a penalty.** Google's own
  framing is "we're not going to display review rich results anymore". The general structured data
  guidelines say a violating page "loses eligibility for appearance as a rich result; it doesn't
  affect how the page ranks in Google web search." No stars, no ranking damage. Wasted effort.
- **A manual action becomes a real risk if we also break the visibility or accuracy rules.**
  "Don't mark up content that is not visible to readers of the page" and "Don't mark up irrelevant
  or misleading content, such as fake reviews or content unrelated to the focus of a page." Google
  warns this "can prevent syntactically correct structured data from being displayed as a rich
  result in Google Search, or possibly cause it to be marked as spam", surfaced in the Search
  Console Manual Actions report.

So: hardcoding an `aggregateRating` of 4.7 that no visible page content supports, sourced from
another website, is the version that carries genuine manual-action exposure. The safe conclusion is
simply **emit no `Review` or `AggregateRating` markup at all**.

`LocalBusiness` markup itself is fine and encouraged — name, address, phone, opening hours, geo,
`sameAs` pointing at the Google Business Profile. Just omit the rating properties. The rating still
appears next to the business in Google's own local results and Maps, sourced from Google's data
rather than from our markup. Nothing is lost by omitting it.

### 6. Accuracy of the aggregate figure — a live problem

The Takeout Export's 62 reviews break down 53 × 5★, 4 × 4★, 1 × 3★, 4 × 1★. The arithmetic mean is
288 / 62 = **4.645**, which rounds to **4.6**, not the 4.7 the profile displays. Google's displayed
rating is not a plain arithmetic mean of the visible reviews and can move.

Two consequences:

- **Never hardcode "4.7".** Any published figure must be traceable to what Google actually shows,
  and it will drift as reviews accumulate. A stale or unverifiable rating claim on a commercial page
  is a consumer-protection problem, not merely an SEO one.
- Prefer wording that is durably true and independently checkable, e.g. "Rated 4.6/5 across 62
  Google reviews (as of August 2026)" with a link to the profile — or better, render the number
  live from the Places API / Embed API and never assert it in static copy at all.

**[LAWYER]** India-specific: BIS **IS 19000:2022**, "Online Consumer Reviews — Principles and
Requirements for their Collection, Moderation and Publication", applies to any organisation
publishing consumer reviews online, explicitly including suppliers that collect reviews from their
own customers. Compliance is currently **voluntary**, but it sets the expectation that a business
publishing reviews about itself must not cherry-pick or suppress negative reviews. The profile has
4 one-star reviews. Publishing only the five-star ones, as a curated static set, is exactly the
selective-publication pattern the standard is aimed at — a further reason to link to the full,
unfiltered profile rather than hand-pick quotes. The Consumer Protection Act 2019 misleading-
advertisement provisions sit behind this.

---

## Recommended approach

**Tier 1 — ship this. Zero cost, zero risk, no API integration.**

1. A trust strip on the homepage and the enquiry page stating the rating and review count as plain
   text, with the "as of" date, e.g. *"Rated 4.6 / 5 across 62 Google reviews"*. Facts about the
   business, not copied expression.
2. That strip links to the Google Business Profile so a Prospective Parent reads the reviews at
   source, in full, including the critical ones. This is the safe fallback the ticket asks about,
   and it is also the most credible option — an outbound link to the unfiltered profile is a
   stronger trust signal to a sceptical parent than five hand-picked quotes on our own page.
3. Optionally a Maps Embed API iframe on the contact page. Free, unlimited, requires only an API
   key, and Google renders the business card with rating and review count itself — the aggregate
   is displayed by Google, not asserted by us.
4. `LocalBusiness` JSON-LD with NAP, hours, geo, and `sameAs` → the Google Business Profile URL.
   **No `aggregateRating`. No `review`.**
5. A "Leave us a review" call to action using the profile's own review link, to keep the asset
   growing.

**Tier 2 — if genuine parent quotes on the page are wanted.**

Collect **first-party testimonials**. Ask parents directly — including those who already left a
Google review — for permission to publish their words on the site, and keep a written record of
that permission. These are ours to publish, unlimited in number, and unconstrained by Google's
terms. Attribute them as parent testimonials, and do **not** present them as Google reviews or
imply Google verified them.

Even then: **still no `Review` / `AggregateRating` markup.** First-party testimonials on our own
site are the textbook definition of self-serving under Google's rule. The rich result is not
available to a business on its own site by any route. Publish them because they persuade parents,
not because they might earn stars.

**Tier 3 — only if live Google reviews on-page are judged essential.**

Use the **Places UI Kit** `gmp-place-details` element with reviews enabled. Google renders the
reviews, the author attributions, the source links and the Google Maps attribution; we stay inside
the terms without hand-rolling the checklist. Accept the constraints: a maximum of 5 reviews, we do
not choose which, it needs client-side JavaScript on a static site, it needs a billing-enabled API
key with restrictions set, and it adds a third-party render dependency to the page whose one job is
capturing Enquiries. Verify the SKU and cap in Cloud Console before committing.

**Never do:** copy review text or reviewer names out of the Takeout Export into the repo or the
site; build a static JSON snapshot of reviews and ship it; emit `AggregateRating` or `Review`
schema; screenshot the reviews and publish the image (same copyright issue, plus it forges the
Google UI); or use a third-party "Google reviews widget" service (it inherits every problem above
and Google's guidance names widgets like it explicitly).

---

## Open questions

- **Places UI Kit SKU tier for reviews content** — not determinable from the public docs. Confirm in
  Cloud Console billing after a trial integration before relying on the free cap.
- **[LAWYER]** Whether reproducing a short review quote with the reviewer's *written permission*
  still touches Google's terms in any way. My reading is no — the permission is from the copyright
  holder, and we would not have obtained the text through a Maps Platform Service. But the belt-and-
  braces answer is to ask the parent to write a fresh testimonial rather than to re-license their
  Google text.
- **Exact displayed rating.** The Takeout Export supports 4.6; the profile shows 4.7. Confirm the
  live figure on the profile before publishing any number, and decide the refresh cadence.

---

## Sources

Google terms and policies:

- [Google Terms of Service](https://policies.google.com/terms) — "Your content remains yours"; scope of the licence granted to Google
- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms) — §3.2.2(b) Attribution; §3.2.3(a) No Scraping; §3.2.3(b) No Caching; §3.2.3(c) No Creating Content From Google Maps Content
- [Google Maps Platform Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) — §3 Caching (Google IDs); §14 Places API (Legacy and New); §15 Places UI Kit
- [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies) — caching restrictions, author attribution, `googleMapsUri` source links, ordering notice, Google Maps attribution
- [Business Profile APIs — Terms of Service](https://developers.google.com/my-business/content/terms)
- [Business Profile APIs — policies](https://developers.google.com/my-business/content/policies) — General API policies; Content storage; branding
- [Business Profile APIs — work with review data](https://developers.google.com/my-business/content/review-data)

Google Search Central (structured data):

- [Review snippet (Review, AggregateRating) structured data](https://developers.google.com/search/docs/appearance/structured-data/review-snippet) — self-serving reviews; "Don't aggregate reviews or ratings from other websites"
- [Making Review Rich Results more helpful](https://developers.google.com/search/blog/2019/09/making-review-rich-results-more-helpful) — the 2019 announcement and definition of "self-serving"
- [Local business (LocalBusiness) structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business) — `aggregateRating` / `review` "only recommended for sites that capture reviews about other local businesses"
- [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) — content visibility, misleading markup, rich-result ineligibility vs. manual actions

API reference and pricing:

- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details) — field-to-SKU mapping; `rating`/`userRatingCount` → Enterprise, `reviews` → Enterprise + Atmosphere
- [Places API `Review` resource](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#Review) — fields, and the 5-review maximum
- [Places UI Kit overview](https://developers.google.com/maps/documentation/javascript/places-ui-kit/overview) and [Place Details Elements](https://developers.google.com/maps/documentation/javascript/places-ui-kit/place-details) — `gmp-place-content-config`, `gmp-place-attribution`
- [Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started) — "All Maps Embed API requests are available at no charge with unlimited usage"
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing) — SKU IDs, free caps, tier rates

India:

- [BIS press release, IS 19000:2022 — Online Consumer Reviews](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1882828) — voluntary standard covering suppliers publishing reviews collected from their own customers

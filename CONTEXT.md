# Perfect Tuition

The web presence for Perfect Tuition, a coaching centre and private tutoring business in Dum Dum Park, Kolkata, established 2012. This context covers the marketing site and the enquiry capture that feeds it.

## Language

### The business

**Owner**:
Jayeeta Bhattacharya — sole owner, founder, and primary contact for the business. All public attribution names her.
_Avoid_: Subhojit Bhattacharya (holds manager access on the Google Business Profile; his name appears as the account holder throughout `v0_GMB` purely as an artifact of who ran the export, and is never a statement of ownership)

**Coaching Centre**:
The in-person, small-batch teaching delivered at the Dum Dum Park premises, covering classes 3–12. The primary offering.
_Avoid_: Coaching class, batch class, institute

**Home Tutor Matching**:
The service of matching a private tutor to a family, delivered at the family's own home across Kolkata. A distinct offering from the Coaching Centre, and secondary to it.
_Avoid_: Home tuition, private tutor service, tutor booking

**Junior Classes**:
Classes 3–8, taught across all subjects (English, Mathematics, Science, History, Geography, Bengali).

**Senior Classes**:
Classes 9–12, taught in the Commerce stream only (Accounts, Business Studies, Economics).

### Reach and audience

**Hyperlocal Radius**:
The roughly 5km area around Dum Dum Park that v1 marketing targets. Narrower than the business's Google service area, which is all of Kolkata.

**Prospective Parent**:
The person who evaluates the business and makes contact — in nearly all cases a parent deciding on behalf of a child, not the student.
_Avoid_: Customer, client, user, lead

### Enquiry and sources

**Enquiry**:
An inbound expression of interest from a Prospective Parent, captured by the site and stored locally. The site's primary conversion event.
_Avoid_: Lead, contact request, submission, form fill

**Consent Notice**:
The standalone notice rendered at the enquiry form, itemising the fields collected, the purpose, and the parent's rights. Distinct from the privacy policy — a link to the policy does not substitute for it. Rendered bilingually in English and Bengali; the language actually shown is recorded with the Enquiry.
_Avoid_: Privacy notice, disclaimer, terms

**Consent Record**:
The immutable evidence stored alongside each Enquiry that consent was given — timestamp, notice version, verbatim consent text, and locale. A schema obligation rather than a policy one, because the burden of proving consent falls on the business.

**Google Business Profile**:
The business's listing on Google — the canonical source of business facts (name, address, phone, hours, categories, reviews).
_Avoid_: GMB, Google My Business, Google listing (the product was renamed; `v0_GMB` retains the old initialism only as a directory name)

**NAP**:
The Name, Address, and Phone as published on the Google Business Profile. Address and phone are canonical and reproduced identically wherever they appear on the site. Consistency is worth keeping because it is free, not because Google documents it as a ranking factor — the documented local factors are relevance, distance, and prominence, and citation consistency is not among them.

**Display Name**:
**Perfect Tuition** — the short name used in titles, headings, and JSON-LD `name`. Deliberately not the full Google listing string (`Perfect Tuition ( Coaching Class ) - Home Tutor & Private Tutor`), which packs service keywords into the name in breach of Google Business Profile naming policy and is therefore not worth entrenching sitewide. The full string appears only as `alternateName` and once verbatim in the contact citation block.

**Takeout Export**:
The Google Takeout dump of the Google Business Profile held at `v0_GMB/`, dated 2026-08-17. A point-in-time snapshot and the seed content for the site, not a live feed. Contains real business data and is git-ignored.

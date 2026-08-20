# Perfect Tuition

The web presence for Perfect Tuition, a coaching centre in Dum Dum Park, Kolkata, established 2012. This context covers the marketing site and the enquiry capture that feeds it.

## Language

### The business

**Owner**:
Jayeeta Bhattacharya — sole owner, founder, and primary contact for the business. All public attribution names her.
_Avoid_: Subhojit Bhattacharya (holds manager access on the Google Business Profile; his name appears as the account holder throughout `v0_GMB` purely as an artifact of who ran the export, and is never a statement of ownership)

**Coaching Centre**:
The in-person, small-batch teaching delivered at the Dum Dum Park premises, covering classes 3–12. **The only offering** — Perfect Tuition is 100% a coaching centre.
_Avoid_: Coaching class, batch class, institute

**Home Tutor Matching**:
**Retired 2026-08-20 by the Owner.** The business no longer offers home tutoring in any form, and nothing on the site, in the API, or in the database may reference it. Recorded here only so it is not reintroduced from older material — including the Google Business Profile listing name, which still reads *"Home Tutor & Private Tutor"* and now misdescribes the business. **That listing name is deliberately not being changed**: editing a profile's primary name risks hard suspension or a ranking collapse, a cost judged higher than the inaccuracy. Do not raise it again.
_Avoid_: Home tuition, private tutor service, tutor booking, `home_tutor`, "mode"

**Jayeeta Ma'am**:
How the Owner is named in visitor-facing copy — the form of address parents and students actually use. Her role is described as **mentor**.
_Avoid_: "she teaches here", teacher, proprietor, founder (in body copy — `Owner` remains the term for her role in this document)

**Junior Classes**:
Classes 3–8. Boards: **ICSE, CBSE, KV, WB**, for English-medium and convent schools. Subjects: English Literature, English Language, Bengali, Hindi, Social Science, History/Civics, Geography (including Topo Sheet), Maths, Science (Physics, Chemistry, Biology).

**Senior Classes**:
Classes 9–12. Boards: **ICSE and CBSE**. Two subject groups, which overlap by class band — a class 9 or 10 student may take either:
- **Classes 9–10** — English Literature, English Language, History, Civics, Geography, Social Science, Political Science.
- **Classes 9–12** — Commerce, Economic Application, Economics, Accountancy, Business Studies, Entrepreneurship.

Superseded 2026-08-20: senior teaching is **no longer Commerce-only**. Humanities at 9–10 is now a named offering, and copy stating "Commerce stream only" is out of date.

**Class Timings**:
Morning 7–9 am · Evening Batch 1 5–7 pm · Evening Batch 2 7–9 pm. **Monday to Friday.** Distinct from **Call Timings** — 10 am to 10 pm — which is when the phone is answered.

### Reach and audience

**Hyperlocal Radius**:
The roughly 5km area around Dum Dum Park that v1 marketing targets. Narrower than the service area still declared on the Google Business Profile, which lists all of Kolkata — a leftover from the retired Home Tutor Matching offering and now overstated.

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

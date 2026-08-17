# DPDP Act 2023 obligations for Enquiry data

Research note for [issue #2](https://github.com/subhojit-bhattacharya/perfect-tuition/issues/2). Researched 2026-08-17 against the Gazette texts of the Act, the Rules and the commencement notification.

> **I am not a lawyer and this is not legal advice.** This is an engineering position derived from reading the primary texts. The items under [Open questions](#open-questions--worth-professional-advice) genuinely warrant a solicitor's eye before launch.

---

## Summary

**The crux — does the children's-data regime apply?** **Assume yes, and design for it.** The stricter regime under s.9 is engaged more easily than the "we collect no field about the child" framing suggests, for three independent reasons:

1. The structured fields we *do* collect — class (3–12) and subject — are attributes **of the child**, not of the Prospective Parent. Attached to a named, phone-reachable parent, they make the child "identifiable ... in relation to such data" within the s.2(t) definition of personal data. It is arguable either way, but not safely arguable in our favour.
2. The **free-text message field is uncontrolled**. A Prospective Parent will plausibly type *"my son Aritra, class 8, weak in Maths at Julien Day"*. That is unambiguously a child's personal data, arriving through a field we deliberately provided.
3. **s.9(3) does not depend on the Enquiry at all.** It is a flat prohibition on the Data Fiduciary: no tracking or behavioural monitoring of children, no targeted advertising directed at children. A marketing site about school tuition will be visited by children. Third-party ad/remarketing pixels are off the table regardless of how the Enquiry question resolves.

The good news: **s.9 is cheap for us to satisfy**, because the person submitting the Enquiry *is* the parent whose verifiable consent s.9(1) demands. It costs a checkbox, a declaration of adulthood, and a no-third-party-trackers policy. The downside of getting it wrong is a penalty of up to **₹200 crore** (Schedule, entry 3). The asymmetry decides it.

**Are we in scope?** Yes. s.3(a) catches any digital collection of personal data in India. There is **no turnover, headcount or volume threshold** in the Act, and the small-business/startup escape hatch at s.17(3) is a *power* the Central Government has not exercised. We will not be a Significant Data Fiduciary (s.10 requires an express notification), so no DPO, no audits, no DPIA, no data-localisation.

**When does it bite?** **Sections 3 to 17 of the Act — i.e. everything substantive — are not yet in force.** G.S.R. 843(E) brings them into force eighteen months after 13/14 November 2025, i.e. **13 or 14 May 2027**, roughly nine months from today. Until then the governing regime is the **IT Act s.43A + SPDI Rules 2011**, which already require a published privacy policy and a named Grievance Officer with a one-month SLA. So: a privacy policy page is mandatory **today**, under the old law, and will be functionally mandatory under the new one.

**Is a privacy policy page mandatory?** The DPDP Act never uses the phrase, but four separate provisions require things to be "prominently published on its website", and together they compose a privacy policy. Plus SPDI Rule 4 requires one outright, today. Yes — build the page.

---

## 1. Status of the law as of 2026-08-17

| Instrument | Notified | In force |
|---|---|---|
| DPDP Act 2023 (No. 22 of 2023) | 11 Aug 2023 | Phased — see below |
| Commencement notification G.S.R. 843(E) | 13 Nov 2025 (CG-DL-E-14112025-267647) | Immediately |
| Establishment of the Data Protection Board, G.S.R. 844(E) | 13 Nov 2025 | Immediately |
| DPDP Rules 2025, G.S.R. 846(E) | 13 Nov 2025 (CG-DL-E-14112025-267650) | Phased — see below |

### Act — commencement (G.S.R. 843(E))

- **In force now**: s.1(2), s.2 (definitions), ss.18–26 (the Board), s.35, ss.38–43, s.44(1) and 44(3).
- **In force 13/14 Nov 2026** (~3 months away): s.6(9) (Consent Manager registration) and s.27(1)(d).
- **In force 13/14 May 2027** (~9 months away): **ss.3–5, s.6(1)–(8) and (10), ss.7–10, ss.11–17**, s.27 (rest), ss.28–34, 36, 37, and s.44(2).

### Rules — commencement (Rule 1)

- **In force now**: Rules 1, 2, 17–21 (Board machinery).
- **In force 13/14 Nov 2026**: Rule 4 (Consent Managers).
- **In force 13/14 May 2027**: **Rules 3, 5–16, 22, 23** — notice, security, breach, retention, children, rights. Everything we care about.

**Date ambiguity.** The notifications are *dated* 13 November 2025 but carry the e-Gazette stamp `CG-DL-E-14112025-…` and a digital signature of 14 Nov 2025. Commentators split between 13 and 14 May 2027 for the eighteen-month date. **Treat 13 May 2027 as the deadline** — it is the earlier of the two and the difference is one day.

### What this means practically

Nothing in the DPDP Act binds this project *yet*. Two consequences:

- **We have runway.** Nine months to build compliantly rather than retrofit.
- **The interim regime is not nothing.** s.44(2) of the DPDP Act — the provision that omits s.43A of the IT Act 2000 and with it the rule-making power behind the SPDI Rules 2011 — is itself in the 18-month bucket. So **s.43A and the SPDI Rules 2011 remain in force until May 2027**. See §8.

**Caveat:** In January–February 2026 MeitY held stakeholder consultations on amendments to *accelerate* the compliance timeline. I could not confirm from a primary source whether any acceleration has been notified as of 2026-08-17. Re-check the Gazette before relying on the May 2027 date as slack.

---

## 2. Are we in scope? Thresholds and exemptions

**s.3(a)** — the Act applies to processing of digital personal data within India where the personal data is collected in digital form. A web form writing to SQLite is squarely within this. **In scope.**

**s.3(c)(i)** — exempts "personal data processed by an individual for any personal or domestic purpose." Perfect Tuition is a commercial business. **Does not apply.**

**No size threshold exists.** The Act contains no turnover, headcount, or record-count floor. The only candidate is:

**s.17(3)** — the Central Government *may* notify Data Fiduciaries or classes of them, "including startups", as exempt from s.5 (notice), s.8(3), s.8(7), s.10 and s.11, "having regard to the volume and nature of personal data processed." This is a discretionary power. **The DPDP Rules 2025 do not exercise it** — Rule 12 is the children's-data carve-out, Rule 16 is research/archiving/statistics, and there is no small-business schedule. **No small-business exemption currently exists.** Worth re-checking before launch; if one is ever notified it would relieve us of the notice and erasure duties, which would be significant.

**s.10 Significant Data Fiduciary** — triggered only by an express notification from the Central Government based on volume/sensitivity/risk factors. A hyperlocal coaching centre will not be notified. So **none** of the following apply to us: mandatory Data Protection Officer, independent data auditor, annual DPIA, annual audit, or the Rule 13(4) restriction on transferring data outside India.

**Roles.** The business (Owner: Jayeeta Bhattacharya) is the **Data Fiduciary** — it determines the purpose and means (s.2(i)). The Prospective Parent is the **Data Principal** (s.2(j)); note that where the individual is a child, s.2(j)(i) expressly *includes the parent* in "Data Principal". Any third party processing on our behalf is a **Data Processor** (s.2(k)).

**Cloudflare Tunnel.** Traffic terminates TLS at Cloudflare's edge before reaching the Node service, so Cloudflare handles personal data on our behalf and is best treated as a **Data Processor**. Two consequences:
- **s.8(2)** requires a Data Processor to be engaged "only under a valid contract." Cloudflare's standard terms of service plus its Data Processing Addendum satisfy this — but we should record that we have accepted them, and not assume it.
- **s.16 / Rule 15**: transfer outside India is permitted, subject only to whatever requirements the Central Government may specify "in respect of making such personal data available to any foreign State, or to any person or entity under the control of ... such a State." **No such order has been made.** There is currently no localisation obligation on a non-Significant Data Fiduciary. Storage stays on the Owner's laptop in India anyway.

---

## 3. THE CRUX — is an Enquiry from a parent "children's personal data"?

### The question

s.9(1): *"The Data Fiduciary shall, before processing any personal data **of a child** ... obtain verifiable consent of the parent."* s.2(f): a **child** is anyone under 18. So the question is whether the Enquiry contains personal data *of the child*.

The fields are: parent name, phone, class (3–12), subject(s), mode (Coaching Centre vs Home Tutor Matching), free-text message. No child name, school, age or address.

### The test

s.2(t): *"'personal data' means any data about an individual who is **identifiable by or in relation to** such data."*

Two limbs. "By" = the data itself identifies. "**In relation to**" = the individual is identifiable *in connection with* the data — i.e. indirect identification through linkage. The DPDP definition is terser than GDPR Art. 4(1) (no enumerated identifier list, no explicit "indirectly"), but the "in relation to" limb is textually broad enough to carry indirect identification, and no Indian authority yet reads it narrowly.

### Applying it

**The structured fields.** "Class 8" and "Mathematics" are not attributes of the Prospective Parent — they are attributes **of the child**. Attached to a named parent with a working phone number, they single out one specific individual: *that named parent's child, who is in class 8*. Anyone holding the record can reach the child through the parent in one step. That is identifiability "in relation to" the data.

The counter-argument is real: one can characterise `class` and `subject` as describing the *service requested*, not the child — the same way "table for four, 8pm" describes a booking rather than the diners. It is a respectable argument. It is not one I would want to be running for the first time in front of the Data Protection Board with ₹200 crore of exposure behind it.

**The free-text message field is decisive.** We control the schema; we do not control what a parent types into a textarea. Realistic submissions will name the child, the school, the exam, the weakness. Once that arrives, we are processing children's personal data as a matter of plain fact, not construction. This alone settles the engineering question.

**s.9(3) is independent of the Enquiry.** *"A Data Fiduciary shall not undertake tracking or behavioural monitoring of children or targeted advertising directed at children."* This is an unqualified prohibition on us as a Data Fiduciary. It is not conditioned on the child being our Data Principal, and it is not conditioned on consent — s.9(3) cannot be consented away. A site marketing school tuition will be browsed by children. **Any third-party behavioural tracker on the site is a s.9(3) risk irrespective of how the Enquiry-data question resolves.**

### Does the "educational institution" exemption save us?

**No.** Rule 12 read with the **Fourth Schedule, Part A, entry 3** disapplies s.9(1) and s.9(3) for *"a Data Fiduciary who is an educational institution"* — and the Fourth Schedule note (c) defines that as *"an institution of learning that imparts education, including vocational education"*, which the Coaching Centre plainly is.

But the exemption is conditioned, and the condition column is narrow: *"Processing is restricted to tracking and behavioural monitoring — (a) for the educational activities of such institution; or (b) in the interests of safety of children **enrolled with** such institution."*

Two reasons it gives us nothing:
- It covers **tracking and behavioural monitoring only** — not consent for ordinary processing. It is a s.9(3) carve-out for attendance systems and campus safety, not a general s.9(1) waiver.
- It applies to children **enrolled with** the institution. A Prospective Parent's Enquiry is by definition pre-enrolment.

The other Fourth Schedule entries (healthcare, crèches, school transport) are irrelevant. Part B entries 1–5 are irrelevant.

**One Part B entry is useful:** entry 6 disapplies s.9(1) and s.9(3) *"for confirmation by the Data Fiduciary that the Data Principal is not a child and such observance of due diligence under rule 10"*, restricted to what is necessary for that confirmation. This dissolves the bootstrap problem — we may lawfully process the submitter's declaration that she is an adult parent *in order to* establish that fact, without first needing parental consent to do so.

### Does s.7 ("certain legitimate uses") avoid s.9?

**No.** s.7(a) covers processing *"for the specified purpose for which the Data Principal has **voluntarily provided** her personal data ... and in respect of which she has not indicated that she does not consent."* Illustration (II) to s.7(a) is almost our exact case:

> *X, an individual, electronically messages Y, a real estate broker, requesting Y to help identify a suitable rented accommodation for her and shares her personal data for this purpose. Y may process her personal data to identify and intimate to her the details of accommodation available on rent. Subsequently, X informs Y that X no longer needs help from Y. Y shall cease to process the personal data of X.*

Swap "real estate broker" for "coaching centre" and "accommodation" for "tuition" and it is the Enquiry, including the duty to stop when the parent says she's no longer interested. So s.7(a) is a genuinely available legal basis, and it would technically remove the s.5 notice requirement (s.5(1) attaches to a *request for consent under s.6*).

**But s.7 does not displace s.9.** s.4(1) offers consent *or* legitimate uses as the ground for processing; s.9 is a separate, additional obligation in respect of children, and its language ("before processing any personal data of a child") is not conditioned on the ground of processing. And s.11 and s.12 rights expressly extend to s.7(a) processing anyway.

**Recommendation: rely on consent under s.6, not s.7(a).** It costs one checkbox, it removes the argument, and it makes the notice obligation a feature rather than a technicality. Mention s.7(a) in the notice as a fallback basis if you like, but do not build on it.

### Verdict

**Treat the Enquiry as engaging s.9 and design so that s.9 is satisfied.** Concretely:

1. **A required, unticked declaration at the form**: *"I am the parent or legal guardian of the student, and I am 18 years of age or older."* This is the Rule 10(1)(b)(i) route — *"details of identity and age, voluntarily provided by the individual."* Store the exact wording and the timestamp.
2. **Warn on the free-text field**: *"Please don't include your child's name, school, or date of birth — we don't need them."* This is the single highest-leverage line of copy on the site. It converts an uncontrolled channel into a mostly-controlled one, and it is evidence of the "appropriate technical and organisational measures" Rule 10(1) demands.
3. **Consider OTP-verifying the phone number.** It upgrades the record from a bare declaration towards Rule 10(1)(a) *"reliable details of identity ... available with the Data Fiduciary"*, and it kills spam submissions. Optional; the declaration is the minimum.
4. **No third-party behavioural trackers anywhere on the site.** No Meta Pixel, no Google Ads remarketing tag, no session-replay. Analytics must be cookieless and aggregate (self-hosted or a privacy-preserving provider), or absent. This is the concrete cost of s.9(3), and it is a constraint on the *marketing* work, not just the Enquiry form — flag it to whoever owns issues #8 and #10.
5. **s.9(2)** — no processing likely to cause detrimental effect on a child's well-being. Low risk here; nothing to build, but do not, e.g., publish student names or results without separate consent.

**How Rule 10 identity-verification actually reads.** Rule 10(1) requires *"appropriate technical and organisational measures to ensure that verifiable consent of the parent is obtained"*, plus due diligence *"for checking that the individual identifying herself as the parent is an adult who is identifiable **if required in connection with compliance with any law for the time being in force in India**"*, by reference to (a) reliable identity/age details already held, or (b) identity/age details voluntarily provided by the individual or via a virtual token from an authorised entity (including a DigiLocker service provider).

The conditional clause — *"if required in connection with compliance with any law"* — is doing real work. On the better reading, hard identity verification (DigiLocker / Aadhaar-backed token) is required only where some law requires the parent to be *identifiable*; otherwise a voluntary declaration of identity and age under limb (b)(i) suffices. Much commentary asserts DigiLocker verification as a flat requirement. **This is the single most uncertain point in this note** — see [Open questions](#open-questions--worth-professional-advice). Note that all four illustrations to Rule 10 concern *creating a user account for the child*, which the Enquiry does not do.

---

## 4. Notice and consent at the point of collection

### Notice — s.5 + Rule 3

The notice must **accompany or precede** the consent request (s.5(1)) and must state:

- s.5(1)(i) — the personal data, and the purpose for which it is proposed to be processed;
- s.5(1)(ii) — how she may exercise her rights under s.6(4) (withdrawal) and s.13 (grievance redressal);
- s.5(1)(iii) — how she may complain to the Data Protection Board.

Rule 3 tightens this:

- **(a) Standalone.** It must be *"presented and be understandable independently of any other information"* the Data Fiduciary makes available. **A link to a long privacy policy is not enough** — the notice must stand on its own at the form.
- **(b) Itemised.** In clear and plain language, at minimum **(i) an itemised description of the personal data** and **(ii) the specified purpose(s)**, with a *specific description of the goods or services to be provided*. So: list the six fields, and name the service — Coaching Centre admission or Home Tutor Matching.
- **(c) Routes out.** The communication link to the website/app and a description of other means by which she may **(i)** withdraw consent, with ease comparable to giving it, **(ii)** exercise her rights, and **(iii)** complain to the Board.

**s.5(3) — language.** The Data Principal must be given the *option* to access the notice in English or any language in the Eighth Schedule to the Constitution. Given Dum Dum Park and the Hyperlocal Radius, **a Bengali version of the notice is not optional in substance.** Build it.

### Consent — s.6

- **s.6(1)**: consent must be *free, specific, informed, unconditional and unambiguous, with a clear affirmative action*, and **limited to such personal data as is necessary** for the specified purpose. Practically: an **unticked** checkbox, not pre-ticked; not bundled with anything else; not a condition of viewing the site. Our field list is already minimal, which is exactly what "limited to what is necessary" wants.
- **s.6(2)**: any part of the consent that infringes the Act is invalid to that extent. Do not attempt to take consent to waive rights.
- **s.6(3)**: the request must be in clear and plain language, offer English or an Eighth Schedule language, and give **contact details of a person authorised to respond** to communications about exercising rights. For us that is the Owner. A business phone number and an email address.
- **s.6(4)–(6)**: right to withdraw at any time, *"with the ease of doing so being comparable to the ease with which such consent was given."* On withdrawal we must cease processing within a reasonable time. Since consent is given by a web form in under a minute, withdrawal cannot require a posted letter — a reply to the number/email we contacted her from, or a link, is the standard.
- **s.6(10) — burden of proof is on us.** *"the Data Fiduciary shall be obliged to prove that a notice was given ... and consent was given."* **This is a schema requirement, not a policy one.** Every Enquiry row must carry an immutable consent record: timestamp, the version identifier of the notice shown, the verbatim consent text, and the verbatim parent/adult declaration text. Without it the consent is unprovable and therefore, in a proceeding, absent.
- **s.6(7)–(9) / Rule 4 — Consent Managers.** A Data Principal *may* route consent through a registered Consent Manager. First Schedule Part B places obligations only on the Consent Manager, and only in respect of Data Fiduciaries "onboarded onto such platform." **Nothing obliges us to integrate.** Ignore.

---

## 5. Retention and erasure

### s.8(7) — the general duty

*"A Data Fiduciary shall, unless retention is necessary for compliance with any law for the time being in force, — (a) erase personal data, upon the Data Principal withdrawing her consent **or as soon as it is reasonable to assume that the specified purpose is no longer being served, whichever is earlier**."*

Illustration (I) to s.8(7): once an online marketplace has helped conclude a sale, *"Y shall no longer retain her personal data."* By analogy: once an Enquiry has resolved — the child enrols, or the parent goes elsewhere, or the trail goes cold — the purpose is spent.

### s.8(8) and Rule 8(1) — no prescribed period applies to us

s.8(8) deems the purpose "no longer served" if the Data Principal neither approaches the Data Fiduciary nor exercises her rights for *"such time period as may be prescribed"*. Rule 8(1) prescribes those periods only for the **Third Schedule** classes: e-commerce entities with ≥2 crore registered users, online gaming intermediaries with ≥50 lakh, and social media intermediaries with ≥2 crore — three years each. **None of these is us.**

So there is **no prescribed retention period** for Perfect Tuition, and correspondingly **no statutory deadline to erase**. What survives is the open-textured s.8(7)(a) test. The right move is to **choose a defensible period ourselves and publish it**, because an unwritten policy is indistinguishable from indefinite retention. Given tuition sells on an academic-year cycle and a parent who declined in Class 7 may return in Class 9, **24 months from last contact** is defensible; 12 months is safer. Pick one, state it in the notice, and enforce it in code.

Rule 8(2)'s 48-hours-advance-warning duty sits inside Rule 8(1) and so binds only the Third Schedule classes. Sending the warning anyway is good practice and cheap — we have the phone number.

### Rule 8(3) — a one-year *floor*, and it does apply to us

> *"Without prejudice to sub-rules (1) and (2), a Data Fiduciary shall retain, in respect of any processing of personal data undertaken by it or on its behalf by a Data Processor, such personal data, associated traffic data and other logs of the processing **for a minimum period of one year** from the date of such processing, for the purposes as specified in Seventh Schedule, after which the Data Fiduciary shall cause such personal data and logs to be erased, unless further retention is required for compliance with any other law."*

Unlike sub-rule (1), this is addressed to **"a Data Fiduciary"** generally, and the illustration confirms the breadth: *"The platform Y must retain the order details, personal data, and logs ... for at least one year from the date of the transaction, **even if X deletes her account**."*

The Seventh Schedule purposes are all State-facing (sovereignty and security; performance of statutory functions; assessment for Significant Data Fiduciary notification) — i.e. the floor exists so data is available to the State on lawful demand, not for our benefit.

**This resolves cleanly against the erasure right rather than conflicting with it.** s.12(3) requires erasure on request *"unless retention of the same is necessary ... for compliance with any law for the time being in force."* Rule 8(3) is such a law. So an erasure request inside the one-year window can lawfully be deferred, provided we say so and erase at the end of it.

The drafting is nonetheless poor — *"after which the Data Fiduciary shall cause such personal data and logs to be erased"* reads as a one-year *cap* as well as a floor, which cannot be right against a legitimate longer purpose. See [Open questions](#open-questions--worth-professional-advice).

### Rule 6(1)(e) — logs for one year

Security logs and personal data must be retained for one year to enable detection, investigation and remediation of unauthorised access. Consistent with the above. **Net: nothing is erased before it is 12 months old.**

### Resulting retention model

| Data | Rule |
|---|---|
| Enquiry record (all six fields) | Erase at N months after last contact, where N ≥ 12. Recommend 24. |
| Consent record | Retain as long as the Enquiry, plus a defensible tail — it is our s.6(10) evidence. |
| Access / processing logs | Minimum 1 year (Rule 6(1)(e), Rule 8(3)), then erase. |
| Erasure request received | Honour, but not below the 1-year Rule 8(3) floor; tell the requester that. |

---

## 6. Data Principal rights we must be able to honour

| Right | Source | What we must build |
|---|---|---|
| **Access** | s.11(1) | On request: a summary of the personal data being processed and the processing activities; the identities of any other Data Fiduciaries/Data Processors it has been shared with, and what was shared. We share with nobody, so the honest answer is short — but it must be *producible*. A query that dumps one Enquiry by phone number. |
| **Correction, completion, updating** | s.12(1)–(2) | Correct inaccurate/misleading data, complete incomplete data, update it. An admin edit path. |
| **Erasure** | s.12(3) | Erase on request unless retention is necessary for the specified purpose or for compliance with any law (see the Rule 8(3) floor above). |
| **Withdraw consent** | s.6(4)–(6) | Ease comparable to giving. Cease processing within a reasonable time. Distinct from erasure — log the withdrawal. |
| **Grievance redressal** | s.13, Rule 14(3) | A published route to complain, and a published response period **not exceeding 90 days**. s.13(3) requires the Data Principal to exhaust this before going to the Board — so it is our shield as much as her right. |
| **Nomination** | s.14, Rule 14(4) | She may nominate someone to exercise her rights on death or incapacity. For an Enquiry record this is close to theoretical; state that nominations are accepted in writing and leave it there. |

**Rule 14(1)** requires us to **prominently publish on the website** (a) the means by which a request may be made, and (b) any identifying particulars we need to locate her record. For us that particular is **the phone number given on the Enquiry** — say so explicitly, because it is also our anti-impersonation control.

**Rule 9** requires us to prominently publish, on the website *and* in every response to a rights request, the **business contact information of a person able to answer questions about processing**. Not a DPO — we are not a Significant Data Fiduciary — but a real, named point of contact. That is the Owner, Jayeeta Bhattacharya.

---

## 7. Security and breach

### Reasonable security safeguards — s.8(5) + Rule 6(1)

Rule 6(1) sets a **minimum** list. Mapped onto a SQLite file on the Owner's laptop behind a Cloudflare Tunnel:

| Rule 6(1) | Implementation |
|---|---|
| (a) encryption, obfuscation, masking, or virtual tokens | Encrypt the database at rest — SQLCipher, or full-disk encryption (LUKS/BitLocker/FileVault) at minimum. A plaintext `.db` on a laptop that leaves the house fails this. |
| (b) access control on computer resources | OS-level file permissions; the Node service runs as its own user; the admin view requires authentication — **Cloudflare Access in front of the tunnel**, not just an unguessable path. |
| (c) visibility via logs, monitoring, review | Append-only access log: who read/exported Enquiry data and when. Someone must actually look at it. |
| (d) measures for continued processing (backups) | Encrypted off-machine backup. A single laptop is a single point of total loss. |
| (e) retain logs and personal data for one year | See §5. |
| (f) contractual safeguards with Data Processors | Cloudflare's DPA. Record its acceptance. |
| (g) technical and organisational measures | Written down, however briefly. Rule 6 is evidential — "we did it" needs to be demonstrable. |

Penalty for failure: up to **₹250 crore** (Schedule, entry 1) — the largest in the Act.

### Breach notification — s.8(6) + Rule 7

On becoming aware of a personal data breach (s.2(u) — broad; includes accidental loss of access):

- **To each affected Data Principal, without delay** (Rule 7(1)): description, nature, extent, timing; consequences for her; mitigation taken; safety measures she can take; our contact information. We have every parent's phone number, so this is a WhatsApp/SMS run — but the message must be pre-drafted, not composed in a panic.
- **To the Board, without delay** (Rule 7(2)(a)): description including nature, extent, timing, location and likely impact.
- **To the Board within 72 hours** (Rule 7(2)(b)): updated detail, the facts and causes, mitigation, findings on who caused it, remedial measures, and a report on the intimations given to Data Principals.

Failure to notify: up to **₹200 crore** (Schedule, entry 2). **We need a written incident runbook.** Losing the laptop counts.

---

## 8. Is a privacy policy page mandatory, and what must it say?

### Under the DPDP regime (from May 2027)

The Act never says "privacy policy". But four provisions each require publication on the website, and together they *are* one:

- **Rule 9** — business contact information of the person who answers questions about processing.
- **Rule 14(1)** — the means to exercise rights, and the identifying particulars required.
- **Rule 14(3)** — the grievance redressal response period, not exceeding 90 days.
- **s.5 + Rule 3** — the notice itself, which must be *standalone* and sit at the point of collection.

Note the interaction: **Rule 3(a) means the policy page cannot substitute for the notice.** Build both — a short self-contained notice rendered at the Enquiry form, and a fuller page it links to.

### Under the current regime (today, until May 2027)

**SPDI Rule 4** requires a **body corporate** that *"collects, receives, possess, stores, deals or handle information of provider of information"* to **provide a privacy policy for handling of or dealing in personal information including sensitive personal data**, and to **publish it on its website**, covering:

1. clear and easily accessible statements of its practices and policies;
2. the type of personal or sensitive personal data collected;
3. the purpose of collection and usage;
4. disclosure of information as provided in Rule 6;
5. reasonable security practices and procedures as provided in Rule 8.

**"Body corporate"** is defined by IT Act s.43A Explanation (i) as *"any company and includes a firm, **sole proprietorship** or other association of individuals engaged in commercial or professional activities."* A sole-owner coaching business is squarely within it.

**SPDI Rule 5(9)** additionally requires designating a **Grievance Officer**, publishing her name and contact details on the website, and redressing grievances **within one month** — materially tighter than DPDP's 90 days. Adopt the one-month SLA; it is in force now and it survives comfortably under DPDP.

Two honest caveats: name and phone are **not** "sensitive personal data or information" under SPDI Rule 3 (that list is passwords, financial, health, sexual orientation, medical, biometric), so Rules 5–8 largely do not bite and s.43A damages exposure does not attach. And Rule 4's extension beyond sensitive data to all "personal information" sits awkwardly with the s.43A rule-making power it was made under. Neither caveat is a reason to skip the page — it is cheap, expected, and required again in nine months.

### What the page must say

Merging both regimes, one page covering:

1. **Who we are** — Perfect Tuition, Dum Dum Park, Kolkata; Owner Jayeeta Bhattacharya as Data Fiduciary; the NAP exactly as published on the Google Business Profile.
2. **What we collect** — itemised: parent name, phone, class, subject(s), mode, message. And explicitly: *we do not collect the child's name, school, age or address.*
3. **Why** — to respond to the Enquiry about Coaching Centre admission or Home Tutor Matching. Nothing else. No marketing use without separate consent.
4. **Legal basis** — consent under s.6.
5. **Children** — that the form is for parents/guardians only; that we ask for no information about the child; that we do not track, behaviourally monitor, or target advertising at children.
6. **Where it is stored** — a local database on the Owner's own computer in India; not a cloud service; not sold, shared or disclosed to anyone.
7. **How long** — the chosen period, and the one-year minimum-retention floor.
8. **Rights** — access, correction, erasure, withdrawal, grievance, nomination; **how** to exercise them; and that the phone number given on the Enquiry is the identifying particular required.
9. **Contact** — named person, phone, email (Rule 9 / SPDI Rule 5(9)).
10. **Grievance** — the route and the response SLA (one month).
11. **Complaint to the Board** — that she may complain to the Data Protection Board of India after exhausting our grievance process (s.13(3)).
12. **Security** — a plain-language description of the safeguards (SPDI Rule 4(v) requires this explicitly).
13. **Version and date** — because s.6(10) means we must be able to prove *which* notice was shown on a given day.
14. **Bengali version** — s.5(3).

---

## 9. What the spec must include — checklist

**Enquiry form (UI)**
- [ ] Standalone notice rendered **at the form**, not only linked — itemised fields, purpose, service description, withdrawal/rights/Board routes (Rule 3).
- [ ] Notice available in **Bengali** as well as English (s.5(3)).
- [ ] **Unticked** consent checkbox with verbatim, specific consent text (s.6(1)).
- [ ] **Unticked** parent/guardian + adult declaration: *"I am the parent or legal guardian of the student and I am 18 or older"* (s.9(1), Rule 10(1)(b)(i)).
- [ ] Free-text field labelled with an explicit warning not to include the child's name, school or date of birth.
- [ ] Link to the full privacy policy page.
- [ ] Named contact (Owner) and phone/email shown in or beside the consent request (s.6(3)).
- [ ] No pre-ticked boxes, no bundled consents, no consent as a condition of browsing.

**Data model / storage**
- [ ] Enquiry table: the six fields, nothing more.
- [ ] **Consent record per Enquiry**: timestamp, notice version id, verbatim consent text, verbatim parent-declaration text, locale shown. Immutable. (s.6(10) — burden of proof is on us.)
- [ ] Status fields for lifecycle: `last_contact_at`, `withdrawn_at`, `erasure_requested_at`, `erased_at`.
- [ ] Database encrypted at rest (SQLCipher or full-disk) (Rule 6(1)(a)).
- [ ] Append-only access log of reads/exports (Rule 6(1)(c)), retained ≥ 1 year (Rule 6(1)(e)).
- [ ] Encrypted off-machine backup (Rule 6(1)(d)).
- [ ] Admin/read interface behind authentication — Cloudflare Access, not an unguessable URL (Rule 6(1)(b)).

**Lifecycle jobs**
- [ ] Automatic erasure at the chosen retention period after last contact, **floored at 12 months** from processing (s.8(7)(a); Rule 8(3)).
- [ ] Optional 48-hour pre-erasure notice by SMS (Rule 8(2) — good practice, not binding on us).
- [ ] Consent withdrawal path that halts processing within a reasonable time (s.6(6)).

**Rights handling**
- [ ] Access: produce one Enquiry's full record plus processing summary, keyed on phone number (s.11).
- [ ] Correction/completion/update path (s.12(1)–(2)).
- [ ] Erasure path, honouring the 1-year floor with an explanation (s.12(3)).
- [ ] Grievance intake with a **one-month** SLA (SPDI Rule 5(9); DPDP Rule 14(3) allows 90 days).
- [ ] Every response includes the Rule 9 contact information.

**Site-wide**
- [ ] **No third-party behavioural trackers.** No Meta Pixel, no Google Ads remarketing, no session replay, no cross-site advertising tags (s.9(3)).
- [ ] Analytics, if any: cookieless and aggregate only.
- [ ] Privacy policy page per §8, versioned and dated, in English and Bengali.
- [ ] Grievance Officer / contact person named on the site — Jayeeta Bhattacharya.
- [ ] Rule 14(1) notice on the site: how to make a rights request and what identifier is needed.

**Operational (not code)**
- [ ] Written incident-response runbook: notify affected parents without delay; notify the Board without delay and file the detailed report within 72 hours (Rule 7). Pre-draft the parent-facing message.
- [ ] Record acceptance of Cloudflare's DPA as the s.8(2) processor contract.
- [ ] A one-page written record of the security measures taken (Rule 6(1)(g) is evidential).
- [ ] Diary a Gazette re-check before launch: any s.17(3) small-business exemption, and any acceleration of the May 2027 date.

---

## Open questions — worth professional advice

1. **Does Rule 10 require hard identity verification, or does a declaration suffice?** The conditional in Rule 10(1) — *"an adult who is identifiable **if required in connection with compliance with any law** for the time being in force in India"* — is the hinge. On the reading I prefer, DigiLocker/token verification is required only where a law demands the parent be identifiable, and Rule 10(1)(b)(i) (voluntarily provided identity and age) otherwise suffices. Much commentary asserts DigiLocker as a flat requirement. If the strict reading is right, the Enquiry form would need identity verification, which would be disproportionate for a tuition enquiry and would change the product. **This is the one question I would actually pay for an opinion on.** Mitigation in the meantime: the free-text warning plus the declaration plus OTP on the phone number.

2. **Are `class` and `subject`, without a child's name, "personal data of a child"?** I have taken the conservative view and recommended designing as if they are. No Indian authority construes s.2(t)'s "identifiable ... in relation to" yet, and none will before the Board starts deciding cases. If a later opinion says they are not, nothing in the recommended build becomes wasted — the declaration and the tracker ban are cheap and independently sensible.

3. **Rule 8(3) as a one-year cap as well as a floor.** The text says retain for a *minimum* of one year *"after which the Data Fiduciary shall cause such personal data and logs to be erased, unless further retention is required for compliance with any other law."* Read literally that forbids retaining an Enquiry beyond a year for our own legitimate purposes, which cannot be the intent and contradicts s.8(7)'s purpose-based test. I have assumed the floor reading and that a live specified purpose justifies longer retention. Confirm before setting a 24-month policy.

4. **Whether the 18-month date is 13 or 14 May 2027**, and whether the January–February 2026 MeitY consultation on accelerating the timeline has since produced a notified amendment. I could not confirm either from a primary source. Re-check the Gazette.

5. **Do the SPDI Rules 2011 survive as to already-collected data after s.44(2) commences?** s.44(2)(a) omits IT Act s.43A and s.44(2)(c) omits the s.87(2)(ob) rule-making power, so the SPDI Rules fall with them, subject to General Clauses Act savings. Not practically important if we comply with the stricter DPDP regime throughout, which is the recommendation.

6. **Cloudflare as Data Processor.** I have assumed Cloudflare's standard terms + DPA satisfy s.8(2)'s "valid contract" requirement. Someone should read the DPA and confirm it names India-appropriate terms, rather than assuming a GDPR-shaped document transfers cleanly.

---

## Sources

All primary sources were retrieved directly from the Gazette of India or India Code and read in full for the cited provisions.

**Primary — statute and subordinate legislation**

- **The Digital Personal Data Protection Act, 2023 (No. 22 of 2023)** — Gazette of India Extraordinary, Part II §1, No. 25, 11 August 2023, CG-DL-E-12082023-248045. <https://egazette.gov.in/WriteReadData/2023/248045.pdf>
- **The Digital Personal Data Protection Rules, 2025**, G.S.R. 846(E), MeitY, 13 November 2025 — Gazette of India Extraordinary, Part II §3(i), No. 760, CG-DL-E-14112025-267650. <https://egazette.gov.in/WriteReadData/2025/267650.pdf>
- **Commencement notification**, G.S.R. 843(E), MeitY, 13 November 2025 — CG-DL-E-14112025-267647. Appoints the phased commencement dates for the Act. <https://egazette.gov.in/WriteReadData/2025/267647.pdf>
- **Establishment of the Data Protection Board of India**, G.S.R. 844(E), MeitY, 13 November 2025 — CG-DL-E-14112025-267648. <https://egazette.gov.in/WriteReadData/2025/267648.pdf>
- **The Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011** — text as reproduced on Indian Kanoon. <https://indiankanoon.org/doc/114407484/>
- **Information Technology Act, 2000, s.43A** and its Explanation (definition of "body corporate"). <https://indiankanoon.org/doc/76191164/>

**Primary — government explanatory material**

- **Press Information Bureau, "DPDP Rules, 2025 Notified"**, Government of India, November 2025. <https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf>
- **MeitY, Data Protection Framework portal.** <https://www.meity.gov.in/data-protection-framework>

**Secondary — used only for status/timeline corroboration, not for any legal proposition**

- Shardul Amarchand Mangaldas, "Enforcement of the DPDP Act and notification of the DPDP rules". <https://www.amsshardul.com/insight/enforcement-of-the-dpdp-act-and-notification-of-the-dpdp-rules/>
- Chambers and Partners, "MeitY plans to cut short DPDP compliance timeline and notify cross border restrictions for SDFs" (January 2026 consultation). <https://chambers.com/articles/meity-plans-to-cut-short-dpdp-compliance-timeline-and-notify-cross-border-restrictions-for-sdfs>
- ORF, "DPDP Rules and the Future of Child Data Safety". <https://www.orfonline.org/expert-speak/dpdp-rules-and-the-future-of-child-data-safety>
- Medianama, "DPDP Rules — Does Tracking Children Sans Parental Consent Protect Them?" <https://www.medianama.com/2025/11/223-dpdp-rules-tracking-children-parental-consent/>

**Key provisions relied on, for quick reference**

s.2(f) child · s.2(i) Data Fiduciary · s.2(j) Data Principal · s.2(t) personal data · s.2(u) personal data breach · s.2(x) processing · s.3 application · s.4 grounds · s.5 notice · s.6 consent · s.7(a) legitimate uses · s.8(2) processor contract · s.8(5)–(6) security and breach · s.8(7)–(8) erasure · s.8(9)–(10) contact and grievance · s.9 children · s.10 Significant Data Fiduciary · s.11–14 rights · s.16 transfer · s.17(3) exemption power · s.44(2) IT Act amendments · Schedule (penalties).
Rules 3 (notice) · 6 (security) · 7 (breach) · 8 (retention) · 9 (contact) · 10 (verifiable parental consent) · 12 (child exemptions) · 14 (rights) · 15 (transfer) · Third Schedule · Fourth Schedule · Seventh Schedule.

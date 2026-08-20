# Incident runbook

**Read the first two sections before doing anything else.** The pre-drafted
parent notifications in §5 exist so that nobody composes legal text — least of
all Bengali legal text — while adrenaline is high.

---

## 1. The two rules that override everything

### Jayeeta Bhattacharya is the sole breach declarer

The Operator does **not** decide whether something is a breach, does not notify
parents, and does not contact the Board. The Operator's obligation is to **tell
her within one hour of noticing**, whatever the hour.

### "Each affected parent" means every parent still in the database

`erasure_log` holds no identifiers, by design (see `security-measures.md` §2), so
we cannot reconstruct who was in the database at a past date and cannot narrow
the blast radius.

**Do not spend an hour in an incident trying.** It is stated here so nobody does.

---

## 2. Timeline

| When | What | Rule |
| --- | --- | --- |
| Within 1 hour of noticing | Operator tells Jayeeta | Internal |
| Without delay | Intimation to each affected parent | Rule 7(1) |
| Without delay | First report to the Data Protection Board | Rule 7(2)(a) |
| Within 72 hours | Updated detail to the Board | Rule 7(2)(b) |

The 72-hour report must cover: the facts, the causes, the mitigation taken,
findings on who caused it, remedial measures to prevent recurrence, and a report
on the intimations sent to parents.

Rule 7(1) intimation to parents must cover: the nature and extent of the breach,
when it happened, the likely consequences, what we have done about it, what the
parent can do, and our contact details. The drafts in §5 carry all of these.

---

## 3. Scenario A — the laptop is stolen or lost

**This is a full breach of every enquiry ever taken.** The SQLCipher key is in
`.env` on the same disk, so the encryption does not help here — that is the
accepted residual risk recorded in `security-measures.md` §3, and this is the day
it is paid.

1. **Tell Jayeeta.** Within the hour.
2. **Rotate every secret**, from a different machine:
   - Revoke the Telegram bot token via `@BotFather` → `/revoke`. This stops
     anyone with the disk from sending messages that appear to come from us.
   - Rotate the Cloudflare Tunnel credentials and delete the old tunnel.
   - Rotate `TURNSTILE_SECRET_KEY`.
   - The restic password is on paper and is **not** rotated — it is the recovery
     root. The thief has a copy of `.env` and therefore the old SQLCipher key
     regardless; changing it protects future rows only, after a restore.
3. **Take the site's form offline.** Deploy with the form replaced by the Call and
   WhatsApp buttons alone. The primary CTA still works and no new personal data
   is collected into an unknown state.
4. **Restore from the offsite drive** onto a replacement machine. Follow the
   restore drill steps, then re-key the database with a new SQLCipher key.
5. **Notify** — parents (§5) and the Board.
6. **File a police report.** The Board will ask.

---

## 4. Scenario B — `.db` or `.env` reaches the public repository

**A public-repo leak is not recoverable by `git push --force`.** Once GitHub has
the blob it may be cached, forked, or already cloned. Treat it as a breach from
the moment it is pushed.

1. **Tell Jayeeta.** Within the hour.
2. **Make the repository private immediately** — this does not undo the leak, but
   it stops it widening while you work.
3. **Rotate every secret in the leaked file**, as in §3 step 2.
4. **Purge the blob** with `git filter-repo`, force-push, and **contact GitHub
   Support** to have cached views and forks purged. Do not skip the support
   request; the blob remains reachable by SHA otherwise.
5. **Assess what leaked.** `.env` alone is secrets, not personal data — still
   serious, but if the database did not leak, the parents' data did not leave.
   `*.db` is the full breach.
6. **Notify** if any personal data was in the leaked blob.
7. **Check the hook was actually installed.** `git config core.hooksPath` must
   print `.githooks`. If it does not, that is the root cause — `npm run setup`
   was never run on that clone.

---

## 5. Scenario C — unexplained access

Signs: enquiries in Telegram that no parent recognises, rows nobody can account
for, `notify_attempts` climbing without a Telegram outage, or logins to the
machine at odd hours.

1. **Tell Jayeeta.** Within the hour.
2. **Do not wipe anything.** Copy `api/logs/` and the systemd journal aside first
   — the metadata-only logs are thin, and they are all the forensics there is.
3. Check `last` and `journalctl -u ssh` for sessions that are not the Operator's.
4. If access cannot be explained, **treat it as a breach** and follow §3 from
   step 2. An unexplained access that turns out to be benign costs one awkward
   notification; the reverse costs far more.

---

## 6. Pre-drafted parent notification

Fill the four bracketed fields and send. **Send both languages together** — do
not choose on the parent's behalf.

### English

> **Perfect Tuition — important notice about your information**
>
> Dear Parent,
>
> We are writing to tell you about a security incident affecting information you
> gave us when you enquired about tuition.
>
> **What happened:** [WHAT HAPPENED, IN ONE PLAIN SENTENCE]
>
> **When:** [DATE, AND THE DATE WE DISCOVERED IT]
>
> **What information was involved:** your name, your phone number, the class and
> subjects you asked about, and anything you wrote in the message box. We do not
> hold your address, your child's name, or any payment details.
>
> **What this could mean for you:** the main risk is unwanted calls or messages
> from people who should not have your number. Please be careful about anyone
> contacting you claiming to be from Perfect Tuition and asking for money or
> personal details. We will never ask you for payment over the phone.
>
> **What we have done:** [MITIGATION ALREADY COMPLETED]
>
> **What you can do:** if you receive a suspicious call or message mentioning
> Perfect Tuition, please tell us. You may also ask us to delete your information
> at any time.
>
> **Contact us:** Jayeeta Bhattacharya, Grievance Officer —
> privacy@perfect-tuition.co.in, or call [PHONE]. We reply within one month, and
> sooner for anything about this incident.
>
> If you are not satisfied with our response, you can complain to the Data
> Protection Board of India.
>
> We are sorry. You trusted us with your contact details and we did not keep them
> as safe as we should have.
>
> Jayeeta Bhattacharya
> Perfect Tuition, Dum Dum Park, Kolkata

### বাংলা

> **পারফেক্ট টিউশন — আপনার তথ্য সম্পর্কে জরুরি বিজ্ঞপ্তি**
>
> প্রিয় অভিভাবক,
>
> টিউশনের বিষয়ে খোঁজ নেওয়ার সময় আপনি আমাদের যে তথ্য দিয়েছিলেন, তা সংক্রান্ত একটি
> নিরাপত্তাজনিত ঘটনার কথা আপনাকে জানাতে আমরা এই চিঠি লিখছি।
>
> **কী ঘটেছে:** [এক লাইনে সহজ ভাষায় কী ঘটেছে]
>
> **কখন:** [তারিখ, এবং আমরা কবে জানতে পেরেছি]
>
> **কোন তথ্য জড়িত ছিল:** আপনার নাম, আপনার ফোন নম্বর, আপনি যে শ্রেণি ও বিষয় সম্পর্কে
> জানতে চেয়েছিলেন, এবং বার্তার ঘরে আপনি যা লিখেছিলেন। আপনার ঠিকানা, আপনার সন্তানের
> নাম বা কোনো টাকাপয়সার তথ্য আমাদের কাছে নেই।
>
> **এতে আপনার কী হতে পারে:** প্রধান ঝুঁকি হল, যাদের কাছে আপনার নম্বর থাকার কথা নয়
> তাদের থেকে অবাঞ্ছিত ফোন বা বার্তা আসা। কেউ পারফেক্ট টিউশনের নাম করে যোগাযোগ করে
> টাকা বা ব্যক্তিগত তথ্য চাইলে সতর্ক থাকুন। আমরা কখনও ফোনে টাকা চাইব না।
>
> **আমরা কী করেছি:** [যে ব্যবস্থা ইতিমধ্যে নেওয়া হয়েছে]
>
> **আপনি কী করতে পারেন:** পারফেক্ট টিউশনের নাম উল্লেখ করে সন্দেহজনক ফোন বা বার্তা
> পেলে আমাদের জানান। আপনি যেকোনো সময় আপনার তথ্য মুছে ফেলতেও বলতে পারেন।
>
> **যোগাযোগ:** জয়িতা ভট্টাচার্য, অভিযোগ আধিকারিক — privacy@perfect-tuition.co.in,
> অথবা ফোন করুন [ফোন নম্বর]। আমরা এক মাসের মধ্যে উত্তর দিই, এবং এই ঘটনা সংক্রান্ত
> যেকোনো বিষয়ে তার আগেই।
>
> আমাদের উত্তরে সন্তুষ্ট না হলে আপনি ভারতের ডেটা সুরক্ষা বোর্ডে অভিযোগ জানাতে পারেন।
>
> আমরা দুঃখিত। আপনি বিশ্বাস করে আমাদের আপনার যোগাযোগের তথ্য দিয়েছিলেন, আর আমরা তা
> যতটা নিরাপদে রাখা উচিত ছিল ততটা রাখতে পারিনি।
>
> জয়িতা ভট্টাচার্য
> পারফেক্ট টিউশন, দমদম পার্ক, কলকাতা

> **⚠ The Bengali above carries the same sign-off gate as the Consent Notice.**
> Jayeeta must read and correct it before it is ever sent. It is pre-drafted so
> that the correction happens calmly, now, rather than under pressure during an
> incident — which is exactly the mistranslation risk already flagged on the
> notice.

---

## 7. After any incident

- [ ] Record what happened, and what changed as a result, in
      `docs/security-measures.md`.
- [ ] If a control failed, add or fix the control — not just the instance.
- [ ] Re-run the restore drill.
- [ ] Bring the six-monthly review forward to now.

# BIOBUZZ (2026-2027) vs. DECODE (2025-2026) — Key Differences

**Sources:** `DECODE_Competition_Manual_TU14.pdf` (163 pages, final manual, Team Update 14) vs. `BIOBUZZ_Competition_Manual_V0.pdf` (93 pages, **Pre-Season V0 draft**)

## The single most important thing to know

**BIOBUZZ V0 is not a complete manual yet.** Sections 8–11, 13, and 15 — Game Overview, ARENA/FIELD, Game Details, Game Rules (G), Tournament (T), and FIRST Championship (C) — are all explicit placeholders reading *"This section will be updated with the Kickoff Competition Manual release on September 12, 2026."*

That means the actual 2026-2027 game (scoring objects, field layout, match structure, scoring values, penalty/card system, playoff bracket mechanics) **does not exist in this document yet.** Confirming this: DECODE contains 62 "Violation:" tags tying rules to MINOR/MAJOR FOUL/YELLOW/RED CARD consequences; BIOBUZZ V0 currently has zero. The glossary also has no game-specific scoring terms (no equivalent of DECODE's ARTIFACT, CLASSIFIER, GATE, GOAL, MOTIF, OBELISK, PATTERN, LAUNCH, etc.).

**What V0 *is* useful for today:** the ROBOT Construction Rules (R), Event Rules (E), Eligibility/Inspection (I), Advancement, and Awards sections are populated, plus a significant rewrite of the manual's philosophy and tone. Those are the real, locked-in differences below.

---

## 1. Season theme & branding

| | DECODE | BIOBUZZ |
|---|---|---|
| Presenting sponsor | RTX | RTX (same) |
| Season umbrella program | **FIRST® AGE™** presented by Qualcomm — "Uncover the Future," archaeology theme | **FIRST® CANOPY™** — "Engineer a Thriving Planet," nature/biodiversity/ecosystem theme, no presenting sponsor named yet |
| Game mechanics | ARTIFACTS, CLASSIFIER (SQUARE/RAMP/GATE), OBELISK/MOTIF pattern, GOAL, AprilTags, LAUNCH zone; 30s AUTO / 8s transition / 2-min TELEOP | **Not yet defined** (placeholder) |

## 2–4. Game Overview, ARENA/FIELD, Game Details & Game Rules (G)

Not available in BIOBUZZ V0 — all placeholders pending the September 12, 2026 Kickoff release. One holdover detail: the glossary still describes the FIELD as "36 interlocking soft foam TILES," suggesting the ~12ft × 12ft base field size likely carries over even though game-specific ARENA elements are TBD.

## 5. ROBOT Construction Rules (R) — real, finalized changes

This is the section with the most concrete differences:

- **Servo limit reduced:** 8 motors + **8 servos** (BIOBUZZ R503), down from 8 motors + **10 servos** (DECODE R503).
- **OPERATOR CONSOLE is 4 in. deeper:** 3ft × **1ft 6in** deep × 2ft (BIOBUZZ R903) vs. 3ft × **1ft 2in** deep × 2ft (DECODE R904).
- **ROBOT expansion sizing is TBD:** BIOBUZZ R105 defers the expansion envelope to Kickoff (DECODE allowed vertical expansion up to 38in via R101/G414).
- **Gamepad restrictions loosened:** DECODE capped consoles at 2 gamepads from a named approved list (Logitech F310, Xbox 360, DualShock 4, DualSense, Etpark, REV USB PS4-compatible, Quadstick). BIOBUZZ drops both the list and the 2-gamepad cap, generically allowing "one or more gamepads."
- **Android smartphone control effectively deprecated:** DECODE named specific legal phones (Moto G4 Play/G5/G5 Plus/E4/E5/E5 Play, Android 7+ minimum) with an approval path for other devices. BIOBUZZ removes this entirely — the **REV Control Hub is now the only officially supported ROBOT CONTROLLER**; other devices are used at the team's own risk.
- **New vendor parts:** WATTOS Stingray 12V DC motor (WDM12) and WATTOS Power Switch Kit (WTS-SW1220) added to approved-parts tables (WATTOS batteries already existed).
- **New explicit ban:** BIOBUZZ R704.D bars streaming telemetry via third-party tools like **FTC Dashboard, FTControl Panels**, etc. — not present in DECODE.
- **Main power switch rule relaxed:** DECODE required it be accessible to "the team **and FIELD STAFF**" with specific non-compliant examples; BIOBUZZ only requires accessibility "to the team," away from pinch hazards.
- **Pneumatics rule expanded:** DECODE's rule was a one-liner pointing to a game-specific exception. BIOBUZZ R801 is now a fully self-contained 5-part rule (no stored-pressure solenoids, no adjustable gas vessels except pneumatic wheels, no vacuum/pressure generation, no high-speed airflow devices except COTS cooling fans).
- **Battery rules consolidated/relocated:** DECODE's standalone R603–R606 (safe connectors, 3A charge rate, no ballast use, secure mounting) are gone as separate R-rules; charging content moved to new **E511** in Event Rules, and the ballast/mounting requirements appear dropped as standalone rules.
- **Unchanged:** 18in cube starting size, no weight limit, single 12V NiMH main battery (same 6 approved packs), ROBOT SIGN sizing (6.5in × 2.5in, visible from 12ft), core motor/servo parts approach.

## 6. Tournament / Match Structure (T)

Not available — placeholder pending Kickoff (bracket sizes, qualification ranking, ALLIANCE selection, Dual Division rules).

## 7. Advancement — unchanged

The advancement points formula, tables, and tiebreaker order are **word-for-word identical**:
- Qualification Phase Performance: 2–16 pts via the same inverse-error-function formula (α = 1.07)
- ALLIANCE Lead / Draft Order Acceptance: 21 − position number
- Playoff Advancement: 40 / 20 / 10 / 5 pts for 1st–4th
- Team Judged Awards: 60 / 30 / 15 pts for Inspire, 12 / 6 / 3 for all other awards
- 10-level tiebreaker sort order unchanged
- Tournament progression structure (QT/LT → SQT/RCMP → FIRST Championship/FPE) unchanged
- Registration cutoff for regional advancement allocation: Nov 17, 2026 (BIOBUZZ) — same seasonal timing as before

## 8. Awards (A)

- **Award renamed:** Dean's List Award → **FIRST Leadership Award**
- **Interview renamed:** "Structured Interview" → **"Initial Interview"** (same 10-min minimum, 5-min uninterrupted presentation, silent-observer and translator provisions unchanged — naming only)
- **New mechanic:** JUDGE Advisor now selects two questions from a standardized question bank (one MCI-focused, one TA-focused) asked to every team
- All core award names unchanged: Inspire, Think, Connect, Reach, Sustain, Innovate (RTX), Control, Design, Judges' Choice, Winning/Finalist Alliance, Compass; award-availability-by-event-size table unchanged
- Project-Based Global Awards (Digital Animation, Safety Animation) marked **"coming soon"** — not yet detailed for BIOBUZZ
- PORTFOLIO rules unchanged (15-page/15MB limits, PII minimization, AI-assistance disclosure allowed)

## 9. Event Rules (E)

- **New Competition Integrity Contract (CIC) reference** woven into inspection rules — circumventing ROBOT rules is now explicitly tied to CIC violations (concept didn't exist in DECODE)
- **"In the Stands" folded into General Rules** — no longer a standalone subsection
- **Battery charging rules moved here** as new **E511** (3A average current limit, polarized connectors, no alligator clips) — relocated out of ROBOT Construction Rules
- **Universal Violation Note simplified** — DECODE spelled out a detailed escalation chain; BIOBUZZ condenses it to a general "VERBAL WARNING, escalation for egregious/repeat violations" statement
- **E102 renamed** "Be Nice" → **"Be Respectful"**, now cross-referencing the new Framework of Behaviors; itemized examples of misconduct largely unchanged
- Machine Shops, Wireless Rules, Load-In, Ceremonies sections nearly verbatim identical
- Pit safety-glasses grace period simplified in wording (same practical effect)

## 10. Eligibility & Inspection (I)

- Several I-series rules **relocated**: "It's your team's ROBOT" → **R101**; "Enter only 1 ROBOT" → **E117**
- Explicit inspection-violation consequences (DQ before match start, RED CARD if after) are **no longer codified as "Violation:" tags** — consistent with the manual-wide de-emphasis on itemized penalties
- New framing: *"Inspection is not comprehensive... teams are expected to adhere to the spirit of the rules"* — new "spirit not letter" language not present in DECODE
- Team eligibility (registration, 2 Lead Coaches w/ YPP, dashboard registration) and check-in timing (45 min before Qualification matches) unchanged
- Q&A opens **September 28, 2026** (calendar-shifted for the new season); DECODE's special "FTC 1000" question carve-out is absent in BIOBUZZ

## 11. Manual philosophy — the real headline change

DECODE's stated approach: *"The intent of this manual is that the text means exactly, and only, what it says... There are no hidden requirements or restrictions."* — a literalist, exhaustively-prescriptive style.

BIOBUZZ explicitly reverses this in new Section 1.4 ("The Spirit of the Competition"): *"The manuals from prior seasons focused on covering exact circumstances and details, removing flexibility in favor of attempting to cover all scenarios. The BIOBUZZ manual emphasizes the 'spirit of the rule' and empowers event volunteers to make good-faith judgement calls... rather than be required to watch for and record every action or incident that occurs."*

Supporting this shift:
- **New Section 1.5 — Competition Integrity Contract (CIC):** a formal team pledge in two parts — a **Sporting Ethics Code** ("We Don't Cheat," "We Always Behave with Integrity," "We Play the Game as Intended," "We Know Our Team Doesn't Enforce the Rules") and **Behavior Guidelines** (journey-over-destination, respect, mutual help, "take the high road," property respect, safety culture, healthy choices, "we're all on the same team"). Entirely new — DECODE had only a brief "Spirit of Volunteering" paragraph.
- **New "Framework of Behaviors"** (1.4.2) tying together Gracious Professionalism, the FIRST Code of Conduct, the CIC, and the Competition Manual as layered expectations.
- Manual-wide, per-rule "Violation:" tags are essentially gone for now (partly because Game Rules aren't published yet, but consistent with the stated philosophy).
- Rule-lettering scheme (I/E/A/G/R/T/L/C), Evergreen-rule green-headline convention, orange guidance boxes, and yellow-highlight Team Update convention are all unchanged.

## 12. Bottom line for the team

- **Practical prep work you can do now:** review the finalized ROBOT Construction Rule changes (8 servos not 10, deeper OPERATOR CONSOLE, no more approved-smartphone path — plan around the REV Control Hub, drop FTC Dashboard/FTControl Panels from your telemetry workflow, note the new WATTOS motor/switch options).
- **Advancement and awards structure planning carries over directly** — the points system and tournament ladder are unchanged, so returning teams can reuse their season-planning assumptions there.
- **Game strategy work has to wait for Kickoff (September 12, 2026)** — nothing about the actual 2026-2027 game, field, or scoring exists yet in this draft.
- Expect a **cultural/enforcement shift at events**: volunteers are being directed toward judgment-call, spirit-of-the-rule enforcement rather than exhaustive rule-by-rule policing, and teams are now asked to sign onto the CIC's explicit anti-loophole, don't-self-police ethos.

# Fashion Saavy — Product

> Authoritative for **what** Fashion Saavy is and **why**. Experience details live in [UX.md](UX.md); technical design lives in [ARCHITECTURE.md](ARCHITECTURE.md).

## Vision

Fashion Saavy is a wardrobe-first AI personal stylist for students and young adults. It learns the user's personal style and their actual wardrobe, then helps them discover, create, refine and eventually try on outfits.

> Fashion Saavy should understand the person before it recommends the outfit.

Success is a user saying: *"It actually understands what I like and what I own."*

## Target user

Students and young adults who:

- care about how they look and want to improve their personal style
- own a small-to-moderate wardrobe
- want practical styling, not professional fashion consulting
- are comfortable with AI-powered consumer apps

The initial context is Indian students and young adults. The product model must not be restricted to India.

## Problem

Users usually have clothes, but they can't reliably turn them into outfits they feel good in. They don't need more clothes:

- "I don't know what suits me."
- "I have clothes but don't know how to combine them."
- "I keep repeating the same outfits."
- "I see looks online but can't adapt them to myself."
- "Fashion advice is generic. It doesn't know me."

## Core product experience

One continuous loop matters more than the number of features:

```text
Understand my style → Add my wardrobe → Ask for an outfit → Get a personal outfit
      → Refine it → Give feedback / wear it → Better recommendations next time ↺
```

## Product concepts

| Concept | Definition |
|---|---|
| **Style Profile** | The user's persistent fashion identity, established through an onboarding questionnaire. It covers aesthetics, silhouettes, colors, fit, comfort and the situations they dress for. It is presented as a **summary**, not as raw answers. A fundamental change means **retaking the questionnaire**, not editing the identity casually. |
| **Wardrobe** | The user's digital library of **garments** they own. Each garment has structured attributes (type, category, color, pattern, silhouette, neckline, sleeve, rise, length, material, fit, occasion). AI proposes the attributes and the user confirms or corrects them. **User-confirmed data is authoritative.** A garment is assumed to fit the user unless the user says otherwise. |
| **Stylist** | The core intelligence. It combines **Style Profile + Wardrobe + Context + Feedback** into complete outfits from garments the user owns, explains why each outfit works, and supports **refinement**. |
| **Outfit** | A coherent combination of the user's garments with a short styling rationale. It is shown as a composition of the user's own garment images, not as generated photography. |
| **Refinement** | Changing part of an outfit ("keep everything, change the pants") without regenerating the whole thing. |
| **Feedback** | Lightweight signals on outfits: **Love**, **Okay**, **Not for me**, **Worn**. Feedback improves future recommendations. **Worn** is the strongest signal because it shows the outfit was actually used. |
| **Saved Outfit** | A temporary, practical reference rather than an archive. It is kept **30 days** by default, can be extended to a **maximum of 45 days**, and the user gets a reminder **about one week before it expires**. |
| **Inspiration** | Home content, including celebrity/creator **style case studies**, that teaches *why* a look works, so users learn principles instead of copying people. |
| **Try-On** | A camera-based AR experience launched from an outfit. It is closer to an advanced fashion filter than to photorealistic virtual try-on, and it is kept separate from the Stylist. |

## V1 scope

The first release must prove the core loop end to end:

1. Onboarding questionnaire → Style Profile summary
2. Wardrobe capture from photos, with AI attribute extraction and user confirmation (**clothing only**)
3. Stylist: outfits generated from the user's own wardrobe, with optional context and a rationale
4. Refinement of individual garments within an outfit
5. Feedback (Love / Okay / Not for me / Worn) that affects later recommendations
6. Saved Outfits with expiry, extension and reminder
7. Home with personalized inspiration and style case studies
8. Profile showing the style summary, with an option to retake the questionnaire

**Try-On** is a major product capability, but it comes after the core loop works. V1 must not depend on it, and it must not block the loop. See [ARCHITECTURE.md](ARCHITECTURE.md#9-try-on--vision-boundary).

## Non-goals (initial product)

- **No shopping or e-commerce-first experience.** There is no marketplace, and the product does not push users to buy.
- **No generated outfit photography** as the main way outfits are shown.
- **No shoes** in the V1 wardrobe. They may come later.
- **No direct celebrity copying.** Inspiration teaches principles.
- **No silent AI changes** to user-confirmed wardrobe or style data.
- **No photorealistic virtual try-on.**

## Product principles

1. Wardrobe-first: recommend from what the user owns.
2. Personal over generic: every recommendation reflects this user's profile, wardrobe and history.
3. AI proposes, the user decides. Confirmed user data always wins.
4. Every outfit can be explained. The user should understand why it was suggested.
5. Prefer interaction and feedback over configuration.
6. Visually aspirational but practically useful.
7. Build the core loop before widening the feature set. Don't build features that have no user problem behind them.
8. AI supports the user's style identity. It does not replace it.

## Success signals

Users complete onboarding, build a usable wardrobe, request several outfits, refine outfits instead of rejecting them outright, mark outfits as **Worn**, and see recommendations line up with their preferences over time.

## Open product questions

These are not yet decided. Don't invent answers for them in code; raise them instead.

- Sign-in methods and the minimum supported user age (this has privacy implications for photos)
- How saved-outfit reminders are delivered (in-app only, email, or push)
- Whether **Worn** can be recorded alongside Love/Okay/Not for me on the same outfit, and whether it can be recorded more than once
- Where inspiration and case-study content comes from and who authors it, including image rights for celebrity/creator photos
- The exact garment category taxonomy for V1

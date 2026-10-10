# Fashion Saavy — UX

> Authoritative for **how the user experiences** Fashion Saavy. Product definitions and scope live in [PRODUCT.md](PRODUCT.md); this document doesn't repeat them. Exact colors, typography, spacing, motion, breakpoints, component specs and microcopy are set during visual design and implementation, not here.

## Experience character

Fashion Saavy should feel **visual, personal, modern, fashion-forward and approachable**, like a personal stylist who happens to be intelligent. It must **not** feel like a generic AI SaaS dashboard: no dense control panels, model terminology, or chat-window-as-the-whole-product.

Images, garments and composition carry the meaning; text supports them.

## Information architecture

```text
Home ─────── personalized inspiration, style case studies
Wardrobe ─── garment library → garment detail / add garment
Stylist ──── request → outfit → refine → save / feedback / Try-On
Profile ──── style summary, retake questionnaire, saved outfits, account

Try-On ───── contextual, launched from an outfit (not a nav destination)
Onboarding ─ first run only; reachable later via "retake questionnaire"
```

## Primary navigation

Four destinations: **Home | Wardrobe | Stylist | Profile**.

- Bottom tab navigation on both Android and iOS.
- Navigation should stay visually secondary to the content.
- Try-On is never a fifth tab. It opens from an outfit and returns to it.

## Major user journeys

1. **First run:** welcome → questionnaire → Style Profile reveal → add first garments → first outfit.
2. **Daily outfit:** Stylist → optional context ("college tomorrow, it's hot") → outfit → refine → save or mark Worn.
3. **Style a specific garment:** Wardrobe → garment → "Style this" → Stylist with that garment locked in.
4. **Learn from inspiration:** Home → case study → "why it works" → "try this idea with my wardrobe" → Stylist.
5. **Return visit:** reminder about a saved outfit that is about to expire → extend or let it go.
6. **Identity change:** Profile → retake questionnaire → new Style Profile summary.

## Onboarding

- It should feel like a fashion experience, not a settings form. Questions should be visual where possible (for example, choosing between images, aesthetics and silhouettes).
- Keep it as short as possible while still producing a meaningful profile. Show progress, and allow the user to go back.
- It ends with a **Style Profile reveal**, a short summary the user can recognize themselves in, which leads straight into adding garments.
- Don't ask for camera or other permissions during onboarding.
- Wardrobe setup should invite the user to add a few garments to get started. It must not demand a full wardrobe before the user gets any value.

## Style Profile

- Shown as a concise, human-readable **summary**, with style direction, key preferences and the contexts they dress for. Raw questionnaire answers aren't shown.
- It can't be edited field by field. Changing the identity means **retaking the questionnaire**, presented as a deliberate action that replaces the current profile.
- Small adjustments that come from feedback happen implicitly in the Stylist and never rewrite the profile summary.

## Wardrobe

- A visual grid of the user's garments, with filtering and browsing by category, color and similar attributes.
- **Adding a garment:** take or upload a photo → AI proposes attributes → user reviews → user confirms. Proposed values are clearly marked as suggestions until the user confirms them, and corrections take a single tap.
- Attributes are disclosed progressively: show the essentials first and keep detailed attributes one step away.
- Fit is assumed. The user only sets a fit note when a garment doesn't fit as expected.
- Clothing only in V1. If the user tries to add shoes, the app explains politely that they aren't supported yet.
- From any garment, the user can go to **Style this**.

## Stylist

The Stylist is the primary interaction.

- Users ask naturally: "Something casual for college", "What should I wear tomorrow?", "Style these pants", "Make this more minimal".
- Context (occasion, mood, formality, weather, a garment to include) is **optional** and offered as light suggestions, never as a required configuration flow.
- If the wardrobe can't produce a sensible outfit for the request, the Stylist says so honestly and suggests what would help (for example, adding garments in a missing category). It never fills the gap with garments the user doesn't own.

## Outfit experience

The outfit is the visual focus. It is composed from the user's own garment images and shows:

- the selected garments as one coherent composition
- a short rationale for why the combination works
- the context it was made for
- the available actions: **Refine**, **Save**, **Feedback**, **Try On**

## Outfit refinement

- The user can act on a single garment ("swap this") or the whole outfit ("more minimal", "warmer").
- Only the targeted part changes. Everything else stays exactly as it was ("keep everything, change the pants").
- The user can lock garments they want to keep.
- The user can return to the previous version after a refinement.

## Feedback loop

- Love / Okay / Not for me / Worn are always reachable from an outfit with one tap. They are never a mandatory survey.
- **Worn** should be easy to record both right away and later (for example, from Saved Outfits).
- An optional "why" may be offered after **Not for me**, but it must be skippable.
- The product may show that it is learning ("more like this"), but it never presents itself as a scoring engine.

## Try-On

```text
Outfit → Try On → camera permission (first use only) → body guidance → live garment overlay
```

- Camera permission is requested in context, the first time the user taps Try On, with a short explanation.
- Before rendering, the app helps the user frame themselves (distance, full body visible, lighting) and keeps giving guidance whenever tracking is lost.
- The overlay follows the user's movement. It is positioned as a fashion filter, not a photorealistic preview.
- If permission is denied or the device can't run Try-On, the app explains why and returns the user to the outfit. The outfit stays fully usable.
- The app tells the user that camera frames are processed on their device.

## Saved outfits

- Saved from any outfit. Found under Profile, and surfaced in context (for example, on Home) when relevant.
- Each saved outfit shows how long remains before it expires.
- Before expiry (about one week ahead) the user is reminded and can **extend** it, up to the maximum, or let it expire.
- They are presented as "outfits I plan to wear", not as an archive.

## Profile

- Shows the style summary, the option to retake the questionnaire, saved outfits, a light overview of the wardrobe, and account controls (sign out, delete account and data).
- It must not become a settings-heavy page.

## UX principles

- **Visual first.** Garments and outfits carry more meaning than text.
- **Progressive disclosure.** Complexity appears only when it is useful.
- **Personal, not generic.** Every screen reflects this user's wardrobe and style.
- **Minimal friction.** Common actions take as few steps as possible.
- **Explain without overwhelming.** The rationale is short and can be expanded.
- **AI stays in the background.** No model names, prompts or pipeline language in the UI.
- **User control.** Suggestions are visibly suggestions, and confirmed data is never silently changed.

## States

Every major screen designs its **loading, empty, error, permission and unavailable** states on purpose.

- AI waits feel contextual and human ("Pulling together something for college…"), and show progress or partial results where possible.
- Empty states lead toward the next step in the core loop (an empty wardrobe leads to adding garments).
- Errors are understandable and recoverable. Raw API or model errors are never shown.

## Platform & accessibility direction

- A native mobile app for Android and iOS. The same IA and experience on both, respecting each platform's conventions where they matter to users (back behavior, system permission prompts).
- Readable type that respects the system text-size setting, sufficient contrast, and accessible labels for screen readers (VoiceOver, TalkBack), including meaningful descriptions for garment images.
- Feedback and state must never be conveyed by color alone.
- Respect reduced-motion preferences.
- Touch targets work comfortably for one-handed mobile use.
- The visual identity stays expressive without compromising any of the above.

import type { SwatchName } from '../../ui/tokens';

/**
 * Sample editorial content for Home. Written by the team for this preview build, not fetched or personalized.
 * Stories teach a styling principle rather than reproduce someone's look. Celebrity and creator case
 * studies wait until content sourcing and image rights are decided (open question in docs/PRODUCT.md).
 */
export type Story = {
  id: string;
  kicker: string;
  title: string;
  dek: string;
  palette: readonly SwatchName[];
  whyItWorks: string;
  principles: readonly string[];
  tryWithWardrobe: string;
};

export const SAMPLE_STORIES: readonly Story[] = [
  {
    id: 'one-hero-piece',
    kicker: 'Principle · Repetition',
    title: 'One white shirt, five college days',
    dek: 'A single hero piece, restyled five ways, is the fastest route to a wardrobe that works harder.',
    palette: ['ivory', 'indigo', 'camel', 'rust'],
    whyItWorks:
      'Repeating a strong base piece reads as personal style, not as repetition. Changing only one thing each day keeps every look fresh while the wardrobe stays small.',
    principles: [
      'Choose one versatile piece you already love and build around it.',
      'Change one variable a day: the bottom, the layer, or how it is tucked.',
      'Keep colours in one family so everything recombines.',
    ],
    tryWithWardrobe: 'Build a week of outfits around one piece I own',
  },
  {
    id: 'kurta-colour-block',
    kicker: 'Principle · Colour',
    title: 'Colour blocking, the kurta way',
    dek: 'A solid kurta with a contrasting bottom looks considered, without a single print.',
    palette: ['saffron', 'indigo'],
    whyItWorks:
      'Two solid colours with clear contrast create a strong outline. Saffron against indigo works because one is warm and one is cool, at a similar depth.',
    principles: [
      'Pair one warm colour with one cool colour of similar depth.',
      'Let solids do the work; keep prints for a single piece, if any.',
      'Repeat one of the two colours in a small detail to tie the look together.',
    ],
    tryWithWardrobe: 'Find a colour-blocked look in my wardrobe',
  },
  {
    id: 'proportion',
    kicker: 'Principle · Proportion',
    title: 'Wide trousers, short top',
    dek: 'When one half of the outfit is relaxed, keep the other half neat.',
    palette: ['sage', 'ivory', 'charcoal'],
    whyItWorks:
      'Balancing volume gives the eye a clear shape to follow. A cropped or tucked top shows where the waist is, so wide trousers look intentional rather than oversized.',
    principles: [
      'Pair volume with structure: one relaxed piece, one fitted or cropped.',
      'Mark the waist with a tuck or a shorter hem.',
      'Keep the palette quiet so the shape is the story.',
    ],
    tryWithWardrobe: 'Show me a balanced-proportion outfit from my wardrobe',
  },
  {
    id: 'one-accent',
    kicker: 'Principle · Focus',
    title: 'The case for one accent',
    dek: 'A neutral outfit with one point of colour lets that colour do all the talking.',
    palette: ['camel', 'ivory', 'charcoal', 'rose'],
    whyItWorks:
      'Neutrals give the eye somewhere to rest, so a single accent reads as a choice. Two or more accents start to compete.',
    principles: [
      'Build the base from neutrals you already wear often.',
      'Add exactly one accent: a dupatta, an overshirt, or a top.',
      'Place the accent near the face to draw attention upward.',
    ],
    tryWithWardrobe: 'Style a neutral outfit with one accent piece I own',
  },
];

export function findStory(id: string | undefined): Story | undefined {
  return SAMPLE_STORIES.find((story) => story.id === id);
}

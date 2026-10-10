import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import HomeRoute from '../app/(tabs)/index';
import ProfileRoute from '../app/(tabs)/profile';
import StylistRoute from '../app/(tabs)/stylist';
import WardrobeRoute from '../app/(tabs)/wardrobe';
import AddGarmentRoute from '../app/add-garment';
import ApiStatusRoute from '../app/dev/api-status';
import QuestionnaireRoute from '../app/questionnaire';
import StoryRoute from '../app/story/[id]';
import { SAMPLE_STORIES } from '../src/features/inspiration/sample-stories';

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeRoute,
  '(tabs)/wardrobe': WardrobeRoute,
  '(tabs)/stylist': StylistRoute,
  '(tabs)/profile': ProfileRoute,
  'story/[id]': StoryRoute,
  'add-garment': AddGarmentRoute,
  questionnaire: QuestionnaireRoute,
  'dev/api-status': ApiStatusRoute,
};

const leadStory = SAMPLE_STORIES[0]!;
const leadStoryLink = { name: `Sample story: ${leadStory.title}. ${leadStory.dek}` };

// React Native Testing Library 14 renders and fires events asynchronously, so both are awaited.
// renderRouter's result is itself a promise, so only its pathname accessor is returned (returning the
// result from an async function would unwrap it and drop the router helpers).
async function renderApp(initialUrl = '/') {
  const result = renderRouter(routes, { initialUrl });
  await result;
  return { getPathname: () => result.getPathname(), getRouterState: () => result.getRouterState() };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('primary navigation', () => {
  it('opens on Home with the four destinations in the tab bar', async () => {
    const router = await renderApp();

    expect(router.getPathname()).toBe('/');
    expect(screen.getByText(leadStory.title)).toBeTruthy();
    for (const name of ['Home', 'Wardrobe', 'Stylist', 'Profile']) {
      expect(screen.getByRole('tab', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('tab', { name: /try/i })).toBeNull();
  });

  it('moves between destinations from the tab bar', async () => {
    const router = await renderApp();

    await fireEvent.press(screen.getByRole('tab', { name: 'Wardrobe' }));
    expect(router.getPathname()).toBe('/wardrobe');
    expect(screen.getByRole('tab', { name: 'Wardrobe', selected: true })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Stylist' }));
    expect(router.getPathname()).toBe('/stylist');

    await fireEvent.press(screen.getByRole('tab', { name: 'Profile' }));
    expect(router.getPathname()).toBe('/profile');

    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    expect(router.getPathname()).toBe('/');
  });
});

describe('Home', () => {
  it('guides an empty wardrobe to adding a garment, and the preview closes back to Home', async () => {
    const router = await renderApp();

    await fireEvent.press(screen.getByRole('button', { name: 'Add your first garment' }));
    expect(router.getPathname()).toBe('/add-garment');
    expect(screen.getByText('Not available in this preview build yet.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(router.getPathname()).toBe('/');
  });

  it('opens a story and hands its idea to the Stylist', async () => {
    const router = await renderApp();

    await fireEvent.press(screen.getByRole('link', leadStoryLink));
    expect(router.getPathname()).toBe(`/story/${leadStory.id}`);
    expect(screen.getByText('Why it works')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Try this idea with my wardrobe' }));
    expect(router.getPathname()).toBe('/stylist');
    expect(screen.getByDisplayValue(leadStory.tryWithWardrobe)).toBeTruthy();
    // The handoff returns to the existing tabs: the story is dismissed, not left under a second tab navigator.
    const rootStack = router.getRouterState()?.routes[0]?.state; // routes[0] is expo-router's __root wrapper
    expect(rootStack?.routes.map((route) => route.name)).toEqual(['(tabs)']);
  });

  it('hands the same idea over again after the request was edited', async () => {
    await renderApp();
    const request = () => screen.getByLabelText('Describe what you need an outfit for');

    await fireEvent.press(screen.getByRole('link', leadStoryLink));
    await fireEvent.press(screen.getByRole('button', { name: 'Try this idea with my wardrobe' }));
    await fireEvent.changeText(request(), '');

    await fireEvent.press(screen.getByRole('tab', { name: 'Home' }));
    await fireEvent.press(screen.getByRole('link', leadStoryLink));
    await fireEvent.press(screen.getByRole('button', { name: 'Try this idea with my wardrobe' }));
    expect(request().props.value).toBe(leadStory.tryWithWardrobe);
  });
});

describe('Wardrobe', () => {
  it('filters by category and reflects the empty state for that category', async () => {
    await renderApp('/wardrobe');

    expect(screen.getByText('Nothing here yet.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Tops' }));

    expect(screen.getByRole('button', { name: 'Tops', selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All', selected: false })).toBeTruthy();
    expect(screen.getByText('No tops yet.')).toBeTruthy();
  });
});

describe('Stylist', () => {
  it('shows the chosen occasion as an ingredient and routes an empty wardrobe to adding garments', async () => {
    const router = await renderApp('/stylist');

    expect(screen.getByText('Empty. Add a few pieces to begin.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Festive' }));
    expect(screen.getByRole('button', { name: 'Festive', selected: true })).toBeTruthy();
    // Once as the chip, once as the occasion ingredient's status.
    expect(screen.getAllByText('Festive')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: 'Add garments to start' }));
    expect(router.getPathname()).toBe('/add-garment');
  });
});

describe('Profile', () => {
  it('labels the example profile and opens the questionnaire', async () => {
    const router = await renderApp('/profile');

    expect(screen.getByText("Your Style Profile isn't set yet.")).toBeTruthy();
    expect(screen.getByText('Example · not your profile')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Take the style questionnaire' }));
    expect(router.getPathname()).toBe('/questionnaire');
  });

  it('links to the developer API check in development builds, which reports a healthy API', async () => {
    const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

    try {
      const router = await renderApp('/profile');
      await fireEvent.press(screen.getByRole('button', { name: 'API connection check' }));

      expect(router.getPathname()).toBe('/dev/api-status');
      expect(await screen.findByText('API reachable')).toBeTruthy();
      expect(fetchMock).toHaveBeenCalledWith('http://api.test/v1/health');
    } finally {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    }
  });
});

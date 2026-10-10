import { Alert } from 'react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import TabsLayout from '../app/(tabs)/_layout';
import HomeRoute from '../app/(tabs)/index';
import ProfileRoute from '../app/(tabs)/profile';
import StylistRoute from '../app/(tabs)/stylist';
import WardrobeRoute from '../app/(tabs)/wardrobe';
import AddGarmentRoute from '../app/add-garment';
import ApiStatusRoute from '../app/dev/api-status';
import EditGarmentRoute from '../app/garment/[id]/edit';
import GarmentRoute from '../app/garment/[id]/index';
import QuestionnaireRoute from '../app/questionnaire';
import StoryRoute from '../app/story/[id]';
import { pickPhoto } from '../src/platform/photos';
import { installFakeApi, type FakeApi } from '../test-support/fake-api';

// The native picker is replaced; everything above it (form, upload handshake, API calls) is real.
jest.mock('../src/platform/photos', () => ({ pickPhoto: jest.fn() }));
const mockPickPhoto = jest.mocked(pickPhoto);

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeRoute,
  '(tabs)/wardrobe': WardrobeRoute,
  '(tabs)/stylist': StylistRoute,
  '(tabs)/profile': ProfileRoute,
  'add-garment': AddGarmentRoute,
  'garment/[id]/index': GarmentRoute,
  'garment/[id]/edit': EditGarmentRoute,
  // The rest of the app's routes, so the root layout's screen list matches (no extraneous-route warnings).
  'story/[id]': StoryRoute,
  questionnaire: QuestionnaireRoute,
  'dev/api-status': ApiStatusRoute,
};

// RNTL 14 renders asynchronously; renderRouter's result is itself a promise (see navigation.test.tsx).
async function renderApp(initialUrl: string) {
  const result = renderRouter(routes, { initialUrl });
  const rendered = await result;
  return { getPathname: () => result.getPathname(), unmount: () => rendered.unmount() };
}

let api: FakeApi;
beforeEach(() => {
  api = installFakeApi();
  mockPickPhoto.mockResolvedValue({ kind: 'picked', photo: { uri: 'file:///photos/shirt.jpg', mimeType: 'image/jpeg' } });
});
afterEach(() => {
  jest.restoreAllMocks();
  mockPickPhoto.mockReset();
});

const field = (label: string) => screen.getByLabelText(label);

async function addGarmentThroughForm({ name, color }: { name: string; color: string }) {
  await fireEvent.press(screen.getByRole('button', { name: 'Choose from library' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Top' }));
  await fireEvent.changeText(field('Name'), name);
  await fireEvent.changeText(field('Colour'), color);
  await fireEvent.press(screen.getByRole('button', { name: 'College' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save to wardrobe' }));
}

describe('wardrobe list', () => {
  it('shows saved garments from the API and filters them by category', async () => {
    api.seed({ category: 'top', name: 'White shirt' });
    api.seed({ category: 'bottom', name: 'Indigo jeans' });
    await renderApp('/wardrobe');

    expect(await screen.findByText('White shirt')).toBeTruthy();
    expect(screen.getByText('Indigo jeans')).toBeTruthy();
    expect(screen.getByText('2 pieces · clothing you own')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Bottoms' }));
    expect(screen.getByText('Indigo jeans')).toBeTruthy();
    expect(screen.queryByText('White shirt')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Dresses' }));
    expect(screen.getByText('No dresses yet.')).toBeTruthy();
  });

  it('offers no shoes category', async () => {
    await renderApp('/add-garment');
    expect(screen.queryByRole('button', { name: /shoe/i })).toBeNull();
  });

  it('shows an error with a working retry when the wardrobe cannot load', async () => {
    // The query retries once before reporting an error.
    api.fail('GET', /^\/v1\/garments$/, { times: 2 });
    api.seed({ category: 'layer', name: 'Denim jacket' });
    await renderApp('/wardrobe');

    // One retry with backoff comes first, so allow more than findBy's default second.
    expect(await screen.findByText("Couldn't load your wardrobe.", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.getByText('Something went wrong on our side.')).toBeTruthy();
    expect(screen.queryByText('Nothing here yet.')).toBeNull(); // never claims an empty wardrobe it couldn't load

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Denim jacket')).toBeTruthy();
  });

  it('explains a network failure without exposing internals', async () => {
    api.fail('GET', /^\/v1\/garments$/, { status: 0, times: 2 });
    await renderApp('/wardrobe');

    expect(
      await screen.findByText("Couldn't reach Fashion Saavy. Check your connection and try again.", {}, { timeout: 5000 }),
    ).toBeTruthy();
  });
});

describe('adding a garment', () => {
  it('uploads the photo, saves the garment, and shows it in the wardrobe', async () => {
    const router = await renderApp('/wardrobe');
    await fireEvent.press(await screen.findByRole('button', { name: 'Add a garment' }));
    expect(router.getPathname()).toBe('/add-garment');

    await addGarmentThroughForm({ name: 'White linen shirt', color: 'White' });

    expect(await screen.findByText('White linen shirt')).toBeTruthy();
    expect(router.getPathname()).toBe('/wardrobe');

    // Photo handshake first, then the garment referencing the uploaded image (never the image bytes).
    const [ticket, create] = api.calls.filter((call) => call.method === 'POST');
    expect(ticket).toMatchObject({ method: 'POST', path: '/v1/garment-images' });
    expect(create).toMatchObject({
      method: 'POST',
      path: '/v1/garments',
      body: { category: 'top', name: 'White linen shirt', attributes: { color: 'White', occasions: ['college'] } },
    });
    expect((create?.body as { imageId?: string }).imageId).toMatch(/^[0-9a-f-]{36}$/);
    expect([...api.garments.values()]).toHaveLength(1);
  });

  it('requires a photo and a category before saving', async () => {
    mockPickPhoto.mockResolvedValue({ kind: 'cancelled' });
    await renderApp('/add-garment');

    await fireEvent.press(screen.getByRole('button', { name: 'Save to wardrobe' }));

    expect(screen.getByText('Add a photo of the garment.')).toBeTruthy();
    expect(screen.getByText('Choose a category.')).toBeTruthy();
    expect(api.calls).toHaveLength(0);
  });

  it('keeps the form and shows a safe message when saving fails', async () => {
    api.fail('POST', /^\/v1\/garments$/, { status: 500, message: 'Something went wrong on our side.' });
    const router = await renderApp('/add-garment');

    await addGarmentThroughForm({ name: 'Kurta', color: 'Saffron' });

    expect(await screen.findByText('Something went wrong on our side.')).toBeTruthy();
    expect(router.getPathname()).toBe('/add-garment');
    expect(screen.getByDisplayValue('Kurta')).toBeTruthy(); // nothing typed is lost
    expect(api.garments.size).toBe(0);
  });

  it('explains when camera access is denied and offers the library instead', async () => {
    mockPickPhoto.mockResolvedValue({ kind: 'denied', canAskAgain: false });
    await renderApp('/add-garment');

    await fireEvent.press(screen.getByRole('button', { name: 'Take a photo' }));

    expect(screen.getByText(/Camera access is off/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeTruthy();
    expect(mockPickPhoto).toHaveBeenCalledWith('camera');
  });
});

describe('editing and deleting', () => {
  it('edits a garment and clears a removed attribute', async () => {
    const saved = api.seed({ category: 'top', name: 'Old name', attributes: { color: 'Blue', pattern: 'Striped' } });
    const router = await renderApp('/wardrobe');

    await fireEvent.press(await screen.findByRole('button', { name: 'Old name, Top' }));
    expect(router.getPathname()).toBe(`/garment/${saved.id}`);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit details' }));

    await fireEvent.changeText(field('Name'), 'New name');
    await fireEvent.changeText(field('Pattern'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('New name')).toBeTruthy();
    expect(router.getPathname()).toBe(`/garment/${saved.id}`);
    expect(api.garments.get(saved.id)).toMatchObject({ name: 'New name', attributes: { color: 'Blue' } });
    expect(api.garments.get(saved.id)?.attributes.pattern).toBeUndefined();
  });

  it('deletes a garment only after confirmation', async () => {
    const saved = api.seed({ category: 'dress', name: 'Silk dress' });
    const alert = jest.spyOn(Alert, 'alert');
    const router = await renderApp(`/garment/${saved.id}`);

    // First, cancel.
    alert.mockImplementationOnce((_title, _message, buttons) => buttons?.find((b) => b.style === 'cancel')?.onPress?.());
    await fireEvent.press(await screen.findByRole('button', { name: 'Delete garment' }));
    expect(api.garments.has(saved.id)).toBe(true);

    // Then confirm.
    alert.mockImplementationOnce((_title, _message, buttons) => buttons?.find((b) => b.style === 'destructive')?.onPress?.());
    await fireEvent.press(screen.getByRole('button', { name: 'Delete garment' }));

    expect(await screen.findByText('Nothing here yet.')).toBeTruthy();
    expect(router.getPathname()).toBe('/wardrobe');
    expect(api.garments.has(saved.id)).toBe(false);
  });

  it('says so when a garment no longer exists', async () => {
    await renderApp('/garment/00000000-0000-4000-8000-999999999999');
    expect(await screen.findByText('This garment is no longer in your wardrobe.')).toBeTruthy();
  });
});

describe('persistence', () => {
  it('still shows a saved garment after the app restarts', async () => {
    const first = await renderApp('/add-garment');
    await addGarmentThroughForm({ name: 'Survives restarts', color: 'Green' });
    expect(await screen.findByText('Survives restarts')).toBeTruthy();
    await first.unmount();

    // A fresh app: new component tree and a new, empty query cache. Only the API still holds the garment.
    await renderApp('/wardrobe');
    expect(await screen.findByText('Survives restarts')).toBeTruthy();
    expect(screen.getByText('1 piece · clothing you own')).toBeTruthy();
  });

  it('feeds the real garment count to Home and the Stylist', async () => {
    api.seed({ category: 'top', name: 'Tee' });
    await renderApp('/stylist');
    expect(await screen.findByText('1 piece to choose from')).toBeTruthy();
  });
});

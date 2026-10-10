import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '../app/_layout';
import FoundationScreen from '../app/index';
import ApiStatusScreen from '../app/status';

const routes = { _layout: RootLayout, index: FoundationScreen, status: ApiStatusScreen };

describe('app navigation', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test';
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    jest.restoreAllMocks();
  });

  // React Native Testing Library 14 renders and fires events asynchronously, so both are awaited.
  it('renders the entry screen', async () => {
    const router = renderRouter(routes, { initialUrl: '/' });
    await router;

    expect(router.getPathname()).toBe('/');
    expect(screen.getByText('Check API connection')).toBeTruthy();
  });

  it('navigates to the API connection check, which reports a healthy API', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

    const router = renderRouter(routes, { initialUrl: '/' });
    await router;
    await fireEvent.press(screen.getByText('Check API connection'));

    expect(router.getPathname()).toBe('/status');
    expect(await screen.findByText('API reachable')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/v1/health');
  });
});

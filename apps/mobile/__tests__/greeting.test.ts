import { greetingFor } from '../src/features/home/greeting';

const at = (hour: number) => new Date(2026, 9, 10, hour, 30);

describe('greetingFor', () => {
  it.each([
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
    [2, 'Good evening'],
  ])('at %i:30 says "%s"', (hour, expected) => {
    expect(greetingFor(at(hour))).toBe(expected);
  });
});

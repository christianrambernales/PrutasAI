import { canGoBack, currentRoute, initialNav, navReducer } from '../navState';

test('starts on the home tab with nothing pushed', () => {
  expect(initialNav).toEqual({ tab: 'home', stack: [] });
});

test('selecting a tab switches to it', () => {
  const next = navReducer(initialNav, { type: 'selectTab', tab: 'climate' });
  expect(next.tab).toBe('climate');
});

test('pushing a route puts it on top of the stack', () => {
  const next = navReducer(initialNav, { type: 'push', route: { name: 'settings' } });
  expect(next.stack).toEqual([{ name: 'settings' }]);
});

test('the current route is the top of the stack', () => {
  let state = navReducer(initialNav, { type: 'push', route: { name: 'settings' } });
  state = navReducer(state, { type: 'push', route: { name: 'modelStatus' } });
  expect(currentRoute(state)).toEqual({ name: 'modelStatus' });
});

test('there is no current route while a tab root is showing', () => {
  expect(currentRoute(initialNav)).toBeNull();
});

test('going back pops the top route', () => {
  let state = navReducer(initialNav, { type: 'push', route: { name: 'settings' } });
  state = navReducer(state, { type: 'push', route: { name: 'modelStatus' } });
  expect(currentRoute(navReducer(state, { type: 'back' }))).toEqual({ name: 'settings' });
});

test('going back at a tab root leaves the state untouched', () => {
  expect(navReducer(initialNav, { type: 'back' })).toBe(initialNav);
});

test('switching tabs drops any pushed detail screens', () => {
  const state = navReducer(initialNav, { type: 'push', route: { name: 'settings' } });
  expect(navReducer(state, { type: 'selectTab', tab: 'history' }).stack).toEqual([]);
});

test('back is only available once something is pushed', () => {
  expect(canGoBack(initialNav)).toBe(false);
  expect(canGoBack(navReducer(initialNav, { type: 'push', route: { name: 'capture' } }))).toBe(true);
});

test('routes carry the id the screen needs', () => {
  const state = navReducer(initialNav, {
    type: 'push',
    route: { name: 'varietyInfo', fruitKey: 'mango' },
  });
  expect(currentRoute(state)).toEqual({ name: 'varietyInfo', fruitKey: 'mango' });
});

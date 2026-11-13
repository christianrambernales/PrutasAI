import { canGoBack, currentRoute, initialNav, navReducer } from '../navState';

test('starts on the home tab with nothing pushed', () => {
  expect(initialNav).toEqual({ tab: 'home', stack: [] });
});

test('selecting a tab switches to it', () => {
  const next = navReducer(initialNav, { type: 'selectTab', tab: 'monitoring' });
  expect(next.tab).toBe('monitoring');
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

test('D-04: Detail Back pops exactly one route', () => {
  let state = navReducer(initialNav, { type: 'push', route: { name: 'settings' } });
  state = navReducer(state, { type: 'push', route: { name: 'modelStatus' } });
  expect(currentRoute(navReducer(state, { type: 'back' }))).toEqual({ name: 'settings' });
});

test('D-04: Home root unchanged, platform delegates via canGoBack false', () => {
  expect(navReducer(initialNav, { type: 'back' })).toBe(initialNav);
  expect(canGoBack(initialNav)).toBe(false);
});

test('D-04: non-Home root Back selects Home', () => {
  const state = navReducer(initialNav, { type: 'selectTab', tab: 'monitoring' });
  expect(navReducer(state, { type: 'back' })).toEqual(initialNav);
});

test('D-04: repeated Back without cycles returns to Home then exits', () => {
  let state = navReducer(initialNav, { type: 'selectTab', tab: 'monitoring' });
  state = navReducer(state, { type: 'push', route: { name: 'settings' } });
  
  // First back pops settings
  state = navReducer(state, { type: 'back' });
  expect(state).toEqual({ tab: 'monitoring', stack: [] });
  
  // Second back returns to home
  state = navReducer(state, { type: 'back' });
  expect(state).toEqual(initialNav);
  
  // Third back does nothing
  state = navReducer(state, { type: 'back' });
  expect(state).toBe(initialNav);
});

test('switching tabs drops any pushed detail screens', () => {
  const state = navReducer(initialNav, { type: 'push', route: { name: 'settings' } });
  expect(navReducer(state, { type: 'selectTab', tab: 'account' }).stack).toEqual([]);
});

test('routes carry the id the screen needs', () => {
  const state = navReducer(initialNav, {
    type: 'push',
    route: { name: 'varietyInfo', fruitKey: 'mango' },
  });
  expect(currentRoute(state)).toEqual({ name: 'varietyInfo', fruitKey: 'mango' });
});

test.each(['history', 'climate', 'login', 'forgotPassword'] as const)('%s is a detail destination and Back restores Home', name => {
  const state = navReducer(initialNav, { type: 'push', route: { name } });
  expect(currentRoute(state)).toEqual({ name });
  expect(navReducer(state, { type: 'back' })).toEqual(initialNav);
});

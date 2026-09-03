/**
 * Press-and-type helpers for screen tests.
 *
 * The original screen suite only ever asserted on rendered *text*, so a control
 * wired to `() => {}` — or to nothing at all — passed every test. These helpers
 * exist so a test can state what a press should *do*, which is the only kind of
 * assertion that catches a dead button.
 */

import { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';

/** Concatenated string content of an element's subtree. */
export function textOf(inst: ReactTestInstance): string {
  const out: string[] = [];
  const walk = (node: ReactTestInstance | string) => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    node.children.forEach(walk);
  };
  inst.children.forEach(walk);
  return out.join('');
}

/** Every element carrying an onPress handler, parents before children. */
export function pressables(tree: ReactTestRenderer): ReactTestInstance[] {
  return tree.root.findAll(n => n.props != null && typeof n.props.onPress === 'function', {
    deep: true,
  });
}

/**
 * Elements that *look* pressable — they declare a button/tab/switch role — so a
 * test can assert none of them is missing a handler.
 *
 * One entry per control, not per element. `Pressable` forwards
 * `accessibilityRole` down to the `View` and host view it renders while keeping
 * `onPress` for itself, so a role appears three times in a straight line and
 * only the outermost carries the handler.
 */
export function pressableRoles(tree: ReactTestRenderer): ReactTestInstance[] {
  const roles = ['button', 'tab', 'switch', 'link'];
  const withRole = tree.root.findAll(
    n => n.props != null && roles.includes(n.props.accessibilityRole),
    { deep: true },
  );
  return withRole.filter(n => n.parent?.props?.accessibilityRole !== n.props.accessibilityRole);
}

/**
 * The pressable matching `target`, preferring an exact accessibility label over
 * a text substring — otherwise "Mango" would match both the Mango fruit card
 * and the "Mango · Carabao" scan row, and the test would silently press the
 * wrong one.
 *
 * Within either group the deepest match wins, because our `Button` wraps a
 * `Pressable` carrying the same handler; picking consistently keeps failures
 * readable.
 */
export function findPressable(tree: ReactTestRenderer, target: string): ReactTestInstance {
  const all = pressables(tree);

  const labelled = all.filter(n => n.props.accessibilityLabel === target);
  if (labelled.length > 0) return labelled[labelled.length - 1];

  const byText = all.filter(n => textOf(n).includes(target));
  if (byText.length > 0) return byText[byText.length - 1];

  throw new Error(`no pressable matching ${JSON.stringify(target)}`);
}

export function press(tree: ReactTestRenderer, target: string): void {
  const found = findPressable(tree, target);
  act(() => {
    found.props.onPress();
  });
}

/** For handlers that await something — the camera shutter, the image picker. */
export async function pressAsync(tree: ReactTestRenderer, target: string): Promise<void> {
  const found = findPressable(tree, target);
  await act(async () => {
    await found.props.onPress();
  });
}

/** Text inputs, found by the handler every editable field must carry. */
export function textInputs(tree: ReactTestRenderer): ReactTestInstance[] {
  return tree.root.findAll(n => n.props != null && typeof n.props.onChangeText === 'function', {
    deep: true,
  });
}

export function typeInto(tree: ReactTestRenderer, placeholder: string, value: string): void {
  const field = textInputs(tree).find(n => String(n.props.placeholder ?? '').includes(placeholder));
  if (!field) {
    throw new Error(`no text input with placeholder containing ${JSON.stringify(placeholder)}`);
  }
  act(() => {
    field.props.onChangeText(value);
  });
}

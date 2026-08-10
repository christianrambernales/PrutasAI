/**
 * Minimal declarations for the renderer used by the screen smoke tests.
 * react-test-renderer ships no types, and @types/react-test-renderer is not
 * installed — the app deliberately carries no UI dependencies. Only the surface
 * the tests actually use is declared here.
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestRendererJSON {
    type: string;
    props: Record<string, unknown>;
    children: Array<ReactTestRendererJSON | string> | null;
  }

  export interface ReactTestRenderer {
    toJSON(): ReactTestRendererJSON | null;
    unmount(): void;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): void;

  const renderer: {
    create: typeof create;
    act: typeof act;
  };
  export default renderer;
}

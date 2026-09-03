/**
 * Minimal declarations for the renderer used by the screen and interaction
 * tests. react-test-renderer ships no types, and @types/react-test-renderer is
 * not installed — the app deliberately carries no UI dependencies. Only the
 * surface the tests actually use is declared here.
 */
declare module 'react-test-renderer' {
  import type { ReactElement } from 'react';

  export interface ReactTestRendererJSON {
    type: string;
    props: Record<string, unknown>;
    children: Array<ReactTestRendererJSON | string> | null;
  }

  /**
   * A node in the rendered tree. `props` is deliberately loose: the interaction
   * helpers read handlers and accessibility state off arbitrary components.
   */
  export interface ReactTestInstance {
    type: string | object;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: Record<string, any>;
    parent: ReactTestInstance | null;
    children: Array<ReactTestInstance | string>;
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findAll(
      predicate: (node: ReactTestInstance) => boolean,
      options?: { deep?: boolean },
    ): ReactTestInstance[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findAllByType(type: any): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    toJSON(): ReactTestRendererJSON | null;
    unmount(): void;
    root: ReactTestInstance;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): void;
  export function act(callback: () => Promise<void>): Promise<void>;

  const renderer: {
    create: typeof create;
    act: typeof act;
  };
  export default renderer;
}

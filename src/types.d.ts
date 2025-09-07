declare module 'node:sqlite' {
  export interface DatabaseSync {
    prepare(sql: string): {
      all: (...params: unknown[]) => unknown[];
      get: (...params: unknown[]) => unknown | undefined;
    };
    close(): void;
  }
  export const DatabaseSync: {
    new (file: string): DatabaseSync;
  };
}

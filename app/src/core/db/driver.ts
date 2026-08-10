export interface SqlDriver {
  exec(sql: string): void;
  all<T>(sql: string, params?: unknown[]): T[];
  get<T>(sql: string, params?: unknown[]): T | undefined;
}

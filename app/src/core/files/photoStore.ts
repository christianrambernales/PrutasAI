export interface PhotoStore {
  /**
   * Copies the source to app-owned persistent storage and returns a displayable
   * URI. On web, the returned data URI is persisted with its local SQLite row.
   */
  copyToOwned(sourceUri: string): Promise<string>;

  /**
   * Deletes the app-owned photo at the given URI when stored separately.
   * Tolerates if the photo is already gone or owned by its SQLite row.
   */
  deleteOwned(ownedUri: string): Promise<void>;

  /**
   * Scans the owned directory for files not present in the given referencedURIs set,
   * and deletes them. Returns the number of orphaned files deleted.
   */
  cleanupOrphans(referencedURIs: Set<string>): Promise<number>;
}

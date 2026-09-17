export interface PhotoStore {
  /**
   * Copies the given source URI to an app-owned persistent location.
   * Returns the app-owned URI.
   */
  copyToOwned(sourceUri: string): Promise<string>;

  /**
   * Deletes the app-owned file at the given URI.
   * Tolerates if the file is already gone.
   */
  deleteOwned(ownedUri: string): Promise<void>;

  /**
   * Scans the owned directory for files not present in the given referencedURIs set,
   * and deletes them. Returns the number of orphaned files deleted.
   */
  cleanupOrphans(referencedURIs: Set<string>): Promise<number>;
}

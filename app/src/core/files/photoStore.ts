export interface PhotoStore {
  /**
   * Copies the given source URI to an app-owned persistent location.
   * Returns the app-owned URI.
   */
  copyToOwned(sourceUri: string): Promise<string>;

  /**
   * Deletes the app-owned file at the given URI.
   */
  deleteOwned(ownedUri: string): Promise<void>;
}

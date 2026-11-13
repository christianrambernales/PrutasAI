import type { PhotoStore } from './photoStore';

/**
 * Web SQLite already persists scan and checkpoint rows in the browser. Keeping
 * the photo as a data URI in that same local row makes it available after a
 * reload without relying on expo-file-system's native-only document directory.
 */
export class ExpoPhotoStore implements PhotoStore {
  async copyToOwned(sourceUri: string): Promise<string> {
    const response = await fetch(sourceUri);
    if (!response.ok) {
      throw new Error('Could not read the selected photo.');
    }
    const photo = await response.blob();
    if (!photo.type.startsWith('image/')) {
      throw new Error('Selected file is not an image.');
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the selected photo.'));
      reader.onload = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
          resolve(reader.result);
        } else {
          reject(new Error('Could not encode the selected photo.'));
        }
      };
      reader.readAsDataURL(photo);
    });
  }

  async deleteOwned(ownedUri: string): Promise<void> {
    if (!ownedUri.startsWith('data:image/')) {
      throw new Error('Cannot delete a photo outside web-owned storage.');
    }
    // The data is owned by its SQLite row and is removed with that row.
  }

  async cleanupOrphans(_referencedURIs: Set<string>): Promise<number> {
    // Web photos have no separate directory in which orphans can accumulate.
    return 0;
  }
}

import * as FileSystem from 'expo-file-system/legacy';
import { PhotoStore } from './photoStore';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

export function photoExtensionFromUri(sourceUri: string): string {
  const path = sourceUri.split(/[?#]/, 1)[0];
  const match = path.match(/\.([a-z0-9]{1,5})$/i);
  const extension = match?.[1].toLowerCase();
  return extension && ALLOWED_EXTENSIONS.has(extension) ? `.${extension}` : '.jpg';
}

function photosDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('Persistent document storage is unavailable on this platform.');
  }
  return `${FileSystem.documentDirectory}photos/`;
}

export class ExpoPhotoStore implements PhotoStore {
  private async ensureDir() {
    const photosDir = photosDirectory();
    const dirInfo = await FileSystem.getInfoAsync(photosDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true });
    }
    return photosDir;
  }

  async copyToOwned(sourceUri: string): Promise<string> {
    const photosDir = await this.ensureDir();
    const ext = photoExtensionFromUri(sourceUri);
    const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
    const destinationUri = `${photosDir}${filename}`;
    
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });
    
    return destinationUri;
  }

  async deleteOwned(ownedUri: string): Promise<void> {
    const photosDir = photosDirectory();
    if (!ownedUri.startsWith(photosDir)) {
      throw new Error(`Cannot delete file outside owned directory: ${ownedUri}`);
    }
    const info = await FileSystem.getInfoAsync(ownedUri);
    if (info.exists) {
      await FileSystem.deleteAsync(ownedUri);
    }
  }

  async cleanupOrphans(referencedURIs: Set<string>): Promise<number> {
    const photosDir = await this.ensureDir();
    const files = await FileSystem.readDirectoryAsync(photosDir);
    let deleted = 0;
    for (const filename of files) {
      const uri = `${photosDir}${filename}`;
      if (!referencedURIs.has(uri)) {
        await FileSystem.deleteAsync(uri);
        deleted += 1;
      }
    }
    return deleted;
  }
}

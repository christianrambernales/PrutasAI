import * as FileSystem from 'expo-file-system';
import { PhotoStore } from './photoStore';
import * as crypto from 'crypto';

const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

export class ExpoPhotoStore implements PhotoStore {
  private async ensureDir() {
    const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
    }
  }

  async copyToOwned(sourceUri: string): Promise<string> {
    await this.ensureDir();
    // Using randomUUID for a unique filename, preserving the extension if present.
    // However, crypto.randomUUID() might not be available in React Native.
    // We can use a combination of Date.now() and Math.random() as fallback
    // Or just a simple string for now.
    const ext = sourceUri.substring(sourceUri.lastIndexOf('.')) || '.jpg';
    const filename = `${Date.now()}-${Math.floor(Math.random() * 10000)}${ext}`;
    const destinationUri = `${PHOTOS_DIR}${filename}`;
    
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });
    
    return destinationUri;
  }

  async deleteOwned(ownedUri: string): Promise<void> {
    if (!ownedUri.startsWith(PHOTOS_DIR)) {
      throw new Error(`Cannot delete file outside owned directory: ${ownedUri}`);
    }
    const info = await FileSystem.getInfoAsync(ownedUri);
    if (info.exists) {
      await FileSystem.deleteAsync(ownedUri);
    }
  }
}

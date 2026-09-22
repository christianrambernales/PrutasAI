import { photoExtensionFromUri } from '../expoPhotoStore';

describe('photoExtensionFromUri', () => {
  test.each([
    ['file:///camera/photo.JPG?edited=1', '.jpg'],
    ['content://media/external/images/123', '.jpg'],
    ['file:///picker/photo.png', '.png'],
    ['file:///picker/archive.tar.gz', '.jpg'],
  ])('maps %s to a safe owned extension', (uri, expected) => {
    expect(photoExtensionFromUri(uri)).toBe(expected);
  });
});

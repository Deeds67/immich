import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  findOsxphotosSidecar,
  getAlbumNameFromAppleExport,
  pairAppleLivePhoto,
  parseOsxphotosMetadata,
} from 'src/importers/apple-photos';
import {
  findGoogleTakeoutSidecar,
  getAlbumNameFromTakeout,
  pairLivePhoto,
  parseGoogleTakeoutMetadata,
} from 'src/importers/google-takeout';

/**
 * Helper to create a realistic Google Takeout directory structure:
 *
 * Takeout/
 *   Google Photos/
 *     Album1/
 *       photo1.jpg
 *       photo1.jpg.json
 *       video1.mp4
 *       video1.mp4.json
 *     Photos from 2023/
 *       IMG_001.jpg
 *       IMG_001.jpg.json
 *     Album with truncated names/
 *       a_very_long_filename_that_exceeds_the_limit_of_47_characters.jpg
 *       a_very_long_filename_that_exceeds_the_limit_of_.json
 */
const createTakeoutStructure = (rootDir: string) => {
  const takeoutRoot = path.join(rootDir, 'Takeout', 'Google Photos');

  // Album1 with a favorited photo + live photo pair
  const album1Dir = path.join(takeoutRoot, 'Summer Vacation 2023');
  fs.mkdirSync(album1Dir, { recursive: true });

  fs.writeFileSync(path.join(album1Dir, 'sunset.jpg'), 'photo-data');
  fs.writeFileSync(
    path.join(album1Dir, 'sunset.jpg.json'),
    JSON.stringify({
      title: 'sunset.jpg',
      description: 'Beautiful sunset',
      photoTakenTime: { timestamp: '1690000000' },
      geoData: { latitude: 34.0195, longitude: -118.4912, altitude: 0 },
      favorited: true,
      archived: false,
    }),
  );

  // Live photo pair in album
  fs.writeFileSync(path.join(album1Dir, 'live_photo.jpg'), 'live-photo-data');
  fs.writeFileSync(path.join(album1Dir, 'live_photo.mp4'), 'live-video-data');
  fs.writeFileSync(
    path.join(album1Dir, 'live_photo.jpg.json'),
    JSON.stringify({
      title: 'live_photo.jpg',
      photoTakenTime: { timestamp: '1690001000' },
      favorited: false,
    }),
  );

  // Photos from 2023 (should NOT be an album)
  const dateDir = path.join(takeoutRoot, 'Photos from 2023');
  fs.mkdirSync(dateDir, { recursive: true });

  fs.writeFileSync(path.join(dateDir, 'IMG_001.jpg'), 'img-data');
  fs.writeFileSync(
    path.join(dateDir, 'IMG_001.jpg.json'),
    JSON.stringify({
      title: 'IMG_001.jpg',
      photoTakenTime: { timestamp: '1672531200' },
      geoData: { latitude: 0, longitude: 0, altitude: 0 },
      favorited: false,
      archived: true,
    }),
  );

  // Truncated filename album
  const truncAlbum = path.join(takeoutRoot, 'Long Names Album');
  fs.mkdirSync(truncAlbum, { recursive: true });

  const longName = 'a_very_long_filename_that_exceeds_the_limit_of_47_characters.jpg';
  const truncatedName = 'a_very_long_filename_that_exceeds_the_limit_of_';
  fs.writeFileSync(path.join(truncAlbum, longName), 'truncated-data');
  fs.writeFileSync(
    path.join(truncAlbum, `${truncatedName}.json`),
    JSON.stringify({
      title: longName,
      photoTakenTime: { timestamp: '1690002000' },
    }),
  );

  return takeoutRoot;
};

/**
 * Helper to create an Apple Photos export structure:
 *
 * Export/
 *   Summer Trip/
 *     IMG_1234.HEIC
 *     IMG_1234.HEIC.json
 *     IMG_1234.MOV  (live photo)
 *   Favorites/
 *     IMG_5678.JPG
 *     IMG_5678.json
 */
const createApplePhotosStructure = (rootDir: string) => {
  const exportRoot = path.join(rootDir, 'Export');

  // Album with live photo
  const album1Dir = path.join(exportRoot, 'Summer Trip');
  fs.mkdirSync(album1Dir, { recursive: true });

  fs.writeFileSync(path.join(album1Dir, 'IMG_1234.HEIC'), 'heic-data');
  fs.writeFileSync(path.join(album1Dir, 'IMG_1234.MOV'), 'mov-data');
  fs.writeFileSync(
    path.join(album1Dir, 'IMG_1234.HEIC.json'),
    JSON.stringify({
      title: 'Beach Photo',
      description: 'At the beach',
      favorite: true,
      date: '2023-07-15T18:30:00',
      latitude: 34.0195,
      longitude: -118.4912,
      keywords: ['vacation', 'beach'],
      albums: ['Summer Trip'],
      persons: ['Alice'],
    }),
  );

  // Album with regular photo
  const album2Dir = path.join(exportRoot, 'Favorites');
  fs.mkdirSync(album2Dir, { recursive: true });

  fs.writeFileSync(path.join(album2Dir, 'IMG_5678.JPG'), 'jpg-data');
  fs.writeFileSync(
    path.join(album2Dir, 'IMG_5678.json'),
    JSON.stringify({
      title: 'Park Photo',
      favorite: false,
      date: '2023-08-20T10:00:00',
    }),
  );

  return exportRoot;
};

describe('Google Takeout end-to-end scenarios', () => {
  let testDir: string;
  let takeoutRoot: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-e2e-takeout-'));
    takeoutRoot = createTakeoutStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should process a full album with metadata, favorites, and GPS', async () => {
    const photoPath = path.join(takeoutRoot, 'Summer Vacation 2023', 'sunset.jpg');

    // Find sidecar
    const sidecar = findGoogleTakeoutSidecar(photoPath);
    expect(sidecar).toBeDefined();

    // Parse metadata
    const metadata = await parseGoogleTakeoutMetadata(sidecar!);
    expect(metadata).toBeDefined();
    expect(metadata!.title).toBe('sunset.jpg');
    expect(metadata!.description).toBe('Beautiful sunset');
    expect(metadata!.isFavorite).toBe(true);
    expect(metadata!.isArchived).toBe(false);
    expect(metadata!.dateTimeOriginal).toEqual(new Date(1_690_000_000_000));
    expect(metadata!.latitude).toBe(34.0195);
    expect(metadata!.longitude).toBe(-118.4912);

    // Extract album name
    const albumName = getAlbumNameFromTakeout(photoPath, takeoutRoot);
    expect(albumName).toBe('Summer Vacation 2023');
  });

  it('should pair live photos in album context', () => {
    const albumDir = path.join(takeoutRoot, 'Summer Vacation 2023');
    const photoPath = path.join(albumDir, 'live_photo.jpg');
    const videoPath = path.join(albumDir, 'live_photo.mp4');

    const allFiles = [path.join(albumDir, 'sunset.jpg'), photoPath, videoPath];

    expect(pairLivePhoto(photoPath, allFiles)).toBe(videoPath);
    // Video should not pair back to photo
    expect(pairLivePhoto(videoPath, allFiles)).toBeUndefined();
  });

  it('should filter out Photos from YYYY as non-album', async () => {
    const photoPath = path.join(takeoutRoot, 'Photos from 2023', 'IMG_001.jpg');

    const albumName = getAlbumNameFromTakeout(photoPath, takeoutRoot);
    expect(albumName).toBeUndefined();

    // But metadata should still be parsed correctly
    const sidecar = findGoogleTakeoutSidecar(photoPath);
    const metadata = await parseGoogleTakeoutMetadata(sidecar!);
    expect(metadata!.isArchived).toBe(true);
    // (0,0) GPS should be treated as no location
    expect(metadata!.latitude).toBeUndefined();
    expect(metadata!.longitude).toBeUndefined();
  });

  it('should handle truncated filenames end-to-end', async () => {
    const longName = 'a_very_long_filename_that_exceeds_the_limit_of_47_characters.jpg';
    const photoPath = path.join(takeoutRoot, 'Long Names Album', longName);

    const sidecar = findGoogleTakeoutSidecar(photoPath);
    expect(sidecar).toBeDefined();

    const metadata = await parseGoogleTakeoutMetadata(sidecar!);
    expect(metadata).toBeDefined();
    expect(metadata!.title).toBe(longName);

    const albumName = getAlbumNameFromTakeout(photoPath, takeoutRoot);
    expect(albumName).toBe('Long Names Album');
  });

  it('should be idempotent — parsing same sidecar twice returns same result', async () => {
    const photoPath = path.join(takeoutRoot, 'Summer Vacation 2023', 'sunset.jpg');
    const sidecar = findGoogleTakeoutSidecar(photoPath)!;

    const result1 = await parseGoogleTakeoutMetadata(sidecar);
    const result2 = await parseGoogleTakeoutMetadata(sidecar);

    expect(result1).toEqual(result2);
  });

  it('should be idempotent — finding sidecar twice returns same path', () => {
    const photoPath = path.join(takeoutRoot, 'Summer Vacation 2023', 'sunset.jpg');

    const sidecar1 = findGoogleTakeoutSidecar(photoPath);
    const sidecar2 = findGoogleTakeoutSidecar(photoPath);

    expect(sidecar1).toBe(sidecar2);
  });

  it('should gracefully handle a photo with missing sidecar', async () => {
    // Create a photo without a corresponding JSON sidecar
    const orphanPath = path.join(takeoutRoot, 'Summer Vacation 2023', 'orphan.jpg');
    fs.writeFileSync(orphanPath, 'orphan-data');

    const sidecar = findGoogleTakeoutSidecar(orphanPath);
    expect(sidecar).toBeUndefined();

    // Album extraction still works without sidecar
    const albumName = getAlbumNameFromTakeout(orphanPath, takeoutRoot);
    expect(albumName).toBe('Summer Vacation 2023');
  });

  it('should gracefully handle corrupted sidecar JSON', async () => {
    const corruptedDir = path.join(takeoutRoot, 'Corrupted');
    fs.mkdirSync(corruptedDir, { recursive: true });

    fs.writeFileSync(path.join(corruptedDir, 'bad.jpg'), 'photo');
    fs.writeFileSync(path.join(corruptedDir, 'bad.jpg.json'), '{invalid json!!!');

    const sidecar = findGoogleTakeoutSidecar(path.join(corruptedDir, 'bad.jpg'));
    expect(sidecar).toBeDefined();

    const metadata = await parseGoogleTakeoutMetadata(sidecar!);
    expect(metadata).toBeUndefined();
  });

  it('should handle an empty JSON sidecar object', async () => {
    const emptyDir = path.join(takeoutRoot, 'Empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    fs.writeFileSync(path.join(emptyDir, 'empty.jpg'), 'photo');
    fs.writeFileSync(path.join(emptyDir, 'empty.jpg.json'), '{}');

    const sidecar = findGoogleTakeoutSidecar(path.join(emptyDir, 'empty.jpg'));
    const metadata = await parseGoogleTakeoutMetadata(sidecar!);

    expect(metadata).toBeDefined();
    expect(metadata!.title).toBe('empty.jpg'); // Falls back to filename
    expect(metadata!.isFavorite).toBe(false);
    expect(metadata!.isArchived).toBe(false);
    expect(metadata!.dateTimeOriginal).toBeUndefined();
    expect(metadata!.latitude).toBeUndefined();
  });

  it('should process multiple albums without cross-contamination', () => {
    const photo1 = path.join(takeoutRoot, 'Summer Vacation 2023', 'sunset.jpg');
    const photo2 = path.join(
      takeoutRoot,
      'Long Names Album',
      'a_very_long_filename_that_exceeds_the_limit_of_47_characters.jpg',
    );
    const photo3 = path.join(takeoutRoot, 'Photos from 2023', 'IMG_001.jpg');

    expect(getAlbumNameFromTakeout(photo1, takeoutRoot)).toBe('Summer Vacation 2023');
    expect(getAlbumNameFromTakeout(photo2, takeoutRoot)).toBe('Long Names Album');
    expect(getAlbumNameFromTakeout(photo3, takeoutRoot)).toBeUndefined();
  });

  it('should not pair live photos across different albums', () => {
    // Create same-named files in different albums
    const album1Dir = path.join(takeoutRoot, 'Summer Vacation 2023');
    const album2Dir = path.join(takeoutRoot, 'Long Names Album');

    fs.writeFileSync(path.join(album2Dir, 'live_photo.mp4'), 'video-in-other-album');

    const allFiles = [
      path.join(album1Dir, 'live_photo.jpg'),
      path.join(album1Dir, 'live_photo.mp4'),
      path.join(album2Dir, 'live_photo.mp4'),
    ];

    // Should only pair with the video in the SAME directory
    const result = pairLivePhoto(path.join(album1Dir, 'live_photo.jpg'), allFiles);
    expect(result).toBe(path.join(album1Dir, 'live_photo.mp4'));
  });
});

describe('Apple Photos end-to-end scenarios', () => {
  let testDir: string;
  let exportRoot: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-e2e-apple-'));
    exportRoot = createApplePhotosStructure(testDir);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should process a full album with live photo, metadata, and GPS', async () => {
    const albumDir = path.join(exportRoot, 'Summer Trip');
    const photoPath = path.join(albumDir, 'IMG_1234.HEIC');

    // Find sidecar
    const sidecar = findOsxphotosSidecar(photoPath);
    expect(sidecar).toBeDefined();

    // Parse metadata
    const metadata = await parseOsxphotosMetadata(sidecar!);
    expect(metadata).toBeDefined();
    expect(metadata!.title).toBe('Beach Photo');
    expect(metadata!.description).toBe('At the beach');
    expect(metadata!.isFavorite).toBe(true);
    expect(metadata!.dateTimeOriginal).toEqual(new Date('2023-07-15T18:30:00'));
    expect(metadata!.latitude).toBe(34.0195);
    expect(metadata!.longitude).toBe(-118.4912);
    expect(metadata!.keywords).toEqual(['vacation', 'beach']);
    expect(metadata!.albums).toEqual(['Summer Trip']);
    expect(metadata!.persons).toEqual(['Alice']);

    // Extract album name
    expect(getAlbumNameFromAppleExport(photoPath)).toBe('Summer Trip');

    // Pair live photo
    const allFiles = [photoPath, path.join(albumDir, 'IMG_1234.MOV')];
    expect(pairAppleLivePhoto(photoPath, allFiles)).toBe(path.join(albumDir, 'IMG_1234.MOV'));
  });

  it('should handle a non-favorite photo without GPS', async () => {
    const photoPath = path.join(exportRoot, 'Favorites', 'IMG_5678.JPG');

    const sidecar = findOsxphotosSidecar(photoPath);
    expect(sidecar).toBeDefined();

    const metadata = await parseOsxphotosMetadata(sidecar!);
    expect(metadata!.isFavorite).toBe(false);
    expect(metadata!.latitude).toBeUndefined();
    expect(metadata!.longitude).toBeUndefined();
    expect(metadata!.keywords).toEqual([]);
    expect(metadata!.persons).toEqual([]);
  });

  it('should be idempotent — parsing same sidecar twice returns same result', async () => {
    const photoPath = path.join(exportRoot, 'Summer Trip', 'IMG_1234.HEIC');
    const sidecar = findOsxphotosSidecar(photoPath)!;

    const result1 = await parseOsxphotosMetadata(sidecar);
    const result2 = await parseOsxphotosMetadata(sidecar);

    expect(result1).toEqual(result2);
  });

  it('should be idempotent — finding sidecar twice returns same path', () => {
    const photoPath = path.join(exportRoot, 'Summer Trip', 'IMG_1234.HEIC');

    const sidecar1 = findOsxphotosSidecar(photoPath);
    const sidecar2 = findOsxphotosSidecar(photoPath);

    expect(sidecar1).toBe(sidecar2);
  });

  it('should gracefully handle photo without sidecar', () => {
    const orphanPath = path.join(exportRoot, 'Summer Trip', 'orphan.HEIC');
    fs.writeFileSync(orphanPath, 'orphan-data');

    expect(findOsxphotosSidecar(orphanPath)).toBeUndefined();
    // Album extraction still works
    expect(getAlbumNameFromAppleExport(orphanPath)).toBe('Summer Trip');
  });

  it('should gracefully handle corrupted sidecar JSON', async () => {
    const corruptedDir = path.join(exportRoot, 'Corrupted');
    fs.mkdirSync(corruptedDir, { recursive: true });

    fs.writeFileSync(path.join(corruptedDir, 'bad.HEIC'), 'photo');
    fs.writeFileSync(path.join(corruptedDir, 'bad.HEIC.json'), 'NOT_JSON!!!{{{');

    const sidecar = findOsxphotosSidecar(path.join(corruptedDir, 'bad.HEIC'));
    expect(sidecar).toBeDefined();

    const metadata = await parseOsxphotosMetadata(sidecar!);
    expect(metadata).toBeUndefined();
  });

  it('should handle an empty JSON sidecar object', async () => {
    const emptyDir = path.join(exportRoot, 'Empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    fs.writeFileSync(path.join(emptyDir, 'empty.HEIC'), 'photo');
    fs.writeFileSync(path.join(emptyDir, 'empty.HEIC.json'), '{}');

    const sidecar = findOsxphotosSidecar(path.join(emptyDir, 'empty.HEIC'));
    const metadata = await parseOsxphotosMetadata(sidecar!);

    expect(metadata).toBeDefined();
    expect(metadata!.title).toBeUndefined();
    expect(metadata!.isFavorite).toBe(false);
    expect(metadata!.dateTimeOriginal).toBeUndefined();
    expect(metadata!.keywords).toEqual([]);
    expect(metadata!.albums).toEqual([]);
    expect(metadata!.persons).toEqual([]);
  });

  it('should not pair live photos across albums', () => {
    const album1Dir = path.join(exportRoot, 'Summer Trip');
    const album2Dir = path.join(exportRoot, 'Favorites');

    fs.writeFileSync(path.join(album2Dir, 'IMG_1234.MOV'), 'mov-in-other-album');

    const allFiles = [
      path.join(album1Dir, 'IMG_1234.HEIC'),
      path.join(album1Dir, 'IMG_1234.MOV'),
      path.join(album2Dir, 'IMG_1234.MOV'),
    ];

    const result = pairAppleLivePhoto(path.join(album1Dir, 'IMG_1234.HEIC'), allFiles);
    expect(result).toBe(path.join(album1Dir, 'IMG_1234.MOV'));
  });

  it('should process multiple albums independently', () => {
    const photo1 = path.join(exportRoot, 'Summer Trip', 'IMG_1234.HEIC');
    const photo2 = path.join(exportRoot, 'Favorites', 'IMG_5678.JPG');

    expect(getAlbumNameFromAppleExport(photo1)).toBe('Summer Trip');
    expect(getAlbumNameFromAppleExport(photo2)).toBe('Favorites');
  });
});

describe('Cross-importer edge cases', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-e2e-cross-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should handle a file with both Google Takeout and osxphotos sidecars', async () => {
    // If someone has both formats, each function only finds its own
    fs.writeFileSync(path.join(testDir, 'photo.jpg'), 'photo');
    fs.writeFileSync(
      path.join(testDir, 'photo.jpg.json'),
      JSON.stringify({
        title: 'photo.jpg',
        photoTakenTime: { timestamp: '1690000000' },
        favorited: true,
      }),
    );

    const mediaPath = path.join(testDir, 'photo.jpg');

    // Google Takeout finds it
    const takeoutSidecar = findGoogleTakeoutSidecar(mediaPath);
    expect(takeoutSidecar).toBeDefined();
    const takeoutMeta = await parseGoogleTakeoutMetadata(takeoutSidecar!);
    expect(takeoutMeta!.isFavorite).toBe(true);

    // osxphotos also finds it (same file, different parser)
    const osxSidecar = findOsxphotosSidecar(mediaPath);
    expect(osxSidecar).toBeDefined();
    // osxphotos parser would interpret differently since it expects 'favorite' not 'favorited'
    const osxMeta = await parseOsxphotosMetadata(osxSidecar!);
    expect(osxMeta!.isFavorite).toBe(false); // 'favorited' is not 'favorite'
  });

  it('should handle unicode filenames', async () => {
    fs.writeFileSync(path.join(testDir, '日本語.jpg'), 'photo');
    fs.writeFileSync(
      path.join(testDir, '日本語.jpg.json'),
      JSON.stringify({
        title: '日本語.jpg',
        photoTakenTime: { timestamp: '1690000000' },
      }),
    );

    const sidecar = findGoogleTakeoutSidecar(path.join(testDir, '日本語.jpg'));
    expect(sidecar).toBeDefined();

    const metadata = await parseGoogleTakeoutMetadata(sidecar!);
    expect(metadata!.title).toBe('日本語.jpg');
  });

  it('should handle filenames with spaces', async () => {
    fs.writeFileSync(path.join(testDir, 'my vacation photo.jpg'), 'photo');
    fs.writeFileSync(
      path.join(testDir, 'my vacation photo.jpg.json'),
      JSON.stringify({
        title: 'my vacation photo.jpg',
        photoTakenTime: { timestamp: '1690000000' },
      }),
    );

    const sidecar = findGoogleTakeoutSidecar(path.join(testDir, 'my vacation photo.jpg'));
    expect(sidecar).toBeDefined();

    const metadata = await parseGoogleTakeoutMetadata(sidecar!);
    expect(metadata!.title).toBe('my vacation photo.jpg');
  });

  it('should handle empty allFiles list for live photo pairing', () => {
    const photoPath = path.join(testDir, 'IMG_1234.jpg');
    fs.writeFileSync(photoPath, 'photo');

    expect(pairLivePhoto(photoPath, [])).toBeUndefined();
    expect(pairAppleLivePhoto(photoPath, [])).toBeUndefined();
  });

  it('should handle a photo that is only in the allFiles list (no other files)', () => {
    const photoPath = path.join(testDir, 'IMG_1234.jpg');
    fs.writeFileSync(photoPath, 'photo');

    expect(pairLivePhoto(photoPath, [photoPath])).toBeUndefined();
    expect(pairAppleLivePhoto(photoPath, [photoPath])).toBeUndefined();
  });

  it('should not confuse RAW files with their JPEG counterparts for live photo pairing', () => {
    // A directory with DSC_0001.jpg, DSC_0001.NEF, and DSC_0001.mp4
    // Only the .jpg should pair with .mp4
    const jpgPath = path.join(testDir, 'DSC_0001.jpg');
    const nefPath = path.join(testDir, 'DSC_0001.NEF');
    const mp4Path = path.join(testDir, 'DSC_0001.mp4');
    fs.writeFileSync(jpgPath, 'jpg');
    fs.writeFileSync(nefPath, 'raw');
    fs.writeFileSync(mp4Path, 'video');

    const allFiles = [jpgPath, nefPath, mp4Path];

    expect(pairLivePhoto(jpgPath, allFiles)).toBe(mp4Path);
    // NEF is not in the PHOTO_EXTENSIONS set, so it shouldn't pair
    expect(pairLivePhoto(nefPath, allFiles)).toBeUndefined();
  });

  it('should handle concurrent calls to parseGoogleTakeoutMetadata on same file', async () => {
    const jsonPath = path.join(testDir, 'photo.jpg.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'photo.jpg',
        photoTakenTime: { timestamp: '1690000000' },
        favorited: true,
      }),
    );

    // Simulate concurrent parsing
    const [result1, result2, result3] = await Promise.all([
      parseGoogleTakeoutMetadata(jsonPath),
      parseGoogleTakeoutMetadata(jsonPath),
      parseGoogleTakeoutMetadata(jsonPath),
    ]);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('should handle concurrent calls to parseOsxphotosMetadata on same file', async () => {
    const jsonPath = path.join(testDir, 'IMG.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'Photo',
        favorite: true,
        date: '2023-07-15T18:30:00',
      }),
    );

    const [result1, result2, result3] = await Promise.all([
      parseOsxphotosMetadata(jsonPath),
      parseOsxphotosMetadata(jsonPath),
      parseOsxphotosMetadata(jsonPath),
    ]);

    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('should handle sidecar with only geoDataExif (no geoData)', async () => {
    const jsonPath = path.join(testDir, 'photo.jpg.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'photo.jpg',
        photoTakenTime: { timestamp: '1690000000' },
        geoDataExif: { latitude: 40.7128, longitude: -74.006, altitude: 0 },
      }),
    );

    const metadata = await parseGoogleTakeoutMetadata(jsonPath);
    expect(metadata!.latitude).toBe(40.7128);
    expect(metadata!.longitude).toBe(-74.006);
  });

  it('should handle negative GPS coordinates correctly', async () => {
    const jsonPath = path.join(testDir, 'photo.jpg.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'photo.jpg',
        photoTakenTime: { timestamp: '1690000000' },
        geoData: { latitude: -33.8688, longitude: 151.2093, altitude: 0 },
      }),
    );

    const metadata = await parseGoogleTakeoutMetadata(jsonPath);
    expect(metadata!.latitude).toBe(-33.8688);
    expect(metadata!.longitude).toBe(151.2093);
  });

  it('should handle Apple Photos export with negative GPS coordinates', async () => {
    const jsonPath = path.join(testDir, 'IMG.HEIC.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'Sydney Opera House',
        date: '2023-07-15T18:30:00',
        latitude: -33.8568,
        longitude: 151.2153,
      }),
    );

    const metadata = await parseOsxphotosMetadata(jsonPath);
    expect(metadata!.latitude).toBe(-33.8568);
    expect(metadata!.longitude).toBe(151.2153);
  });

  it('should handle timestamp at epoch zero', async () => {
    const jsonPath = path.join(testDir, 'old.jpg.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'old.jpg',
        photoTakenTime: { timestamp: '0' },
      }),
    );

    const metadata = await parseGoogleTakeoutMetadata(jsonPath);
    expect(metadata!.dateTimeOriginal).toEqual(new Date(0));
  });

  it('should handle very large timestamp values', async () => {
    const jsonPath = path.join(testDir, 'future.jpg.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        title: 'future.jpg',
        photoTakenTime: { timestamp: '4102444800' }, // 2100-01-01
      }),
    );

    const metadata = await parseGoogleTakeoutMetadata(jsonPath);
    expect(metadata!.dateTimeOriginal).toEqual(new Date(4_102_444_800_000));
  });
});

describe('getAlbumName integration with --from flag', () => {
  it('should use getAlbumNameFromTakeout for google-takeout mode', () => {
    // This tests the integration point in asset.ts getAlbumName
    // by testing the underlying function directly
    const filepath = '/data/Takeout/Google Photos/My Album/photo.jpg';
    expect(getAlbumNameFromTakeout(filepath)).toBe('My Album');
  });

  it('should use parent folder for apple-photos mode', () => {
    const filepath = '/data/Export/Summer Trip/IMG_1234.HEIC';
    expect(getAlbumNameFromAppleExport(filepath)).toBe('Summer Trip');
  });

  it('should handle multiple "Photos from" year patterns', () => {
    const takeoutRoot = '/data/Takeout/Google Photos';

    expect(getAlbumNameFromTakeout(`${takeoutRoot}/Photos from 2020/a.jpg`, takeoutRoot)).toBeUndefined();
    expect(getAlbumNameFromTakeout(`${takeoutRoot}/Photos from 2021/b.jpg`, takeoutRoot)).toBeUndefined();
    expect(getAlbumNameFromTakeout(`${takeoutRoot}/Photos from 2022/c.jpg`, takeoutRoot)).toBeUndefined();
    expect(getAlbumNameFromTakeout(`${takeoutRoot}/Photos from 2023/d.jpg`, takeoutRoot)).toBeUndefined();
    expect(getAlbumNameFromTakeout(`${takeoutRoot}/Photos from 2024/e.jpg`, takeoutRoot)).toBeUndefined();

    // But "Photos from vacation" is a real album
    expect(getAlbumNameFromTakeout(`${takeoutRoot}/Photos from vacation/f.jpg`, takeoutRoot)).toBe(
      'Photos from vacation',
    );
  });
});

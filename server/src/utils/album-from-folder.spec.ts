import { groupAssetsByFolder } from 'src/utils/album-from-folder';

describe('groupAssetsByFolder', () => {
  it('should group assets by their parent folder name', () => {
    const assets = [
      { path: '/photos/Vacation/IMG_001.jpg', id: 'id-1' },
      { path: '/photos/Vacation/IMG_002.jpg', id: 'id-2' },
      { path: '/photos/Birthday/IMG_003.jpg', id: 'id-3' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(2);
    expect(result.get('Vacation')).toEqual(['id-1', 'id-2']);
    expect(result.get('Birthday')).toEqual(['id-3']);
  });

  it('should handle a single asset', () => {
    const assets = [{ path: '/photos/Trip/photo.jpg', id: 'id-1' }];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(1);
    expect(result.get('Trip')).toEqual(['id-1']);
  });

  it('should handle an empty array', () => {
    const result = groupAssetsByFolder([]);
    expect(result.size).toBe(0);
  });

  it('should handle assets all in the same folder', () => {
    const assets = [
      { path: '/photos/Album1/a.jpg', id: 'id-1' },
      { path: '/photos/Album1/b.jpg', id: 'id-2' },
      { path: '/photos/Album1/c.jpg', id: 'id-3' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(1);
    expect(result.get('Album1')).toEqual(['id-1', 'id-2', 'id-3']);
  });

  it('should handle deeply nested paths', () => {
    const assets = [
      { path: '/data/media/photos/2021/January/photo.jpg', id: 'id-1' },
      { path: '/data/media/photos/2021/February/photo.jpg', id: 'id-2' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(2);
    expect(result.get('January')).toEqual(['id-1']);
    expect(result.get('February')).toEqual(['id-2']);
  });

  it('should handle paths with spaces in folder names', () => {
    const assets = [
      { path: '/photos/My Vacation 2021/IMG_001.jpg', id: 'id-1' },
      { path: '/photos/My Vacation 2021/IMG_002.jpg', id: 'id-2' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.get('My Vacation 2021')).toEqual(['id-1', 'id-2']);
  });

  it('should handle paths with special characters in folder names', () => {
    const assets = [{ path: "/photos/John's Birthday (2021)/photo.jpg", id: 'id-1' }];

    const result = groupAssetsByFolder(assets);
    expect(result.get("John's Birthday (2021)")).toEqual(['id-1']);
  });

  it('should skip assets at root level (folder name is /)', () => {
    const assets = [{ path: '/photo.jpg', id: 'id-1' }];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(0);
  });

  it('should handle Google Takeout folder structure', () => {
    const assets = [
      { path: '/Takeout/Google Photos/Trip to Paris/IMG_001.jpg', id: 'id-1' },
      { path: '/Takeout/Google Photos/Trip to Paris/IMG_002.jpg', id: 'id-2' },
      { path: '/Takeout/Google Photos/Family Album/IMG_003.jpg', id: 'id-3' },
      { path: '/Takeout/Google Photos/Photos from 2020/IMG_004.jpg', id: 'id-4' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(3);
    expect(result.get('Trip to Paris')).toEqual(['id-1', 'id-2']);
    expect(result.get('Family Album')).toEqual(['id-3']);
    expect(result.get('Photos from 2020')).toEqual(['id-4']);
  });

  it('should handle different folders with same-named files', () => {
    const assets = [
      { path: '/photos/Album1/photo.jpg', id: 'id-1' },
      { path: '/photos/Album2/photo.jpg', id: 'id-2' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(2);
    expect(result.get('Album1')).toEqual(['id-1']);
    expect(result.get('Album2')).toEqual(['id-2']);
  });

  it('should handle Windows-style paths with forward slashes', () => {
    const assets = [{ path: 'C:/Users/photos/Vacation/photo.jpg', id: 'id-1' }];

    const result = groupAssetsByFolder(assets);
    expect(result.get('Vacation')).toEqual(['id-1']);
  });

  it('should handle mixed case folder names as distinct', () => {
    const assets = [
      { path: '/photos/vacation/photo1.jpg', id: 'id-1' },
      { path: '/photos/Vacation/photo2.jpg', id: 'id-2' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(2);
    expect(result.get('vacation')).toEqual(['id-1']);
    expect(result.get('Vacation')).toEqual(['id-2']);
  });

  it('should handle large batches of assets', () => {
    const assets = Array.from({ length: 100 }, (_, i) => ({
      path: `/photos/Album${i % 10}/photo${i}.jpg`,
      id: `id-${i}`,
    }));

    const result = groupAssetsByFolder(assets);
    expect(result.size).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(result.get(`Album${i}`)).toHaveLength(10);
    }
  });

  it('should handle paths with Unicode characters', () => {
    const assets = [
      { path: '/photos/日本旅行/photo.jpg', id: 'id-1' },
      { path: '/photos/Ürlaub/photo.jpg', id: 'id-2' },
    ];

    const result = groupAssetsByFolder(assets);
    expect(result.get('日本旅行')).toEqual(['id-1']);
    expect(result.get('Ürlaub')).toEqual(['id-2']);
  });
});

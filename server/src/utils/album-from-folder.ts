import { basename, dirname } from 'node:path';

/**
 * Groups asset IDs by their parent folder name.
 * Used to auto-create albums from folder structure during library scanning.
 *
 * @param assetPathsAndIds Array of { path, id } tuples
 * @returns Map of folder name → asset IDs
 */
export function groupAssetsByFolder(assetPathsAndIds: { path: string; id: string }[]): Map<string, string[]> {
  const folderMap = new Map<string, string[]>();

  for (const { path, id } of assetPathsAndIds) {
    const folderName = basename(dirname(path));
    if (!folderName || folderName === '.' || folderName === '/') {
      continue;
    }

    const existing = folderMap.get(folderName);
    if (existing) {
      existing.push(id);
    } else {
      folderMap.set(folderName, [id]);
    }
  }

  return folderMap;
}

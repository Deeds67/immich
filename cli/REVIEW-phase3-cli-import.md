# Phase 3: CLI Import Commands — Review

## Summary

Adds `--from google-takeout` and `--from apple-photos` flags to the `immich upload` CLI command. These flags enable format-aware importing that reads JSON sidecar metadata, handles filename quirks, pairs live photos, and extracts album names from export folder structures.

## Usage

```bash
# Import a Google Takeout export
immich upload --from google-takeout ./Takeout/Google\ Photos/

# Import an Apple Photos / osxphotos export
immich upload --from apple-photos ./Export/

# Combine with existing flags
immich upload --from google-takeout --album-name "Imported" --dry-run ./Takeout/
```

## Files Changed

### New Files

| File | Lines | Purpose |
|------|-------|---------|
| `cli/src/importers/google-takeout.ts` | 127 | Google Takeout JSON sidecar parsing, truncated filename matching, album extraction, live photo pairing |
| `cli/src/importers/google-takeout.spec.ts` | 395 | 30 unit tests for Google Takeout importer |
| `cli/src/importers/apple-photos.ts` | 101 | osxphotos JSON metadata parsing, sidecar discovery, album extraction, live photo pairing |
| `cli/src/importers/apple-photos.spec.ts` | 281 | 21 unit tests for Apple Photos importer |
| `cli/src/importers/e2e-import.spec.ts` | ~500 | 36 end-to-end integration tests |

### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| `cli/src/commands/asset.ts` | +79/-10 | Added `ImportSource` type, `from` field to `UploadOptionsDto`, `getImportMetadata()` helper, modified `uploadFile()` and `getAlbumName()` |
| `cli/src/index.ts` | +5 | Added `--from <source>` Commander.js option with choices validation |

## Architecture

```
immich upload --from google-takeout ./path
         │
         ▼
   UploadOptionsDto.from = 'google-takeout'
         │
         ▼
   upload() ──► auto-enables --album when --from is set
         │
         ▼
   uploadFile() ──► getImportMetadata(filepath, from)
         │                    │
         │         ┌──────────┴──────────┐
         │         ▼                     ▼
         │   google-takeout:        apple-photos:
         │   findGoogleTakeoutSidecar()  findOsxphotosSidecar()
         │   parseGoogleTakeoutMetadata()  parseOsxphotosMetadata()
         │         │                     │
         │         └──────────┬──────────┘
         │                    ▼
         │        { isFavorite, fileCreatedAt, sidecarPath }
         │                    │
         ▼                    ▼
   FormData with import-aware:
   - fileCreatedAt (from JSON sidecar, not mtime)
   - isFavorite (from JSON sidecar)
   - sidecarData (XMP if exists)
         │
         ▼
   getAlbumName() ──► routes to getAlbumNameFromTakeout()
                      when from='google-takeout'
                      (filters "Photos from YYYY" folders)
```

## Key Design Decisions

### 1. `getImportMetadata()` — Metadata extraction gateway

A single function that routes to the appropriate importer based on `from`. Returns a normalized `{ isFavorite, fileCreatedAt, sidecarPath }` object. Falls back to `{ isFavorite: false, sidecarPath }` when no importer metadata is found (graceful degradation).

### 2. Google Takeout sidecar resolution order

1. `photo.jpg.json` (exact match — most common)
2. `photo.json` (extension replaced — some exports)
3. Truncated prefix match at 47 chars (long filename handling)

### 3. GPS coordinate (0, 0) treated as "no location"

Both Google Takeout and Apple Photos use (0, 0) to mean "no GPS data available" since it's in the Gulf of Guinea and is the default zero value. Both importers filter this out.

### 4. Auto-enable `--album` when `--from` is set

When importing from a source format, album auto-creation is enabled by default since the folder structure represents meaningful albums. Users can override with `--album-name`.

### 5. "Photos from YYYY" filtered out

Google Takeout auto-generates `Photos from 2023` folders for uncategorized photos. These are filtered out as non-albums. But `Photos from vacation` (non-year pattern) is treated as a real album.

### 6. Live photo pairing is directory-scoped

Live photo pairing only matches files in the same directory. `IMG_1234.jpg` in `Album1/` won't pair with `IMG_1234.mp4` in `Album2/`.

## Test Coverage (87 tests total)

### Unit Tests — Google Takeout (30 tests)

- **Metadata parsing**: Complete JSON, missing fields, zero GPS, non-zero GPS, fallback to creationTime, non-existent file, invalid JSON, favorited, archived
- **Sidecar resolution**: Exact match, no sidecar, truncated filenames, extension-replaced, preference ordering, multi-dot filenames, edited suffix, numbered dedup suffix
- **Album extraction**: Standard structure, root-level files, nested subfolders, "Photos from YYYY" filtering, special chars, no-root fallback

### Unit Tests — Apple Photos (21 tests)

- **Metadata parsing**: Complete JSON, missing fields, non-existent file, invalid JSON, zero GPS, favorite false
- **Sidecar resolution**: Base name match, ext.json match, preference ordering, no sidecar
- **Album extraction**: Parent folder, nested folders, special characters
- **Live photo pairing**: HEIC+MOV, JPG+MOV, no pair, video rejection, case-insensitive, MP4, cross-directory, MOV-over-MP4 preference

### End-to-End Integration Tests (36 tests)

- **Google Takeout E2E**: Full album processing, live photo pairing in album context, "Photos from YYYY" filtering, truncated filename E2E, idempotency (double parse, double find), missing sidecar graceful handling, corrupted JSON graceful handling, empty JSON object, multi-album independence, cross-album live photo isolation
- **Apple Photos E2E**: Full album with live photo + metadata + GPS, non-favorite without GPS, idempotency, missing sidecar, corrupted JSON, empty JSON, cross-album live photo isolation, multi-album independence
- **Cross-importer edge cases**: Both sidecar formats present, unicode filenames, spaces in filenames, empty allFiles, single-file allFiles, RAW vs JPEG confusion, concurrent parsing, geoDataExif-only, negative GPS coords (both importers), epoch-zero timestamp, far-future timestamp, "Photos from vacation" vs "Photos from 2023"

## Potential Follow-Up Work

1. **XMP generation from JSON sidecars** — Convert Takeout/Apple JSON metadata to XMP format so Immich's server-side metadata extraction picks up GPS, dates, etc.
2. **Live photo upload pairing** — Wire `pairLivePhoto()`/`pairAppleLivePhoto()` into the upload flow to send paired video as `livePhotoData` in the upload FormData.
3. **Progress reporting for import mode** — Show import-specific stats (albums found, favorites count, etc.).
4. **`--takeout-root` option** — Allow specifying the Google Photos root for more accurate album extraction across multiple Takeout zip extracts.

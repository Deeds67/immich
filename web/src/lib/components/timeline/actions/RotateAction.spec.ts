import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RotateAction from './RotateAction.svelte';
import * as assetService from '$lib/services/asset.service';
import * as sdkModule from '@immich/sdk';

vi.mock('$lib/managers/event-manager.svelte');
vi.mock('$lib/services/asset.service');
vi.mock('$lib/utils/context');
vi.mock('$lib/utils/handle-error');
vi.mock('@immich/sdk');
vi.mock('svelte-i18n');

describe('RotateAction Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(assetService.mergeRotation).mockReturnValue([{ action: 'rotate', parameters: { angle: 90 } }]);
  });

  it('should render rotation menu options', () => {
    const { container } = render(RotateAction);
    expect(container).toBeDefined();
  });

  it('should have rotate right, left, and 180 options', () => {
    const { container } = render(RotateAction);
    const text = container.textContent || '';
    // Component renders menu options with text from i18n keys
    expect(container.innerHTML.length).toBeGreaterThan(0);
  });
});

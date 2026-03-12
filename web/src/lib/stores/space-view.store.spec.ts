import { get } from 'svelte/store';
import { spaceViewSettings } from '$lib/stores/space-view.store';

describe('space-view store', () => {
  it('should default viewMode to card', () => {
    const settings = get(spaceViewSettings);
    expect(settings.viewMode).toBe('card');
  });
});

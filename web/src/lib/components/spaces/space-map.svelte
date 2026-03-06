<script lang="ts">
  import MapModal from '$lib/modals/MapModal.svelte';
  import { assetViewingStore } from '$lib/stores/asset-viewing.store';
  import { getMapMarkers2, type MapMarkerResponseDto } from '@immich/sdk';
  import { IconButton, modalManager } from '@immich/ui';
  import { mdiMapOutline } from '@mdi/js';
  import { onDestroy, onMount } from 'svelte';
  import { t } from 'svelte-i18n';

  interface Props {
    spaceId: string;
  }

  let { spaceId }: Props = $props();
  let abortController: AbortController;
  let { setAssetId } = assetViewingStore;

  let mapMarkers: MapMarkerResponseDto[] = $state([]);

  onMount(async () => {
    mapMarkers = await loadMapMarkers();
  });

  onDestroy(() => {
    abortController?.abort();
    assetViewingStore.showAssetViewer(false);
  });

  async function loadMapMarkers() {
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    return getMapMarkers2({ id: spaceId });
  }

  async function openMap() {
    const assetIds = await modalManager.show(MapModal, { mapMarkers });

    if (assetIds) {
      await setAssetId(assetIds[0]);
    }
  }
</script>

<IconButton
  variant="ghost"
  shape="round"
  color="secondary"
  icon={mdiMapOutline}
  onclick={openMap}
  aria-label={$t('map')}
/>

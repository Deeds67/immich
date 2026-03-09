<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import EmptyPlaceholder from '$lib/components/shared-components/empty-placeholder.svelte';
  import SpaceCard from '$lib/components/spaces/space-card.svelte';
  import SpaceCreateModal from '$lib/modals/SpaceCreateModal.svelte';
  import { Route } from '$lib/route';
  import { type SharedSpaceResponseDto } from '@immich/sdk';
  import { Button, modalManager } from '@immich/ui';
  import { mdiPlus } from '@mdi/js';
  import { goto } from '$app/navigation';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let spaces: SharedSpaceResponseDto[] = $state(data.spaces);

  const handleCreate = async () => {
    const space = await modalManager.show(SpaceCreateModal, {});
    if (space) {
      await goto(Route.viewSpace({ id: space.id }));
    }
  };
</script>

<UserPageLayout title={data.meta.title}>
  {#snippet buttons()}
    <Button shape="round" size="small" leadingIcon={mdiPlus} onclick={handleCreate}>
      {$t('spaces_create')}
    </Button>
  {/snippet}

  {#if spaces.length === 0}
    <EmptyPlaceholder text={$t('spaces_empty')} onClick={handleCreate} class="mt-10 mx-auto" />
  {:else}
    <div class="grid grid-auto-fill-56 gap-y-4">
      {#each spaces as space, index (space.id)}
        <SpaceCard {space} preload={index < 20} />
      {/each}
    </div>
  {/if}
</UserPageLayout>

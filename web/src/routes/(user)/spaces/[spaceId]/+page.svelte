<script lang="ts">
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import { Route } from '$lib/route';
  import { removeSpace, type SharedSpaceMemberResponseDto, type SharedSpaceResponseDto } from '@immich/sdk';
  import { Button, modalManager, Text } from '@immich/ui';
  import { mdiArrowLeft, mdiDelete } from '@mdi/js';
  import { goto } from '$app/navigation';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let space: SharedSpaceResponseDto = $state(data.space);
  let members: SharedSpaceMemberResponseDto[] = $state(data.members);

  const handleDelete = async () => {
    const confirmed = await modalManager.showDialog({
      prompt: $t('spaces_delete_confirmation', { values: { name: space.name } }),
      title: $t('spaces_delete'),
    });

    if (!confirmed) {
      return;
    }

    await removeSpace({ id: space.id });
    await goto(Route.spaces());
  };
</script>

<UserPageLayout title={space.name}>
  {#snippet buttons()}
    <div class="flex gap-2">
      <Button shape="round" size="small" leadingIcon={mdiArrowLeft} href={Route.spaces()}>
        {$t('back')}
      </Button>
      <Button shape="round" size="small" color="danger" leadingIcon={mdiDelete} onclick={handleDelete}>
        {$t('spaces_delete')}
      </Button>
    </div>
  {/snippet}

  <div class="mt-4">
    {#if space.description}
      <p class="text-sm text-immich-fg/75 dark:text-immich-dark-fg/75 mb-4">{space.description}</p>
    {/if}

    <div class="flex gap-4 text-sm text-immich-fg/60 dark:text-immich-dark-fg/60 mb-6">
      <span>{space.assetCount ?? 0} {$t('photos')}</span>
      <span>{members.length} {$t('members')}</span>
    </div>

    <section>
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-medium">{$t('members')}</h2>
      </div>

      {#each members as member (member.userId)}
        <div class="flex items-center gap-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-full bg-immich-primary/10 dark:bg-immich-dark-primary/10"
          >
            <span class="text-sm font-medium text-immich-primary dark:text-immich-dark-primary">
              {member.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div class="flex-1">
            <Text fontWeight="medium">{member.name}</Text>
            <Text size="tiny" color="muted">{member.email}</Text>
          </div>
          <span class="text-sm text-immich-fg/60 dark:text-immich-dark-fg/60 capitalize">{member.role}</span>
        </div>
      {/each}
    </section>
  </div>
</UserPageLayout>

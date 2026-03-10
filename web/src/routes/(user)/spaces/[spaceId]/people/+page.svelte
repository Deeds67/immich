<script lang="ts">
  import { goto } from '$app/navigation';
  import UserPageLayout from '$lib/components/layouts/user-page-layout.svelte';
  import SpacePersonCard from '$lib/components/spaces/space-person-card.svelte';
  import { handleError } from '$lib/utils/handle-error';
  import {
    deleteSpacePerson,
    deleteSpacePersonAlias,
    getSpacePeople,
    mergeSpacePeople,
    Role,
    setSpacePersonAlias,
    type SharedSpaceMemberResponseDto,
    type SharedSpacePersonResponseDto,
    type SharedSpaceResponseDto,
  } from '@immich/sdk';
  import { Icon, modalManager, toastManager } from '@immich/ui';
  import { mdiAccountGroupOutline, mdiArrowLeft } from '@mdi/js';
  import { t } from 'svelte-i18n';
  import type { PageData } from './$types';

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let space: SharedSpaceResponseDto = $state(data.space);
  let members: SharedSpaceMemberResponseDto[] = $state(data.members);
  let people = $state<SharedSpacePersonResponseDto[]>(data.people);
  let editingAliasId = $state<string | null>(null);
  let aliasInput = $state('');

  const currentMember = $derived(members.find((m) => m.userId === data.space.createdById));
  const isOwner = $derived(currentMember?.role === Role.Owner);
  const isEditor = $derived(isOwner || currentMember?.role === Role.Editor);

  async function refreshPeople() {
    try {
      people = await getSpacePeople({ id: space.id });
    } catch (error) {
      handleError(error, $t('spaces_error_loading_people'));
    }
  }

  function handleSetAlias(personId: string) {
    const person = people.find((p) => p.id === personId);
    editingAliasId = personId;
    aliasInput = person?.alias ?? '';
  }

  async function saveAlias(personId: string) {
    const trimmed = aliasInput.trim();
    try {
      if (trimmed) {
        await setSpacePersonAlias({
          id: space.id,
          personId,
          sharedSpacePersonAliasDto: { alias: trimmed },
        });
        toastManager.success($t('spaces_alias_saved'));
      } else {
        await deleteSpacePersonAlias({ id: space.id, personId });
        toastManager.success($t('spaces_alias_cleared'));
      }
      editingAliasId = null;
      aliasInput = '';
      await refreshPeople();
    } catch (error) {
      handleError(error, $t('spaces_error_saving_alias'));
    }
  }

  function cancelAlias() {
    editingAliasId = null;
    aliasInput = '';
  }

  async function handleMerge(personId: string) {
    void goto(`/spaces/${space.id}/people/${personId}?action=merge`);
  }

  async function handleDelete(personId: string) {
    const person = people.find((p) => p.id === personId);
    const confirmed = await modalManager.showDialog({
      prompt: $t('spaces_delete_person_confirmation', { values: { name: person?.alias ?? person?.name ?? 'Unknown' } }),
      title: $t('spaces_delete_person'),
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteSpacePerson({ id: space.id, personId });
      toastManager.success($t('spaces_person_deleted'));
      await refreshPeople();
    } catch (error) {
      handleError(error, $t('spaces_error_deleting_person'));
    }
  }
</script>

<UserPageLayout title={$t('spaces_people_title')}>
  {#snippet buttons()}
    <button
      type="button"
      class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      onclick={() => goto(`/spaces/${space.id}`)}
    >
      <Icon icon={mdiArrowLeft} size="18" />
      {space.name}
    </button>
  {/snippet}

  <section class="px-4 pt-4">
    {#if people.length === 0}
      <div class="mx-auto max-w-md py-16 text-center">
        <Icon icon={mdiAccountGroupOutline} size="48" class="mx-auto mb-4 text-gray-300" />
        <p class="text-gray-500 dark:text-gray-400">{$t('spaces_no_people')}</p>
        <p class="mt-1 text-sm text-gray-400 dark:text-gray-500">
          {$t('spaces_no_people_description')}
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {#each people as person (person.id)}
          {#if editingAliasId === person.id}
            <div class="relative" data-testid="alias-editor-{person.id}">
              <SpacePersonCard {person} spaceId={space.id} />
              <div class="mt-2 flex gap-1">
                <input
                  type="text"
                  class="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                  bind:value={aliasInput}
                  placeholder={$t('spaces_alias_placeholder')}
                  onkeydown={(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      void saveAlias(person.id);
                    }
                    if (e.key === 'Escape') {
                      cancelAlias();
                    }
                  }}
                />
                <button
                  type="button"
                  class="rounded bg-immich-primary px-2 py-1 text-xs text-white hover:bg-immich-primary/90"
                  onclick={() => void saveAlias(person.id)}
                  data-testid="save-alias-button"
                >
                  {$t('save')}
                </button>
              </div>
            </div>
          {:else}
            <SpacePersonCard
              {person}
              spaceId={space.id}
              canEdit={isEditor}
              onSetAlias={handleSetAlias}
              onMerge={handleMerge}
            />
          {/if}
        {/each}
      </div>
    {/if}
  </section>
</UserPageLayout>

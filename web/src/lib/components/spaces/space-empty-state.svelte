<script lang="ts">
  import type { SharedSpaceResponseDto } from '@immich/sdk';
  import { Icon } from '@immich/ui';
  import {
    mdiAccountPlusOutline,
    mdiCameraOutline,
    mdiChevronRight,
    mdiImageFilterHdrOutline,
    mdiImagePlusOutline,
  } from '@mdi/js';

  interface Props {
    space: SharedSpaceResponseDto;
    currentRole: string;
    gradientClass: string;
    onAddPhotos: () => void;
    onInviteMembers: () => void;
  }

  let { space: _, currentRole, gradientClass, onAddPhotos, onInviteMembers }: Props = $props();

  const isOwner = $derived(currentRole === 'owner');
  const isEditor = $derived(currentRole === 'editor');
  const canAddPhotos = $derived(isOwner || isEditor);
</script>

<div class="mx-auto max-w-md py-16 text-center">
  <!-- Gradient icon -->
  <div
    class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br {gradientClass}"
    data-testid="empty-state-icon"
  >
    <Icon icon={mdiCameraOutline} size="32" class="text-white/80" />
  </div>

  {#if canAddPhotos}
    <!-- Owner / Editor view -->
    <h3 class="mb-1 text-lg font-semibold dark:text-white">Get started with your space</h3>
    <p class="mb-6 text-sm text-gray-500">Add photos and invite others to collaborate</p>

    <div class="overflow-hidden rounded-xl border border-gray-200 text-left dark:border-gray-800">
      <!-- Step 1: Add photos -->
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3.5 transition-colors duration-150 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
        onclick={onAddPhotos}
        data-testid="step-add-photos"
      >
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon icon={mdiImagePlusOutline} size="20" class="text-primary" />
        </div>
        <span class="flex-1 text-sm font-medium dark:text-white">Add photos from your timeline</span>
        <Icon icon={mdiChevronRight} size="20" class="text-gray-400" />
      </button>

      {#if isOwner}
        <!-- Step 2: Invite members -->
        <button
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3.5 transition-colors duration-150 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
          onclick={onInviteMembers}
          data-testid="step-invite-members"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon icon={mdiAccountPlusOutline} size="20" class="text-primary" />
          </div>
          <span class="flex-1 text-sm font-medium dark:text-white">Invite members to collaborate</span>
          <Icon icon={mdiChevronRight} size="20" class="text-gray-400" />
        </button>

        <!-- Step 3: Set cover (disabled) -->
        <div class="flex cursor-default items-center gap-3 px-4 py-3.5 opacity-50" data-testid="step-set-cover">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <Icon icon={mdiImageFilterHdrOutline} size="20" class="text-gray-400" />
          </div>
          <span class="flex-1 text-sm font-medium text-gray-400">Set a cover photo to personalize</span>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Viewer view -->
    <h3 class="mb-1 text-lg font-semibold dark:text-white">No photos yet</h3>
    <p class="text-sm text-gray-500">Photos added to this space will appear here</p>
  {/if}
</div>

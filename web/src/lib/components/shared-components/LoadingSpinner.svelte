<script lang="ts">
  import type { Size } from '@immich/ui';
  import { tv } from 'tailwind-variants';

  interface Props {
    size?: Size;
    class?: string;
  }

  let { size = 'medium', class: className }: Props = $props();

  const styles = tv({
    base: '',
    variants: {
      size: {
        tiny: 'h-3',
        small: 'h-4',
        medium: 'h-5',
        large: 'h-6',
        giant: 'h-12',
      },
    },
  });
</script>

<div>
  <img
    role="status"
    class={[styles({ size }), className].filter(Boolean).join(' ')}
    src="/gallery-loader.svg"
    alt="Loading"
    data-testid="loading-spinner"
  />
</div>

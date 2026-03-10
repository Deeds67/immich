import SpaceEmptyState from '$lib/components/spaces/space-empty-state.svelte';
import type { SharedSpaceResponseDto } from '@immich/sdk';
import { fireEvent, render, screen } from '@testing-library/svelte';

const makeSpace = (overrides: Partial<SharedSpaceResponseDto> = {}): SharedSpaceResponseDto => ({
  id: 'space-1',
  name: 'Family Photos',
  description: 'Our family memories',
  createdById: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  memberCount: 3,
  assetCount: 0,
  thumbnailAssetId: null,
  recentAssetIds: [],
  recentAssetThumbhashes: [],
  lastActivityAt: null,
  newAssetCount: 0,
  lastContributor: null,
  members: [],
  ...overrides,
});

describe('SpaceEmptyState', () => {
  const defaultProps = {
    space: makeSpace(),
    currentRole: 'owner',
    gradientClass: 'from-indigo-400 to-cyan-600',
    onAddPhotos: vi.fn(),
    onInviteMembers: vi.fn(),
  };

  it('should render "Get started with your space" title for owner', () => {
    render(SpaceEmptyState, { ...defaultProps, currentRole: 'owner' });
    expect(screen.getByText('Get started with your space')).toBeInTheDocument();
  });

  it('should show 3 steps for owner role', () => {
    render(SpaceEmptyState, { ...defaultProps, currentRole: 'owner' });
    expect(screen.getByTestId('step-add-photos')).toBeInTheDocument();
    expect(screen.getByTestId('step-invite-members')).toBeInTheDocument();
    expect(screen.getByTestId('step-set-cover')).toBeInTheDocument();
  });

  it('should show only 1 step (Add photos) for editor role', () => {
    render(SpaceEmptyState, { ...defaultProps, currentRole: 'editor' });
    expect(screen.getByTestId('step-add-photos')).toBeInTheDocument();
    expect(screen.queryByTestId('step-invite-members')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-set-cover')).not.toBeInTheDocument();
  });

  it('should show passive "No photos yet" message for viewer role', () => {
    render(SpaceEmptyState, { ...defaultProps, currentRole: 'viewer' });
    expect(screen.getByText('No photos yet')).toBeInTheDocument();
    expect(screen.queryByTestId('step-add-photos')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-invite-members')).not.toBeInTheDocument();
  });

  it('should trigger onAddPhotos when step 1 is clicked', async () => {
    const onAddPhotos = vi.fn();
    render(SpaceEmptyState, { ...defaultProps, onAddPhotos });
    await fireEvent.click(screen.getByTestId('step-add-photos'));
    expect(onAddPhotos).toHaveBeenCalledTimes(1);
  });

  it('should trigger onInviteMembers when step 2 is clicked', async () => {
    const onInviteMembers = vi.fn();
    render(SpaceEmptyState, { ...defaultProps, onInviteMembers });
    await fireEvent.click(screen.getByTestId('step-invite-members'));
    expect(onInviteMembers).toHaveBeenCalledTimes(1);
  });

  it('should have disabled styling on step 3', () => {
    render(SpaceEmptyState, { ...defaultProps, currentRole: 'owner' });
    const step3 = screen.getByTestId('step-set-cover');
    expect(step3.className).toContain('opacity-50');
  });

  it('should render gradient icon area', () => {
    render(SpaceEmptyState, { ...defaultProps });
    expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
  });
});

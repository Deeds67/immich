import SpacePersonCard from '$lib/components/spaces/space-person-card.svelte';
import type { SharedSpacePersonResponseDto } from '@immich/sdk';
import { fireEvent, render, screen } from '@testing-library/svelte';

const makePerson = (overrides: Partial<SharedSpacePersonResponseDto> = {}): SharedSpacePersonResponseDto => ({
  id: 'person-1',
  spaceId: 'space-1',
  name: 'Alice Johnson',
  alias: null,
  thumbnailPath: '/path/to/thumb.jpg',
  assetCount: 12,
  faceCount: 5,
  isHidden: false,
  representativeFaceId: 'face-1',
  birthDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('SpacePersonCard', () => {
  it('should render person thumbnail', () => {
    render(SpacePersonCard, { person: makePerson(), spaceId: 'space-1' });
    expect(screen.getByTestId('person-card-person-1')).toBeInTheDocument();
    expect(screen.getByTestId('person-card-thumbnail')).toBeInTheDocument();
  });

  it('should display alias when present', () => {
    render(SpacePersonCard, { person: makePerson({ alias: 'Mom' }), spaceId: 'space-1' });
    expect(screen.getByTestId('person-card-name')).toHaveTextContent('Mom');
  });

  it('should display name when no alias', () => {
    render(SpacePersonCard, { person: makePerson({ name: 'Alice', alias: null }), spaceId: 'space-1' });
    expect(screen.getByTestId('person-card-name')).toHaveTextContent('Alice');
  });

  it('should display "Unknown" when no name or alias', () => {
    render(SpacePersonCard, { person: makePerson({ name: '', alias: null }), spaceId: 'space-1' });
    expect(screen.getByTestId('person-card-name')).toHaveTextContent('Unknown');
  });

  it('should display asset count', () => {
    render(SpacePersonCard, { person: makePerson({ assetCount: 42 }), spaceId: 'space-1' });
    expect(screen.getByTestId('person-card-count')).toHaveTextContent('42');
  });

  it('should show original name below alias when both are present', () => {
    render(SpacePersonCard, { person: makePerson({ name: 'Alice Johnson', alias: 'Mom' }), spaceId: 'space-1' });
    expect(screen.getByTestId('person-card-name')).toHaveTextContent('Mom');
    expect(screen.getByTestId('person-card-original-name')).toHaveTextContent('Alice Johnson');
  });

  it('should not show original name when no alias', () => {
    render(SpacePersonCard, { person: makePerson({ name: 'Alice', alias: null }), spaceId: 'space-1' });
    expect(screen.queryByTestId('person-card-original-name')).not.toBeInTheDocument();
  });

  it('should link to person detail page', () => {
    render(SpacePersonCard, { person: makePerson({ id: 'p42' }), spaceId: 'space-1' });
    const link = screen.getByTestId('person-card-link');
    expect(link.getAttribute('href')).toBe('/spaces/space-1/people/p42');
  });

  it('should call onSetAlias when set alias button is clicked', async () => {
    const onSetAlias = vi.fn();
    render(SpacePersonCard, {
      person: makePerson(),
      spaceId: 'space-1',
      canEdit: true,
      onSetAlias,
    });
    // Hover to show the context menu trigger
    const card = screen.getByTestId('person-card-person-1');
    await fireEvent.mouseEnter(card);
    const aliasButton = screen.getByTestId('set-alias-button');
    await fireEvent.click(aliasButton);
    expect(onSetAlias).toHaveBeenCalledWith('person-1');
  });

  it('should call onMerge when merge button is clicked', async () => {
    const onMerge = vi.fn();
    render(SpacePersonCard, {
      person: makePerson(),
      spaceId: 'space-1',
      canEdit: true,
      onMerge,
    });
    const card = screen.getByTestId('person-card-person-1');
    await fireEvent.mouseEnter(card);
    const mergeButton = screen.getByTestId('merge-button');
    await fireEvent.click(mergeButton);
    expect(onMerge).toHaveBeenCalledWith('person-1');
  });

  it('should not show action buttons when canEdit is false', () => {
    render(SpacePersonCard, {
      person: makePerson(),
      spaceId: 'space-1',
      canEdit: false,
    });
    expect(screen.queryByTestId('set-alias-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('merge-button')).not.toBeInTheDocument();
  });
});

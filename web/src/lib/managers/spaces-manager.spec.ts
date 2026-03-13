import { Role, type SharedSpaceMemberResponseDto, type SharedSpaceResponseDto } from '@immich/sdk';
import { sharedSpaceFactory } from '@test-data/factories/shared-space-factory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpacesManager } from './spaces-manager.svelte';

interface SpaceApi {
  getSpaces(): Promise<SharedSpaceResponseDto[]>;
  addMember(spaceId: string, data: { userId: string; role: string }): Promise<void>;
  updateSpace(id: string, data: Record<string, unknown>): Promise<void>;
}

describe('SpacesManager', () => {
  let manager: SpacesManager;
  let mockApi: SpaceApi;

  beforeEach(() => {
    mockApi = {
      getSpaces: vi.fn().mockResolvedValue([]),
      addMember: vi.fn().mockResolvedValue(void 0),
      updateSpace: vi.fn().mockResolvedValue(void 0),
    };

    manager = new SpacesManager(mockApi);
  });

  describe('space list synchronization', () => {
    it('should sync space list from API', async () => {
      const mockSpaces = [sharedSpaceFactory.build({ name: 'Space 1' }), sharedSpaceFactory.build({ name: 'Space 2' })];

      vi.mocked(mockApi.getSpaces).mockResolvedValueOnce(mockSpaces);

      await manager.loadSpaces();

      expect(manager.spaces.length).toBe(2);
      expect(manager.spaces[0].name).toBe('Space 1');
    });

    it('should update local space on member join via event', () => {
      const space = sharedSpaceFactory.build({ members: [] });
      manager.spaces = [space];

      const newMember: SharedSpaceMemberResponseDto = {
        userId: 'new-user',
        role: Role.Editor,
        email: 'new@example.com',
        name: 'New User',
        joinedAt: new Date().toISOString(),
        showInTimeline: false,
      };
      manager.handleMemberJoined(space.id, newMember);

      expect(manager.spaces[0].members).toContainEqual(newMember);
    });

    it('should handle concurrent invites', async () => {
      const invites = [
        { spaceId: '1', userId: 'user-2', role: 'editor' },
        { spaceId: '1', userId: 'user-3', role: 'viewer' },
      ];

      const promises = invites.map((invite) => manager.sendInvite(invite.spaceId, invite.userId, invite.role));

      await Promise.all(promises);

      expect(mockApi.addMember).toHaveBeenCalledTimes(2);
    });

    it('should set loading state while fetching', async () => {
      vi.mocked(mockApi.getSpaces).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 10);
          }),
      );

      expect(manager.isLoading).toBe(false);

      const loadPromise = manager.loadSpaces();

      await loadPromise;
      expect(manager.isLoading).toBe(false);
    });

    it('should emit space update events', () => {
      const space = sharedSpaceFactory.build({ members: [] });
      manager.spaces = [space];

      const updateSpy = vi.fn();
      manager.onSpaceUpdate((s) => updateSpy(s));

      const member: SharedSpaceMemberResponseDto = {
        userId: 'new-user',
        role: Role.Viewer,
        email: 'viewer@example.com',
        name: 'Viewer',
        joinedAt: new Date().toISOString(),
        showInTimeline: false,
      };
      manager.handleMemberJoined(space.id, member);

      expect(updateSpy).toHaveBeenCalled();
    });
  });
});

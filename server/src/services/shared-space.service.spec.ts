import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SharedSpaceRole } from 'src/enum';
import { SharedSpaceService } from 'src/services/shared-space.service';
import { factory, newDate, newUuid } from 'test/small.factory';
import { newTestService, ServiceMocks } from 'test/utils';

describe(SharedSpaceService.name, () => {
  let sut: SharedSpaceService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(SharedSpaceService));
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  const makeSpace = (overrides: Record<string, unknown> = {}) => ({
    id: newUuid(),
    name: 'Test Space',
    description: null,
    createdById: newUuid(),
    createdAt: newDate(),
    updatedAt: newDate(),
    createId: newUuid(),
    updateId: newUuid(),
    ...overrides,
  });

  const makeMember = (overrides: Record<string, unknown> = {}) => ({
    spaceId: newUuid(),
    userId: newUuid(),
    role: SharedSpaceRole.Viewer,
    joinedAt: newDate(),
    name: 'Test User',
    email: 'test@immich.cloud',
    profileImagePath: '',
    profileChangedAt: newDate(),
    ...overrides,
  });

  describe('create', () => {
    it('should create space and add creator as owner', async () => {
      const auth = factory.auth();
      const space = makeSpace({ createdById: auth.user.id });

      mocks.sharedSpace.create.mockResolvedValue(space);
      mocks.sharedSpace.addMember.mockResolvedValue({
        spaceId: space.id,
        userId: auth.user.id,
        role: SharedSpaceRole.Owner,
        joinedAt: newDate(),
      });

      const result = await sut.create(auth, { name: 'Test Space' });

      expect(result.id).toBe(space.id);
      expect(result.name).toBe('Test Space');
      expect(result.createdById).toBe(auth.user.id);

      expect(mocks.sharedSpace.create).toHaveBeenCalledWith({
        name: 'Test Space',
        description: null,
        createdById: auth.user.id,
      });

      expect(mocks.sharedSpace.addMember).toHaveBeenCalledWith({
        spaceId: space.id,
        userId: auth.user.id,
        role: SharedSpaceRole.Owner,
      });
    });

    it('should pass description when provided', async () => {
      const auth = factory.auth();
      const space = makeSpace({ createdById: auth.user.id, description: 'A cool space' });

      mocks.sharedSpace.create.mockResolvedValue(space);
      mocks.sharedSpace.addMember.mockResolvedValue({
        spaceId: space.id,
        userId: auth.user.id,
        role: SharedSpaceRole.Owner,
        joinedAt: newDate(),
      });

      const result = await sut.create(auth, { name: 'Test Space', description: 'A cool space' });

      expect(result.description).toBe('A cool space');
      expect(mocks.sharedSpace.create).toHaveBeenCalledWith({
        name: 'Test Space',
        description: 'A cool space',
        createdById: auth.user.id,
      });
    });
  });

  describe('getAll', () => {
    it('should return all spaces for user', async () => {
      const auth = factory.auth();
      const space1 = makeSpace({ name: 'Space 1' });
      const space2 = makeSpace({ name: 'Space 2' });

      mocks.sharedSpace.getAllByUserId.mockResolvedValue([space1, space2]);

      const result = await sut.getAll(auth);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Space 1');
      expect(result[1].name).toBe('Space 2');
      expect(mocks.sharedSpace.getAllByUserId).toHaveBeenCalledWith(auth.user.id);
    });
  });

  describe('get', () => {
    it('should return space with counts when user is member', async () => {
      const auth = factory.auth();
      const space = makeSpace();
      const member = makeMember({ spaceId: space.id, userId: auth.user.id, role: SharedSpaceRole.Viewer });

      mocks.sharedSpace.getMember.mockResolvedValue(member);
      mocks.sharedSpace.getById.mockResolvedValue(space);
      mocks.sharedSpace.getMembers.mockResolvedValue([member, makeMember()]);
      mocks.sharedSpace.getAssetCount.mockResolvedValue(5);

      const result = await sut.get(auth, space.id);

      expect(result.id).toBe(space.id);
      expect(result.memberCount).toBe(2);
      expect(result.assetCount).toBe(5);
    });

    it('should throw when user is not member', async () => {
      const auth = factory.auth();

      mocks.sharedSpace.getMember.mockResolvedValue(undefined);

      await expect(sut.get(auth, newUuid())).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update when user is owner', async () => {
      const auth = factory.auth();
      const space = makeSpace();
      const member = makeMember({ spaceId: space.id, userId: auth.user.id, role: SharedSpaceRole.Owner });
      const updatedSpace = { ...space, name: 'Updated Name' };

      mocks.sharedSpace.getMember.mockResolvedValue(member);
      mocks.sharedSpace.update.mockResolvedValue(updatedSpace);

      const result = await sut.update(auth, space.id, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mocks.sharedSpace.update).toHaveBeenCalledWith(space.id, {
        name: 'Updated Name',
        description: undefined,
      });
    });

    it('should throw when user is editor', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const member = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember.mockResolvedValue(member);

      await expect(sut.update(auth, spaceId, { name: 'New Name' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw when user is viewer', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const member = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Viewer });

      mocks.sharedSpace.getMember.mockResolvedValue(member);

      await expect(sut.update(auth, spaceId, { name: 'New Name' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove when user is owner', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const member = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });

      mocks.sharedSpace.getMember.mockResolvedValue(member);
      mocks.sharedSpace.remove.mockResolvedValue(void 0);

      await sut.remove(auth, spaceId);

      expect(mocks.sharedSpace.remove).toHaveBeenCalledWith(spaceId);
    });

    it('should throw when user is not owner', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const member = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember.mockResolvedValue(member);

      await expect(sut.remove(auth, spaceId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mocks.sharedSpace.remove).not.toHaveBeenCalled();
    });
  });

  describe('getMembers', () => {
    it('should return members when user is a member', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const member1 = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner, name: 'Owner User' });
      const member2 = makeMember({ spaceId, role: SharedSpaceRole.Viewer, name: 'Viewer User' });

      mocks.sharedSpace.getMember.mockResolvedValue(member1);
      mocks.sharedSpace.getMembers.mockResolvedValue([member1, member2]);

      const result = await sut.getMembers(auth, spaceId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Owner User');
      expect(result[1].name).toBe('Viewer User');
    });
  });

  describe('addMember', () => {
    it('should add member with default viewer role', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const newUserId = newUuid();
      const ownerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });
      const newMember = makeMember({ spaceId, userId: newUserId, role: SharedSpaceRole.Viewer, name: 'New User' });

      mocks.sharedSpace.getMember
        .mockResolvedValueOnce(ownerMember) // requireRole check
        .mockResolvedValueOnce(undefined) // duplicate check
        .mockResolvedValueOnce(newMember); // fetch after add
      mocks.sharedSpace.addMember.mockResolvedValue({
        spaceId,
        userId: newUserId,
        role: SharedSpaceRole.Viewer,
        joinedAt: newDate(),
      });

      const result = await sut.addMember(auth, spaceId, { userId: newUserId });

      expect(result.userId).toBe(newUserId);
      expect(result.name).toBe('New User');
      expect(mocks.sharedSpace.addMember).toHaveBeenCalledWith({
        spaceId,
        userId: newUserId,
        role: SharedSpaceRole.Viewer,
      });
    });

    it('should throw if already a member', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const existingUserId = newUuid();
      const ownerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });
      const existingMember = makeMember({ spaceId, userId: existingUserId });

      mocks.sharedSpace.getMember
        .mockResolvedValueOnce(ownerMember) // requireRole check
        .mockResolvedValueOnce(existingMember); // duplicate check

      await expect(sut.addMember(auth, spaceId, { userId: existingUserId })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mocks.sharedSpace.addMember).not.toHaveBeenCalled();
    });

    it('should throw if not owner', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const editorMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember.mockResolvedValue(editorMember);

      await expect(sut.addMember(auth, spaceId, { userId: newUuid() })).rejects.toBeInstanceOf(ForbiddenException);
      expect(mocks.sharedSpace.addMember).not.toHaveBeenCalled();
    });
  });

  describe('updateMember', () => {
    it('should change role', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const targetUserId = newUuid();
      const ownerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });
      const updatedMember = makeMember({ spaceId, userId: targetUserId, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember
        .mockResolvedValueOnce(ownerMember) // requireRole check
        .mockResolvedValueOnce(updatedMember); // fetch after update
      mocks.sharedSpace.updateMember.mockResolvedValue({
        spaceId,
        userId: targetUserId,
        role: SharedSpaceRole.Editor,
        joinedAt: newDate(),
      });

      const result = await sut.updateMember(auth, spaceId, targetUserId, { role: SharedSpaceRole.Editor });

      expect(result.role).toBe(SharedSpaceRole.Editor);
      expect(mocks.sharedSpace.updateMember).toHaveBeenCalledWith(spaceId, targetUserId, {
        role: SharedSpaceRole.Editor,
      });
    });

    it('should throw when changing own role', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const ownerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });

      mocks.sharedSpace.getMember.mockResolvedValue(ownerMember);

      await expect(
        sut.updateMember(auth, spaceId, auth.user.id, { role: SharedSpaceRole.Editor }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sharedSpace.updateMember).not.toHaveBeenCalled();
    });

    it('should throw if not owner', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const editorMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember.mockResolvedValue(editorMember);

      await expect(
        sut.updateMember(auth, spaceId, newUuid(), { role: SharedSpaceRole.Editor }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mocks.sharedSpace.updateMember).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it('should allow owner to remove others', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const targetUserId = newUuid();
      const ownerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });

      mocks.sharedSpace.getMember.mockResolvedValue(ownerMember);
      mocks.sharedSpace.removeMember.mockResolvedValue(void 0);

      await sut.removeMember(auth, spaceId, targetUserId);

      expect(mocks.sharedSpace.removeMember).toHaveBeenCalledWith(spaceId, targetUserId);
    });

    it('should allow non-owner to leave (self-remove)', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const viewerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Viewer });

      mocks.sharedSpace.getMember.mockResolvedValue(viewerMember);
      mocks.sharedSpace.removeMember.mockResolvedValue(void 0);

      await sut.removeMember(auth, spaceId, auth.user.id);

      expect(mocks.sharedSpace.removeMember).toHaveBeenCalledWith(spaceId, auth.user.id);
    });

    it('should throw if owner tries to leave', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const ownerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Owner });

      mocks.sharedSpace.getMember.mockResolvedValue(ownerMember);

      await expect(sut.removeMember(auth, spaceId, auth.user.id)).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.sharedSpace.removeMember).not.toHaveBeenCalled();
    });

    it('should throw if non-owner tries to remove others', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const viewerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Viewer });

      mocks.sharedSpace.getMember.mockResolvedValue(viewerMember);

      await expect(sut.removeMember(auth, spaceId, newUuid())).rejects.toBeInstanceOf(ForbiddenException);
      expect(mocks.sharedSpace.removeMember).not.toHaveBeenCalled();
    });
  });

  describe('addAssets', () => {
    it('should add assets when editor', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const assetId1 = newUuid();
      const assetId2 = newUuid();
      const editorMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember.mockResolvedValue(editorMember);
      mocks.sharedSpace.addAssets.mockResolvedValue([]);

      await sut.addAssets(auth, spaceId, { assetIds: [assetId1, assetId2] });

      expect(mocks.sharedSpace.addAssets).toHaveBeenCalledWith([
        { spaceId, assetId: assetId1, addedById: auth.user.id },
        { spaceId, assetId: assetId2, addedById: auth.user.id },
      ]);
    });

    it('should throw when viewer', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const viewerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Viewer });

      mocks.sharedSpace.getMember.mockResolvedValue(viewerMember);

      await expect(sut.addAssets(auth, spaceId, { assetIds: [newUuid()] })).rejects.toBeInstanceOf(ForbiddenException);
      expect(mocks.sharedSpace.addAssets).not.toHaveBeenCalled();
    });
  });

  describe('removeAssets', () => {
    it('should remove assets when editor', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const assetId1 = newUuid();
      const assetId2 = newUuid();
      const editorMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Editor });

      mocks.sharedSpace.getMember.mockResolvedValue(editorMember);
      mocks.sharedSpace.removeAssets.mockResolvedValue(void 0);

      await sut.removeAssets(auth, spaceId, { assetIds: [assetId1, assetId2] });

      expect(mocks.sharedSpace.removeAssets).toHaveBeenCalledWith(spaceId, [assetId1, assetId2]);
    });

    it('should throw when viewer', async () => {
      const auth = factory.auth();
      const spaceId = newUuid();
      const viewerMember = makeMember({ spaceId, userId: auth.user.id, role: SharedSpaceRole.Viewer });

      mocks.sharedSpace.getMember.mockResolvedValue(viewerMember);

      await expect(sut.removeAssets(auth, spaceId, { assetIds: [newUuid()] })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mocks.sharedSpace.removeAssets).not.toHaveBeenCalled();
    });
  });
});

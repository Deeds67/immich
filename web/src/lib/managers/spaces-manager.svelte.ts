import type { SpaceApi, SpaceDto, SpaceMember } from '@immich/sdk';

export class SpacesManager {
  spaces = $state<SpaceDto[]>([]);
  isLoading = $state(false);
  private updateCallbacks: ((space: SpaceDto) => void)[] = [];

  constructor(private api: SpaceApi) {}

  async loadSpaces() {
    this.isLoading = true;
    try {
      this.spaces = await this.api.getSpaces();
    } finally {
      this.isLoading = false;
    }
  }

  async sendInvite(spaceId: string, userId: string, role: string) {
    await this.api.addMember(spaceId, { userId, role });
    // Update local state
    const space = this.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.members ??= [];
      space.members.push({ userId, role } as SpaceMember);
    }
  }

  handleMemberJoined(spaceId: string, member: SpaceMember) {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.members ??= [];
      space.members.push(member);
      this.emitSpaceUpdate(space);
    }
  }

  onSpaceUpdate(callback: (space: SpaceDto) => void) {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emitSpaceUpdate(space: SpaceDto) {
    for (const callback of this.updateCallbacks) {
      callback(space);
    }
  }
}

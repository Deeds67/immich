import type { SharedSpaceMemberResponseDto, SharedSpaceResponseDto } from '@immich/sdk';

interface SpaceApi {
  getSpaces(): Promise<SharedSpaceResponseDto[]>;
  addMember(spaceId: string, data: { userId: string; role: string }): Promise<void>;
  updateSpace(id: string, data: Record<string, unknown>): Promise<void>;
}

export class SpacesManager {
  spaces = $state<SharedSpaceResponseDto[]>([]);
  isLoading = $state(false);
  private updateCallbacks: ((space: SharedSpaceResponseDto) => void)[] = [];

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
    const space = this.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.members ??= [];
      space.members.push({ userId, role } as SharedSpaceMemberResponseDto);
    }
  }

  handleMemberJoined(spaceId: string, member: SharedSpaceMemberResponseDto) {
    const space = this.spaces.find((s) => s.id === spaceId);
    if (space) {
      space.members ??= [];
      space.members.push(member);
      this.emitSpaceUpdate(space);
    }
  }

  onSpaceUpdate(callback: (space: SharedSpaceResponseDto) => void) {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emitSpaceUpdate(space: SharedSpaceResponseDto) {
    for (const callback of this.updateCallbacks) {
      callback(space);
    }
  }
}

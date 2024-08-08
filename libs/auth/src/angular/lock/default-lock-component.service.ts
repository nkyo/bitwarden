import { UserId } from "@bitwarden/common/types/guid";

import { LockComponentService } from "./lock-component.service";

export class DefaultLockComponentService implements LockComponentService {
  constructor() {}

  async isWindowVisible(): Promise<boolean> {
    return false;
  }

  async biometricsEnabled(userId: UserId): Promise<boolean> {
    return false;
  }
}

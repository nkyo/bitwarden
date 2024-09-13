import { Injectable } from "@angular/core";

import { MessagingService } from "../../../../../../libs/common/src/platform/abstractions/messaging.service";
import { PremiumUpgradePromptService } from "../../../../../../libs/common/src/vault/abstractions/premium-upgrade-prompt.service";

/**
 * This service is used to prompt the user to upgrade to premium.
 */
@Injectable()
export class WebVaultPremiumUpgradePromptService implements PremiumUpgradePromptService {
  constructor(
    private messagingService: MessagingService,
    private organizationId?: string,
  ) {}

  async promptForPremium() {
    /**
     * Use the messaging service to trigger the premium required dialog in the web vault.
     * If the organizationId is not set, then we are in the individual vault and should sent the premiumRequired message.
     */
    if (this.organizationId) {
      await this.messagingService.send("upgradeOrganization", {
        organizationId: this.organizationId,
      });
    } else {
      await this.messagingService.send("premiumRequired");
    }
  }
}

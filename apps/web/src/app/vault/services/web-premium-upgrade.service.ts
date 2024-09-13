import { Injectable } from "@angular/core";

import { PremiumUpgradeService } from "@bitwarden/common/src/billing/abstractions/organizations/premium-upgrade.service.abstraction";
import { MessagingService } from "@bitwarden/common/src/platform/abstractions/messaging.service";
import { OrganizationId } from "@bitwarden/common/src/types/guid";

@Injectable()
export class WebVaultPremiumUpgradeService implements PremiumUpgradeService {
  constructor(
    private messagingService: MessagingService,
    private organizationId: OrganizationId,
  ) {}

  async getPremium() {
    // console.log("getPremium WebOrganizationPremiumUpgradeService");
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

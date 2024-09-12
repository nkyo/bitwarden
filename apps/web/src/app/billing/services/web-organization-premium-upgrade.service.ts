import { Injectable } from "@angular/core";

import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { PremiumUpgradeService } from "@bitwarden/common/src/billing/abstractions/organizations/premium-upgrade.service.abstraction";
import { OrganizationId } from "@bitwarden/common/src/types/guid";

@Injectable()
export class WebOrganizationPremiumUpgradeService implements PremiumUpgradeService {
  constructor(
    private messagingService: MessagingService,
    private organizationId: OrganizationId,
  ) {}

  async getPremium() {
    // console.log("getPremium WebOrganizationPremiumUpgradeService");
    /**
     * Use the messaging service to trigger the premium required dialog in the web vault.
     */
    this.messagingService.send("upgradeOrganization", {
      organizationId: this.organizationId,
    });
  }
}

import { Injectable } from "@angular/core";

import { PremiumUpgradeService } from "@bitwarden/common/billing/abstractions/organizations/premium-upgrade.service.abstraction";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";

@Injectable()
export class WebIndividualPremiumUpgradeService implements PremiumUpgradeService {
  constructor(private messagingService: MessagingService) {}

  async getPremium() {
    // console.log("getPremium WebIndividualPremiumUpgradeService");
    /**
     * Use the messaging service to trigger the premium required dialog in the web vault.
     */
    await this.messagingService.send("premiumRequired");
  }
}

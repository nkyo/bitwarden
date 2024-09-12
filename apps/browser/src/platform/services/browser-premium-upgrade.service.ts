import { inject } from "@angular/core";
import { Router } from "@angular/router";

import { PremiumUpgradeService } from "@bitwarden/common/billing/abstractions/organizations/premium-upgrade.service.abstraction";

/**
 * This class handles the premium upgrade process for the browser extension.
 */
export class BrowserPremiumUpgradeService implements PremiumUpgradeService {
  async getPremium() {
    // console.log("getPremium called from browser-premium-upgrade.service.ts");

    const router = inject(Router);

    /**
     * Use the messaging service to trigger the premium required dialog in the web vault.
     */
    await router.navigate(["/premium"]);
  }
}

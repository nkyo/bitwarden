import { TestBed } from "@angular/core/testing";
import { mock, MockProxy } from "jest-mock-extended";

import { MessagingService } from "../../../../../../libs/common/src/platform/abstractions/messaging.service";

import { WebVaultPremiumUpgradePromptService } from "./web-premium-upgrade-prompt.service";

describe("WebVaultPremiumUpgradePromptService", () => {
  let service: WebVaultPremiumUpgradePromptService;
  let messagingService: MockProxy<MessagingService>;

  beforeEach(async () => {
    messagingService = mock<MessagingService>();
    await TestBed.configureTestingModule({
      providers: [
        WebVaultPremiumUpgradePromptService,
        { provide: MessagingService, useValue: messagingService },
      ],
    }).compileComponents();

    service = TestBed.inject(WebVaultPremiumUpgradePromptService);
  });

  describe("promptForPremium", () => {
    it('sends "upgradeOrganization" message if organizationId is set', async () => {
      await service.promptForPremium("myOrganizationId");
      expect(messagingService.send).toHaveBeenCalledWith("upgradeOrganization", {
        organizationId: "myOrganizationId",
      });
    });

    it('sends "premiumRequired" message if organizationId is not set', async () => {
      await service.promptForPremium();
      expect(messagingService.send).toHaveBeenCalledWith("premiumRequired");
    });
  });
});

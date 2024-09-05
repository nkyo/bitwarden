import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { EncryptService } from "@bitwarden/common/platform/abstractions/encrypt.service";

import { UserId } from "../../../../common/src/types/guid";
import { OrganizationApiServiceAbstraction } from "../../admin-console/abstractions/organization/organization-api.service.abstraction";
import { OrganizationUserService } from "../../admin-console/abstractions/organization-user/organization-user.service";
import { OrganizationAutoEnrollStatusResponse } from "../../admin-console/models/response/organization-auto-enroll-status.response";
import { CryptoService } from "../../platform/abstractions/crypto.service";
import { I18nService } from "../../platform/abstractions/i18n.service";
import { AccountInfo, AccountService } from "../abstractions/account.service";

import { PasswordResetEnrollmentServiceImplementation } from "./password-reset-enrollment.service.implementation";

describe("PasswordResetEnrollmentServiceImplementation", () => {
  const activeAccountSubject = new BehaviorSubject<{ id: UserId } & AccountInfo>(null);

  let organizationApiService: MockProxy<OrganizationApiServiceAbstraction>;
  let accountService: MockProxy<AccountService>;
  let cryptoService: MockProxy<CryptoService>;
  let encryptService: MockProxy<EncryptService>;
  let organizationUserService: MockProxy<OrganizationUserService>;
  let i18nService: MockProxy<I18nService>;
  let service: PasswordResetEnrollmentServiceImplementation;

  beforeEach(() => {
    organizationApiService = mock<OrganizationApiServiceAbstraction>();
    accountService = mock<AccountService>();
    accountService.activeAccount$ = activeAccountSubject;
    cryptoService = mock<CryptoService>();
    encryptService = mock<EncryptService>();
    organizationUserService = mock<OrganizationUserService>();
    i18nService = mock<I18nService>();
    service = new PasswordResetEnrollmentServiceImplementation(
      organizationApiService,
      accountService,
      cryptoService,
      encryptService,
      organizationUserService,
      i18nService,
    );
  });

  describe("enrollIfRequired", () => {
    it("should not enroll when user is already enrolled in password reset", async () => {
      const mockResponse = new OrganizationAutoEnrollStatusResponse({
        ResetPasswordEnabled: true,
        Id: "orgId",
      });
      organizationApiService.getAutoEnrollStatus.mockResolvedValue(mockResponse);

      const enrollSpy = jest.spyOn(service, "enroll");
      enrollSpy.mockResolvedValue();

      await service.enrollIfRequired("ssoId");

      expect(service.enroll).not.toHaveBeenCalled();
    });

    it("should enroll when user is not enrolled in password reset", async () => {
      const mockResponse = new OrganizationAutoEnrollStatusResponse({
        ResetPasswordEnabled: false,
        Id: "orgId",
      });
      organizationApiService.getAutoEnrollStatus.mockResolvedValue(mockResponse);

      const enrollSpy = jest.spyOn(service, "enroll");
      enrollSpy.mockResolvedValue();

      await service.enrollIfRequired("ssoId");

      expect(service.enroll).toHaveBeenCalled();
    });
  });

  describe("enroll", () => {
    it("should throw an error if the organization keys are not found", async () => {
      organizationApiService.getKeys.mockResolvedValue(null);
      i18nService.t.mockReturnValue("resetPasswordOrgKeysError");

      const result = () => service.enroll("orgId");

      await expect(result).rejects.toThrowError("resetPasswordOrgKeysError");
    });

    it("should enroll the user when no user id or key is provided", async () => {
      const orgKeyResponse = {
        publicKey: "publicKey",
        privateKey: "privateKey",
      };
      const encryptedKey = { encryptedString: "encryptedString" };
      organizationApiService.getKeys.mockResolvedValue(orgKeyResponse as any);

      const user1AccountInfo: AccountInfo = {
        name: "Test User 1",
        email: "test1@email.com",
        emailVerified: true,
      };
      activeAccountSubject.next(Object.assign(user1AccountInfo, { id: "userId" as UserId }));

      cryptoService.getUserKey.mockResolvedValue({ key: "key" } as any);
      encryptService.rsaEncrypt.mockResolvedValue(encryptedKey as any);

      await service.enroll("orgId");

      expect(
        organizationUserService.putOrganizationUserResetPasswordEnrollment,
      ).toHaveBeenCalledWith(
        "orgId",
        "userId",
        expect.objectContaining({
          resetPasswordKey: encryptedKey.encryptedString,
        }),
      );
    });

    it("should enroll the user when a user id and key is provided", async () => {
      const orgKeyResponse = {
        publicKey: "publicKey",
        privateKey: "privateKey",
      };
      const encryptedKey = { encryptedString: "encryptedString" };
      organizationApiService.getKeys.mockResolvedValue(orgKeyResponse as any);
      encryptService.rsaEncrypt.mockResolvedValue(encryptedKey as any);

      await service.enroll("orgId", "userId", { key: "key" } as any);

      expect(
        organizationUserService.putOrganizationUserResetPasswordEnrollment,
      ).toHaveBeenCalledWith(
        "orgId",
        "userId",
        expect.objectContaining({
          resetPasswordKey: encryptedKey.encryptedString,
        }),
      );
    });
  });
});

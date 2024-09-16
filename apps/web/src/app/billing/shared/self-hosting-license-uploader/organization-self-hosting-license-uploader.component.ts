import { Component } from "@angular/core";
import { FormBuilder } from "@angular/forms";

import { TokenService } from "@bitwarden/common/auth/abstractions/token.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { ToastService } from "@bitwarden/components";

import { AbstractSelfHostingLicenseUploaderComponent } from "../../shared/self-hosting-license-uploader/abstract-self-hosting-license-uploader.component";


/**
 * Processes license file uploads for organizations.
 * @remarks Requires self-hosting.
 */
@Component({
  selector: "organization-self-hosting-license-uploader",
  templateUrl: "./self-hosting-license-uploader.component.html",
})
export class OrganizationSelfHostingLicenseUploaderComponent extends AbstractSelfHostingLicenseUploaderComponent {
  constructor(
    protected readonly formBuilder: FormBuilder,
    protected readonly i18nService: I18nService,
    protected readonly platformUtilsService: PlatformUtilsService,
    protected readonly toastService: ToastService,
    protected readonly tokenService: TokenService,
  ) {
    super(formBuilder, i18nService, platformUtilsService, toastService, tokenService);
  }
}

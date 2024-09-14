import { CommonModule } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { firstValueFrom } from "rxjs";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { BillingAccountProfileStateService } from "@bitwarden/common/billing/abstractions";
import { SendType } from "@bitwarden/common/tools/send/enums/send-type";
import { BadgeModule, ButtonModule, DialogService, MenuModule } from "@bitwarden/components";

import { SendFilePopoutDialogComponent } from "../send-form";

@Component({
  selector: "tools-new-send-dropdown",
  templateUrl: "new-send-dropdown.component.html",
  standalone: true,
  imports: [JslibModule, CommonModule, ButtonModule, RouterLink, MenuModule, BadgeModule],
})
export class NewSendDropdownComponent implements OnInit {
  @Input({ required: true }) shouldShowFilePopoutMessage: boolean;
  @Input({ required: true }) popOutWindow: () => void;

  sendType = SendType;

  hasNoPremium = false;

  constructor(
    private router: Router,
    private billingAccountProfileStateService: BillingAccountProfileStateService,
    private dialogService: DialogService,
  ) {}

  async ngOnInit() {
    this.hasNoPremium = !(await firstValueFrom(
      this.billingAccountProfileStateService.hasPremiumFromAnySource$,
    ));
  }

  async handleNewFileClick() {
    if (this.shouldShowFilePopoutMessage) {
      return this.dialogService.open(SendFilePopoutDialogComponent, {
        data: { popOutWindow: this.popOutWindow },
      });
    }
    await this.newItemNavigate(SendType.File);
  }

  newItemNavigate(type: SendType) {
    if (this.hasNoPremium && type === SendType.File) {
      return this.router.navigate(["/premium"]);
    }
    void this.router.navigate(["/add-send"], { queryParams: { type: type, isNew: true } });
  }
}

import { DIALOG_DATA } from "@angular/cdk/dialog";
import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { ButtonModule, DialogModule, DialogService, TypographyModule } from "@bitwarden/components";

@Component({
  selector: "tools-send-file-popout-dialog",
  templateUrl: "./send-file-popout-dialog.component.html",
  standalone: true,
  imports: [JslibModule, CommonModule, DialogModule, ButtonModule, TypographyModule],
})
export class SendFilePopoutDialogComponent {
  popOutWindow: () => void;

  constructor(
    private dialogService: DialogService,
    @Inject(DIALOG_DATA) public data: { popOutWindow: () => void },
  ) {
    this.popOutWindow = data.popOutWindow;
  }

  close() {
    this.dialogService.closeAll();
  }

  onPopOutClick() {
    this.popOutWindow();
  }
}

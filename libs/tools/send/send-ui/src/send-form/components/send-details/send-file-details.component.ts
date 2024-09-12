import { Component, Input, OnInit } from "@angular/core";

import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";

import { SendFormConfig } from "../../abstractions/send-form-config.service";

@Component({
  selector: "tools-send-file-details",
  template: "send-file-details.component.html",
  standalone: true,
})
export class SendFileDetailsComponent implements OnInit {
  @Input() config: SendFormConfig;
  @Input() originalSendView: SendView;
  /**
   * Whether to show the file selector.
   */
  @Input({ required: true }) showFileSelector: boolean;

  editMode = false;

  disableSend = false;

  constructor() {}

  async ngOnInit() {
    this.editMode = !!this.originalSendView;
  }
}

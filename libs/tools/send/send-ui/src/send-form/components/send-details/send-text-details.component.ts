import { Component, Input } from "@angular/core";

import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";

import { SendFormConfig } from "../../abstractions/send-form-config.service";

@Component({
  selector: "tools-send-text-details",
  template: "send-text-details.component.html",
  standalone: true,
})
export class SendTextDetailsComponent {
  @Input() config: SendFormConfig;
  @Input() originalSendView: SendView;
}

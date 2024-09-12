import { CommonModule, DatePipe } from "@angular/common";
import { Component, Input, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { JslibModule } from "@bitwarden/angular/jslib.module";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { SendType } from "@bitwarden/common/tools/send/enums/send-type";
import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";
import {
  SectionComponent,
  SectionHeaderComponent,
  TypographyModule,
  CardComponent,
  FormFieldModule,
  IconButtonModule,
  CheckboxModule,
  SelectModule,
} from "@bitwarden/components";

import { SendFormConfig } from "../../abstractions/send-form-config.service";
import { SendFormContainer } from "../../send-form-container";

import { BaseSendDetailsComponent } from "./base-send-details.component";
import { SendTextDetailsComponent } from "./send-text-details.component";

@Component({
  selector: "tools-send-details",
  templateUrl: "./send-details.component.html",
  standalone: true,
  imports: [
    SectionComponent,
    SectionHeaderComponent,
    TypographyModule,
    JslibModule,
    CardComponent,
    FormFieldModule,
    ReactiveFormsModule,
    SendTextDetailsComponent,
    IconButtonModule,
    CheckboxModule,
    CommonModule,
    SelectModule,
  ],
})
export class SendDetailsComponent extends BaseSendDetailsComponent implements OnInit {
  @Input() config: SendFormConfig;
  @Input() originalSendView: SendView;

  FileSendType = SendType.File;
  TextSendType = SendType.Text;

  constructor(
    protected sendFormContainer: SendFormContainer,
    protected formBuilder: FormBuilder,
    protected i18nService: I18nService,
    protected datePipe: DatePipe,
  ) {
    super(sendFormContainer, formBuilder, i18nService, datePipe);
  }

  async ngOnInit() {
    await super.ngOnInit();
  }
}

import { NgIf } from "@angular/common";
import {
  AfterViewInit,
  Component,
  DestroyRef,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormBuilder, ReactiveFormsModule } from "@angular/forms";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { SendType } from "@bitwarden/common/tools/send/enums/send-type";
import { SendView } from "@bitwarden/common/tools/send/models/view/send.view";
import {
  AsyncActionsModule,
  BitSubmitDirective,
  ButtonComponent,
  CardComponent,
  FormFieldModule,
  ItemModule,
  SectionComponent,
  SelectModule,
  ToastService,
  TypographyModule,
} from "@bitwarden/components";

import { SendFormConfig } from "../abstractions/send-form-config.service";
import { SendFormService } from "../abstractions/send-form.service";
import { SendForm, SendFormContainer } from "../send-form-container";

import { SendDetailsComponent } from "./send-details/send-details.component";

@Component({
  selector: "tools-send-form",
  templateUrl: "./send-form.component.html",
  standalone: true,
  providers: [
    {
      provide: SendFormContainer,
      useExisting: forwardRef(() => SendFormComponent),
    },
  ],
  imports: [
    AsyncActionsModule,
    CardComponent,
    SectionComponent,
    TypographyModule,
    ItemModule,
    FormFieldModule,
    ReactiveFormsModule,
    SelectModule,
    NgIf,
    SendDetailsComponent,
  ],
})
export class SendFormComponent implements AfterViewInit, OnInit, OnChanges, SendFormContainer {
  @ViewChild(BitSubmitDirective)
  private bitSubmit: BitSubmitDirective;
  private destroyRef = inject(DestroyRef);
  private _firstInitialized = false;

  /**
   * The form ID to use for the form. Used to connect it to a submit button.
   */
  @Input({ required: true }) formId: string;

  /**
   * The configuration for the add/edit form. Used to determine which controls are shown and what values are available.
   */
  @Input({ required: true }) config: SendFormConfig;

  /**
   * Optional submit button that will be disabled or marked as loading when the form is submitting.
   */
  @Input()
  submitBtn?: ButtonComponent;

  /**
   * Whether to show the file selector.
   */
  @Input({ required: true }) showFileSelector: boolean;

  /**
   * Event emitted when the send is saved successfully.
   */
  @Output() sendSaved = new EventEmitter<SendView>();

  /**
   * The original send being edited or cloned. Null for add mode.
   */
  originalSendView: SendView | null;

  /**
   * The form group for the send. Starts empty and is populated by child components via the `registerChildForm` method.
   * @protected
   */
  protected sendForm = this.formBuilder.group<SendForm>({});

  /**
   * The value of the updated send. Starts as a new send and is updated
   * by child components via the `patchSend` method.
   * @protected
   */
  protected updatedSendView: SendView | null;
  protected loading: boolean = true;

  SendType = SendType;

  ngAfterViewInit(): void {
    if (this.submitBtn) {
      this.bitSubmit.loading$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((loading) => {
        this.submitBtn.loading = loading;
      });

      this.bitSubmit.disabled$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((disabled) => {
        this.submitBtn.disabled = disabled;
      });
    }
  }

  /**
   * Registers a child form group with the parent form group. Used by child components to add their form groups to
   * the parent form for validation.
   * @param name - The name of the form group.
   * @param group - The form group to add.
   */
  registerChildForm<K extends keyof SendForm>(
    name: K,
    group: Exclude<SendForm[K], undefined>,
  ): void {
    this.sendForm.setControl(name, group);
  }

  /**
   * Method to update the sendView with the new values. This method should be called by the child form components
   * @param updateFn - A function that takes the current sendView and returns the updated sendView
   */
  patchSend(updateFn: (current: SendView) => SendView): void {
    this.updatedSendView = updateFn(this.updatedSendView);
  }

  /**
   * We need to re-initialize the form when the config is updated.
   */
  async ngOnChanges() {
    // Avoid re-initializing the form on the first change detection cycle.
    if (this._firstInitialized) {
      await this.init();
    }
  }

  async ngOnInit() {
    await this.init();
    this._firstInitialized = true;
  }

  async init() {
    this.loading = true;
    this.updatedSendView = new SendView();
    this.originalSendView = null;
    this.sendForm.reset();

    if (this.config == null) {
      return;
    }

    if (this.config.mode !== "add") {
      if (this.config.originalSend == null) {
        throw new Error("Original send is required for edit or clone mode");
      }

      this.originalSendView = await this.addEditFormService.decryptSend(this.config.originalSend);

      this.updatedSendView = Object.assign(this.updatedSendView, this.originalSendView);
    } else {
      this.updatedSendView.type = this.config.sendType;
    }

    this.loading = false;
  }

  constructor(
    private formBuilder: FormBuilder,
    private addEditFormService: SendFormService,
    private toastService: ToastService,
    private i18nService: I18nService,
  ) {}

  submit = async () => {
    if (this.sendForm.invalid) {
      this.sendForm.markAllAsTouched();
      return;
    }

    await this.addEditFormService.saveSend(this.updatedSendView, null, this.config);

    this.toastService.showToast({
      variant: "success",
      title: null,
      message: this.i18nService.t(
        this.config.mode === "edit" || this.config.mode === "partial-edit"
          ? "editedItem"
          : "addedItem",
      ),
    });

    this.sendSaved.emit(this.updatedSendView);
  };
}

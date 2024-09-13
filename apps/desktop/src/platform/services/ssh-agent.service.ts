import { Injectable, OnDestroy } from "@angular/core";
import {
  combineLatest,
  concatMap,
  filter,
  firstValueFrom,
  Subject,
  switchMap,
  takeUntil,
  timer,
} from "rxjs";

import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { AuthService } from "@bitwarden/common/auth/abstractions/auth.service";
import { AuthenticationStatus } from "@bitwarden/common/auth/enums/authentication-status";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { CommandDefinition, MessageListener } from "@bitwarden/common/platform/messaging";
import { CipherService } from "@bitwarden/common/vault/abstractions/cipher.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { DialogService, ToastService } from "@bitwarden/components";

import { ApproveSshRequestComponent } from "../components/approve-ssh-request";

import { DesktopSettingsService } from "./desktop-settings.service";

@Injectable({
  providedIn: "root",
})
export class SshAgentService implements OnDestroy {
  SSH_REFRESH_INTERVAL = 1000;
  SSH_VAULT_UNLOCK_REQUEST_TIMEOUT = 1000 * 60 * 5;
  SSH_REQUEST_UNLOCK_POLLING_INTERVAL = 100;

  private destroy$ = new Subject<void>();

  constructor(
    private cipherService: CipherService,
    private logService: LogService,
    private dialogService: DialogService,
    private messageListener: MessageListener,
    private authService: AuthService,
    private accountService: AccountService,
    private toastService: ToastService,
    private i18nService: I18nService,
    private desktopSettingsService: DesktopSettingsService,
  ) {
    this.messageListener
      .messages$(new CommandDefinition("sshagent.signrequest"))
      .pipe(
        switchMap(async (message: any) => {
          const cipherId = message.cipherId;
          const messageId = message.messageId;

          ipc.platform.focusWindow();

          const activeAccountId = (await firstValueFrom(this.accountService.activeAccount$)).id;
          const isLocked =
            (await firstValueFrom(this.authService.authStatusFor$(activeAccountId))) ===
            AuthenticationStatus.Locked;
          if (isLocked) {
            this.toastService.showToast({
              variant: "info",
              title: null,
              message: this.i18nService.t("sshAgentUnlockRequired"),
            });

            const unlocked = firstValueFrom(
              this.authService
                .authStatusFor$(activeAccountId)
                .pipe(filter((status) => status === AuthenticationStatus.Unlocked)),
            );
            const timeout = new Promise((_, reject) =>
              setTimeout(reject, this.SSH_VAULT_UNLOCK_REQUEST_TIMEOUT),
            );

            try {
              await Promise.race([unlocked, timeout]);
            } catch (error) {
              this.logService.error(error);
              this.logService.error("[Ssh Agent] Timeout waiting for unlock");
              this.toastService.showToast({
                variant: "error",
                title: null,
                message: this.i18nService.t("sshAgentUnlockTimeout"),
              });
              await ipc.platform.sshAgent.signRequestResponse(messageId, false);
              return;
            }
          }

          const decryptedCiphers = await this.cipherService.getAllDecrypted();
          const cipher = decryptedCiphers.find((cipher) => cipher.id == cipherId);

          const dialogRef = ApproveSshRequestComponent.open(
            this.dialogService,
            cipher.name,
            this.i18nService.t("unknownApplication"),
          );
          const result = await firstValueFrom(dialogRef.closed);
          await ipc.platform.sshAgent.signRequestResponse(messageId, result);
          ipc.platform.hideWindow();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();

    combineLatest([
      timer(0, this.SSH_REFRESH_INTERVAL),
      this.desktopSettingsService.sshAgentEnabled$,
    ])
      .pipe(
        concatMap(async ([, enabled]) => {
          if (!enabled) {
            await ipc.platform.sshAgent.setKeys([]);
            return;
          }

          const ciphers = await this.cipherService.getAllDecrypted();
          if (ciphers == null) {
            await ipc.platform.sshAgent.lock();
            return;
          }

          const sshCiphers = ciphers.filter(
            (cipher) => cipher.type === CipherType.SshKey && !cipher.isDeleted,
          );
          const keys = sshCiphers.map((cipher) => {
            return {
              name: cipher.name,
              privateKey: cipher.sshKey.privateKey,
              cipherId: cipher.id,
            };
          });
          await ipc.platform.sshAgent.setKeys(keys);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

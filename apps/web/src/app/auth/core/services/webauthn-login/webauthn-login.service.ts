import { Injectable, Optional } from "@angular/core";
import { BehaviorSubject, filter, from, map, Observable, shareReplay, switchMap, tap } from "rxjs";

import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { Verification } from "@bitwarden/common/types/verification";

import { CredentialCreateOptionsView } from "../../views/credential-create-options.view";
import { WebauthnCredentialView } from "../../views/webauth-credential.view";

import { SaveCredentialRequest } from "./request/save-credential.request";
import { WebauthnLoginAttestationResponseRequest } from "./request/webauthn-login-attestation-response.request";
import { WebauthnLoginApiService } from "./webauthn-login-api.service";

@Injectable()
export class WebauthnLoginService {
  private navigatorCredentials: CredentialsContainer;
  private _refresh$ = new BehaviorSubject<void>(undefined);
  private _loading$ = new BehaviorSubject<boolean>(true);

  readonly credentials$ = this._refresh$.pipe(
    tap(() => this._loading$.next(true)),
    switchMap(() => this.getCredentials$()),
    tap(() => this._loading$.next(false)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly loading$ = this._loading$.asObservable();

  constructor(
    private apiService: WebauthnLoginApiService,
    @Optional() navigatorCredentials?: CredentialsContainer,
    @Optional() private logService?: LogService
  ) {
    // Default parameters don't work when used with Angular DI
    this.navigatorCredentials = navigatorCredentials ?? navigator.credentials;
  }

  async getCredentialCreateOptions(
    verification: Verification
  ): Promise<CredentialCreateOptionsView> {
    const response = await this.apiService.getCredentialCreateOptions(verification);
    return new CredentialCreateOptionsView(response.options, response.token);
  }

  async createCredential(
    credentialOptions: CredentialCreateOptionsView
  ): Promise<PublicKeyCredential | undefined> {
    const nativeOptions: CredentialCreationOptions = {
      publicKey: credentialOptions.options,
    };

    try {
      const response = await this.navigatorCredentials.create(nativeOptions);
      if (!(response instanceof PublicKeyCredential)) {
        return undefined;
      }
      return response;
    } catch (error) {
      this.logService?.error(error);
      return undefined;
    }
  }

  async saveCredential(
    credentialOptions: CredentialCreateOptionsView,
    deviceResponse: PublicKeyCredential,
    name: string
  ) {
    const request = new SaveCredentialRequest();
    request.deviceResponse = new WebauthnLoginAttestationResponseRequest(deviceResponse);
    request.token = credentialOptions.token;
    request.name = name;
    await this.apiService.saveCredential(request);
    this.refresh();
  }

  getCredential$(credentialId: string): Observable<WebauthnCredentialView> {
    return this.credentials$.pipe(
      map(
        (credentials) => credentials.find((c) => c.id === credentialId),
        filter((c) => c !== undefined)
      )
    );
  }

  async deleteCredential(credentialId: string, verification: Verification): Promise<void> {
    await this.apiService.deleteCredential(credentialId, verification);
    this.refresh();
  }

  private getCredentials$(): Observable<WebauthnCredentialView[]> {
    return from(this.apiService.getCredentials()).pipe(map((response) => response.data));
  }

  private refresh() {
    this._refresh$.next();
  }
}

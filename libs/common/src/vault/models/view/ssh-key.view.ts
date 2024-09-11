import { Jsonify } from "type-fest";

import { SshKey } from "../domain/ssh-key";

import { ItemView } from "./item.view";

export class SshKeyView extends ItemView {
  privateKey: string = null;
  publicKey: string = null;
  keyFingerprint: string = null;

  constructor(n?: SshKey) {
    super();
    if (!n) {
      return;
    }
  }

  get subTitle(): string {
    return null;
  }

  static fromJSON(obj: Partial<Jsonify<SshKeyView>>): SshKeyView {
    return Object.assign(new SshKeyView(), obj);
  }
}

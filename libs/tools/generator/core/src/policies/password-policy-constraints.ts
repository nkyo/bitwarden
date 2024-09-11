import { PolicyConstraints, StateConstraints } from "@bitwarden/common/tools/types";

import { PasswordGeneratorSettings } from "../types";

import { fitToBounds, enforceConstant } from "./constraints";

export class PasswordPolicyConstraints implements StateConstraints<PasswordGeneratorSettings> {
  constructor(readonly constraints: PolicyConstraints<PasswordGeneratorSettings>) {}

  adjust(state: PasswordGeneratorSettings): PasswordGeneratorSettings {
    const result = {
      ...(state ?? {}),
      length: fitToBounds(state.length, this.constraints.length),
      lowercase: enforceConstant(state.lowercase, this.constraints.lowercase),
      uppercase: enforceConstant(state.uppercase, this.constraints.uppercase),
      number: enforceConstant(state.number, this.constraints.number),
      special: enforceConstant(state.special, this.constraints.special),
      minLowercase: fitToBounds(state.minLowercase, this.constraints.minLowercase),
      minUppercase: fitToBounds(state.minUppercase, this.constraints.minUppercase),
      minNumber: fitToBounds(state.minNumber, this.constraints.minNumber),
      minSpecial: fitToBounds(state.minSpecial, this.constraints.minSpecial),
      ambiguous: state.ambiguous,
    };

    return result;
  }

  fix(state: PasswordGeneratorSettings): PasswordGeneratorSettings {
    return state;
  }
}

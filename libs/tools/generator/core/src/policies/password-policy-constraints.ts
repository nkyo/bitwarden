import {
  DynamicStateConstraints,
  PolicyConstraints,
  StateConstraints,
} from "@bitwarden/common/tools/types";

import { DefaultPasswordBoundaries } from "../data";
import { Boundary, PasswordGeneratorPolicy, PasswordGeneratorSettings } from "../types";

import {
  atLeast,
  atLeastSum,
  maybe,
  maybeReadonly,
  AtLeastOne,
  RequiresTrue,
  fitToBounds,
  enforceConstant,
} from "./constraints";

export class DynamicPasswordPolicyConstraints
  implements DynamicStateConstraints<PasswordGeneratorSettings>
{
  constructor(policy: PasswordGeneratorPolicy) {
    function readOnlyTrueWhen(enabled: boolean) {
      const readonlyValue = maybeReadonly(enabled, RequiresTrue);
      const maybeReadonlyValue = maybe(enabled, readonlyValue);
      return maybeReadonlyValue;
    }

    const minLowercase = maybe(policy.useLowercase, AtLeastOne);
    const minUppercase = maybe(policy.useUppercase, AtLeastOne);
    const minNumber = maybe(
      policy.useNumbers,
      atLeast(policy.numberCount, DefaultPasswordBoundaries.minDigits),
    );
    const minSpecial = maybe(
      policy.useSpecial,
      atLeast(policy.specialCount, DefaultPasswordBoundaries.minSpecialCharacters),
    );

    const length = atLeastSum(atLeast(policy.minLength, DefaultPasswordBoundaries.length), [
      minLowercase,
      minUppercase,
      minNumber,
      minSpecial,
    ]);

    this.constraints = Object.freeze({
      policyInEffect: policyInEffect(policy),
      lowercase: readOnlyTrueWhen(policy.useLowercase),
      uppercase: readOnlyTrueWhen(policy.useUppercase),
      number: readOnlyTrueWhen(policy.useNumbers),
      special: readOnlyTrueWhen(policy.useSpecial),
      length,
      minLowercase,
      minUppercase,
      minNumber,
      minSpecial,
    });
  }

  /** Constraints derived from the policy and application-defined defaults */
  readonly constraints: PolicyConstraints<PasswordGeneratorSettings>;

  /** Boundaries for the password length. This is always large enough
   * to accommodate the minimum number of digits and special characters.
   */
  readonly length: Boundary;

  calibrate(state: PasswordGeneratorSettings): StateConstraints<PasswordGeneratorSettings> {
    // decide which constraints are active
    const lowercase = state.lowercase || this.constraints.lowercase.requiredValue || false;
    const uppercase = state.uppercase || this.constraints.uppercase.requiredValue || false;
    const number = state.number || this.constraints.number.requiredValue || false;
    const special = state.special || this.constraints.special.requiredValue || false;

    const constraints: PolicyConstraints<PasswordGeneratorSettings> = {
      ...this.constraints,
      minLowercase: maybe(lowercase, this.constraints.minLowercase ?? AtLeastOne),
      minUppercase: maybe(uppercase, this.constraints.minUppercase ?? AtLeastOne),
      minNumber: maybe(number, this.constraints.minNumber ?? AtLeastOne),
      minSpecial: maybe(special, this.constraints.minSpecial ?? AtLeastOne),
    };

    // lower bound of length must always at least fit its sub-lengths
    constraints.length = atLeastSum(this.constraints.length, [
      atLeast(state.minNumber, constraints.minNumber),
      atLeast(state.minSpecial, constraints.minSpecial),
      atLeast(state.minLowercase, constraints.minLowercase),
      atLeast(state.minUppercase, constraints.minUppercase),
    ]);

    const stateConstraints = new PasswordGeneratorConstraints(constraints);
    return stateConstraints;
  }
}

export class PasswordGeneratorConstraints implements StateConstraints<PasswordGeneratorSettings> {
  constructor(readonly constraints: PolicyConstraints<PasswordGeneratorSettings>) {}

  adjust(state: PasswordGeneratorSettings): PasswordGeneratorSettings {
    const result = {
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

function policyInEffect(policy: PasswordGeneratorPolicy): boolean {
  const policies = [
    policy.useUppercase,
    policy.useLowercase,
    policy.useNumbers,
    policy.useSpecial,
    policy.minLength > DefaultPasswordBoundaries.length.min,
    policy.numberCount > DefaultPasswordBoundaries.minDigits.min,
    policy.specialCount > DefaultPasswordBoundaries.minSpecialCharacters.min,
  ];

  return policies.includes(true);
}

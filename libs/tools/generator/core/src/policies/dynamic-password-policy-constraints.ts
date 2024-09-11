import {
  Constraint,
  DynamicStateConstraints,
  PolicyConstraints,
  StateConstraints,
} from "@bitwarden/common/tools/types";

import { DefaultPasswordBoundaries } from "../data";
import { PasswordGeneratorPolicy, PasswordGeneratorSettings } from "../types";

import { atLeast, atLeastSum, maybe, maybeReadonly, AtLeastOne, RequiresTrue } from "./constraints";
import { PasswordPolicyConstraints } from "./password-policy-constraints";

export class DynamicPasswordPolicyConstraints
  implements DynamicStateConstraints<PasswordGeneratorSettings>
{
  constructor(policy: PasswordGeneratorPolicy) {
    function readOnlyTrueWhen(enabled: boolean) {
      const readonlyValue = maybeReadonly(enabled, RequiresTrue);
      const maybeReadonlyValue = maybe(enabled, readonlyValue);
      return maybeReadonlyValue;
    }

    function minimumWhen(enabled: boolean, count: number, initial: Constraint<number>) {
      const policyMinimum = atLeast(count, AtLeastOne);
      const baseValue = atLeastSum(initial, [policyMinimum]);
      const constraint = maybe(enabled, baseValue) ?? initial;

      return constraint;
    }

    const minLowercase = maybe(policy.useLowercase, AtLeastOne);
    const minUppercase = maybe(policy.useUppercase, AtLeastOne);

    const minNumber = minimumWhen(
      policy.useNumbers,
      policy.numberCount,
      DefaultPasswordBoundaries.minDigits,
    );

    const minSpecial = minimumWhen(
      policy.useSpecial,
      policy.specialCount,
      DefaultPasswordBoundaries.minSpecialCharacters,
    );

    const baseLength = atLeast(policy.minLength, DefaultPasswordBoundaries.length);
    const subLengths = [minLowercase, minUppercase, minNumber, minSpecial];
    const length = atLeastSum(baseLength, subLengths);

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

  calibrate(state: PasswordGeneratorSettings): StateConstraints<PasswordGeneratorSettings> {
    // decide which constraints are active
    const lowercase = state.lowercase || this.constraints.lowercase?.requiredValue || false;
    const uppercase = state.uppercase || this.constraints.uppercase?.requiredValue || false;
    const number = state.number || this.constraints.number?.requiredValue || false;
    const special = state.special || this.constraints.special?.requiredValue || false;

    // minimum constraints cannot `atLeast(state...) because doing so would force
    // the constrained value to only increase
    const constraints: PolicyConstraints<PasswordGeneratorSettings> = {
      ...this.constraints,
      minLowercase: maybe<number>(lowercase, this.constraints.minLowercase),
      minUppercase: maybe<number>(uppercase, this.constraints.minUppercase),
      minNumber: maybe<number>(number, this.constraints.minNumber),
      minSpecial: maybe<number>(special, this.constraints.minSpecial),
    };

    // lower bound of length must always at least fit its sub-lengths
    constraints.length = atLeastSum(this.constraints.length, [
      atLeast(state.minNumber, constraints.minNumber),
      atLeast(state.minSpecial, constraints.minSpecial),
      atLeast(state.minLowercase, constraints.minLowercase),
      atLeast(state.minUppercase, constraints.minUppercase),
    ]);

    const stateConstraints = new PasswordPolicyConstraints(constraints);
    return stateConstraints;
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

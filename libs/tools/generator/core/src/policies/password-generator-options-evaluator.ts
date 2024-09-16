import { PolicyEvaluator } from "../abstractions";
import {
  Boundary,
  PasswordGeneratorPolicy,
  PasswordGenerationOptions,
  PasswordGeneratorSettings,
} from "../types";

import { DynamicPasswordPolicyConstraints } from "./dynamic-password-policy-constraints";

/** Enforces policy for password generation.
 *  @deprecated use `DynamicPasswordPolicyConstraints` instead.
 */
export class PasswordGeneratorOptionsEvaluator
  implements PolicyEvaluator<PasswordGeneratorPolicy, PasswordGenerationOptions>
{
  // Constraints<PasswordGenerationOptions> compatibility
  get minNumber() {
    return this.constraints.constraints.minNumber;
  }

  get minSpecial() {
    return this.constraints.constraints.minSpecial;
  }

  /** Boundaries for the password length. This is always large enough
   * to accommodate the minimum number of digits and special characters.
   */
  get length(): Boundary {
    return this.constraints.constraints.length as Boundary;
  }

  /** Boundaries for the minimum number of digits allowed in the password.
   */
  get minDigits(): Boundary {
    return this.constraints.constraints.minNumber as Boundary;
  }

  /** Boundaries for the minimum number of special characters allowed
   *  in the password.
   */
  get minSpecialCharacters(): Boundary {
    return this.constraints.constraints.minSpecial as Boundary;
  }

  /** Policy applied by the evaluator.
   */
  readonly policy: PasswordGeneratorPolicy;

  private readonly constraints: DynamicPasswordPolicyConstraints;

  /** Instantiates the evaluator.
   * @param policy The policy applied by the evaluator. When this conflicts with
   *               the defaults, the policy takes precedence.
   */
  constructor(policy: PasswordGeneratorPolicy) {
    this.policy = structuredClone(policy);
    this.constraints = new DynamicPasswordPolicyConstraints(policy);
  }

  /** {@link PolicyEvaluator.policyInEffect} */
  get policyInEffect(): boolean {
    return this.constraints.constraints.policyInEffect ?? false;
  }

  /** {@link PolicyEvaluator.applyPolicy} */
  applyPolicy(options: PasswordGenerationOptions): PasswordGenerationOptions {
    const settings = options as PasswordGeneratorSettings;
    const calibration = this.constraints.calibrate(settings);
    const adjusted: PasswordGenerationOptions = calibration.adjust(settings);

    return adjusted;
  }

  /** {@link PolicyEvaluator.sanitize} */
  sanitize(options: PasswordGenerationOptions): PasswordGenerationOptions {
    function cascade(enabled: boolean, value: number): [boolean, number] {
      const enabledResult = enabled ?? value > 0;
      const valueResult = enabledResult ? value || 1 : 0;

      return [enabledResult, valueResult];
    }

    const settings = options as PasswordGeneratorSettings;
    const calibration = this.constraints.calibrate(settings);
    const adjusted: PasswordGenerationOptions = calibration.adjust(settings);
    adjusted.minLength = calibration.constraints.length.min;

    // The legacy UI uses nullish values to communicate that the evaluator should
    // perform a cascade.
    const [number, minNumber] = cascade(options.number, options.minNumber);
    const [special, minSpecial] = cascade(options.special, options.minSpecial);
    if (number) {
      adjusted.minNumber = minNumber;
    }

    if (special) {
      adjusted.minSpecial = minSpecial;
    }

    return adjusted;
  }
}

import { StateConstraints } from "@bitwarden/common/tools/types";

import { PolicyEvaluator } from "../abstractions";
import { Boundary, PassphraseGenerationOptions, PassphraseGeneratorPolicy } from "../types";

import { PassphrasePolicyConstraints } from "./passphrase-policy-constraints";

/** Enforces policy for passphrase generation options.
 *  @deprecated Use PassphrasePolicyConstraints instead.
 */
export class PassphraseGeneratorOptionsEvaluator
  implements PolicyEvaluator<PassphraseGeneratorPolicy, PassphraseGenerationOptions>
{
  /** Policy applied by the evaluator.
   */
  readonly policy: PassphraseGeneratorPolicy;

  /** Boundaries for the number of words allowed in the password.
   */
  get numWords(): Boundary {
    return this.constraints.constraints.numWords as Boundary;
  }

  /** Instantiates the evaluator.
   * @param policy The policy applied by the evaluator. When this conflicts with
   *               the defaults, the policy takes precedence.
   */
  constructor(policy: PassphraseGeneratorPolicy) {
    this.policy = structuredClone(policy);
    this.constraints = new PassphrasePolicyConstraints(policy);
  }

  private readonly constraints: PassphrasePolicyConstraints;

  /** {@link PolicyEvaluator.policyInEffect} */
  get policyInEffect(): boolean {
    return this.constraints.constraints.policyInEffect;
  }

  /** Apply policy to the input options.
   *  @param options The options to build from. These options are not altered.
   *  @returns A new password generation request with policy applied.
   */
  applyPolicy(options: PassphraseGenerationOptions): PassphraseGenerationOptions {
    return evaluate(options, this.constraints);
  }

  /** Ensures internal options consistency.
   *  @param options The options to cascade. These options are not altered.
   *  @returns A passphrase generation request with cascade applied.
   */
  sanitize(options: PassphraseGenerationOptions): PassphraseGenerationOptions {
    return evaluate(options, this.constraints);
  }
}

function evaluate(
  options: PassphraseGenerationOptions,
  constraints: StateConstraints<PassphraseGenerationOptions>,
) {
  const withDefaults = { ...options };

  // compatibility - the evaluator fills nullish values; in practice
  // this shouldn't happen, but there's a unit test for it.
  withDefaults.capitalize ||= false;
  withDefaults.includeNumber ||= false;
  withDefaults.wordSeparator ??= "-";

  return {
    ...options,
    ...constraints.adjust(withDefaults),
  };
}

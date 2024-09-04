import { Simplify } from "type-fest";

/** Constraints that are shared by all primitive field types */
type PrimitiveConstraint = {
  /** presence indicates the field is required */
  required?: true;
};

/** Constraints that are shared by string fields */
type StringConstraints = {
  /** minimum string length. When absent, min length is 0. */
  minLength?: number;

  /** maximum string length. When absent, max length is unbounded. */
  maxLength?: number;
};

/** Constraints that are shared by number fields */
type NumberConstraints = {
  /** minimum number value. When absent, min value is unbounded. */
  min?: number;

  /** maximum number value. When absent, min value is unbounded. */
  max?: number;

  /** presence indicates the field only accepts integer values */
  integer?: true;

  /** requires the number be a multiple of the step value */
  step?: number;
};

/** Utility type that transforms keys of T into their supported
 *  validators.
 */
export type Constraints<T> = {
  [Key in keyof T]?: Simplify<
    PrimitiveConstraint &
      (T[Key] extends string
        ? StringConstraints
        : T[Key] extends number
          ? NumberConstraints
          : never)
  >;
};

/** utility type for methods that evaluate constraints generically. */
export type AnyConstraint = PrimitiveConstraint & StringConstraints & NumberConstraints;

/** Constraints that are applied automatically to application state.
 *  @remarks this type automatically corrects incoming our outgoing
 *   data. If you would like to prevent invalid data from being
 *   applied, use an rxjs filter and evaluate `Constraints<State>`
 *   instead.
 */
export type StateConstraints<State> = {
  /** The constraints applied by this type */
  readonly constraints: Readonly<Constraints<State>>;

  /** Enforces constraints that always hold for the emitted state.
   *  @remarks This is useful for enforcing "override" constraints,
   *   such as when a policy requires a value fall within a specific
   *   range.
   *  @param state the state pending emission from the subject.
   *  @return the value emitted by the subject
   */
  normalize: (state: State) => State;

  /** Enforces constraints that holds when the subject completes.
   *  @remarks This is useful for enforcing "default" constraints,
   *   such as when a policy requires some state is true when data is
   *   first subscribed, but the state may vary thereafter.
   *  @param state the state of the subject immediately before
   *   completion.
   *  @return the value stored to state upon completion.
   */
  finalize: (state: State) => State;
};

/** Options that provide contextual information about the application state
 *  when a generator is invoked.
 */
export type VaultItemRequest = {
  /** The domain of the website the requested credential is used
   *  within. This should be set to `null` when the request is not specific
   *  to any website.
   *  @remarks this field contains sensitive data
   */
  website: string | null;
};

/** Options that provide contextual information about the application state
 *  when a generator is invoked.
 */
export type GenerationRequest = Partial<VaultItemRequest>;

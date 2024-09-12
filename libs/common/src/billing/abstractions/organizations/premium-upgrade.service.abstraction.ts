/**
 * This interface defines the a contract for a service that handles premium upgrade requests.
 * It ensures that PremiumUpgradeService contains a getPremium method.
 */
export abstract class PremiumUpgradeService {
  abstract getPremium(): Promise<void>;
}

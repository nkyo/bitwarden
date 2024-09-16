import { NgModule } from "@angular/core";

import { HeaderModule } from "../../layouts/header/header.module";
import { BillingSharedModule } from "../shared";

import { BillingHistoryViewComponent } from "./billing-history-view.component";
import { IndividualBillingRoutingModule } from "./individual-billing-routing.module";
import { PremiumV3Component } from "@bitwarden/web-vault/app/billing/individual/premium/premium-v3.component";
import { PremiumV2Component } from "./premium/premium-v2.component";
import { PremiumComponent } from "./premium/premium.component";
import { SubscriptionComponent } from "./subscription.component";
import { UserSubscriptionComponent } from "./user-subscription.component";

@NgModule({
  imports: [IndividualBillingRoutingModule, BillingSharedModule, HeaderModule],
  declarations: [
    SubscriptionComponent,
    BillingHistoryViewComponent,
    UserSubscriptionComponent,
    PremiumComponent,
    PremiumV2Component,
    PremiumV3Component,
  ],
})
export class IndividualBillingModule {}

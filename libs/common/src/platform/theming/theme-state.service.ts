import { Observable, combineLatest, map, skipWhile, tap } from "rxjs";

import { FeatureFlag } from "../../enums/feature-flag.enum";
import { ConfigService } from "../abstractions/config/config.service";
import { ThemeType } from "../enums";
import { GlobalStateProvider, KeyDefinition, THEMING_DISK } from "../state";

export abstract class ThemeStateService {
  /**
   * The users selected theme.
   */
  abstract selectedTheme$: Observable<ThemeType>;

  /**
   * A method for updating the current users configured theme.
   * @param theme The chosen user theme.
   */
  abstract setSelectedTheme(theme: ThemeType): Promise<void>;
}

export const THEME_SELECTION = new KeyDefinition<ThemeType>(THEMING_DISK, "selection", {
  deserializer: (s) => s,
});

export class DefaultThemeStateService implements ThemeStateService {
  private readonly selectedThemeState = this.globalStateProvider.get(THEME_SELECTION);

  selectedTheme$ = combineLatest([
    this.selectedThemeState.state$,
    this.configService.getFeatureFlag$(FeatureFlag.ExtensionRefresh),
  ]).pipe(
    tap(async ([theme, isExtensionRefresh]) => {
      // The extension refresh should not allow for Nord or SolarizedDark
      // Update the theme to use the system theme
      if (isExtensionRefresh && [ThemeType.Nord, ThemeType.SolarizedDark].includes(theme)) {
        await this.setSelectedTheme(ThemeType.System);
      }
    }),
    skipWhile(
      ([theme, isExtensionRefresh]) =>
        isExtensionRefresh && [ThemeType.Nord, ThemeType.SolarizedDark].includes(theme),
    ),
    map(([theme]) => theme ?? this.defaultTheme),
  );

  constructor(
    private globalStateProvider: GlobalStateProvider,
    private configService: ConfigService,
    private defaultTheme: ThemeType = ThemeType.System,
  ) {}

  async setSelectedTheme(theme: ThemeType): Promise<void> {
    await this.selectedThemeState.update(() => theme, {
      shouldUpdate: (currentTheme) => currentTheme !== theme,
    });
  }
}

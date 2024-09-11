import * as path from "path";
import * as url from "url";

import { app, BrowserWindow, Menu, MenuItemConstructorOptions, nativeImage, Tray } from "electron";
import { firstValueFrom } from "rxjs";

import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";

import { DesktopSettingsService } from "../platform/services/desktop-settings.service";
import { cleanUserAgent } from "../utils";

import { WindowMain } from "./window.main";

export class TrayMain {
  contextMenu: Menu;

  private appName: string;
  private tray: Tray;
  private icon: string | Electron.NativeImage;
  private pressedIcon: Electron.NativeImage;

  constructor(
    private windowMain: WindowMain,
    private i18nService: I18nService,
    private desktopSettingsService: DesktopSettingsService,
  ) {
    if (process.platform === "win32") {
      this.icon = path.join(__dirname, "/images/icon.ico");
    } else if (process.platform === "darwin") {
      const nImage = nativeImage.createFromPath(path.join(__dirname, "/images/icon-template.png"));
      nImage.setTemplateImage(true);
      this.icon = nImage;
      this.pressedIcon = nativeImage.createFromPath(
        path.join(__dirname, "/images/icon-highlight.png"),
      );
    } else {
      this.icon = path.join(__dirname, "/images/icon.png");
    }
  }

  async init(appName: string, additionalMenuItems: MenuItemConstructorOptions[] = null) {
    this.appName = appName;

    const menuItemOptions: MenuItemConstructorOptions[] = [
      {
        label: this.i18nService.t("showHide"),
        click: () => this.toggleWindow(),
      },
      {
        label: "Fake Popup",
        click: () => this.fakePopup(),
      },
      { type: "separator" },
      {
        label: this.i18nService.t("exit"),
        click: () => this.closeWindow(),
      },
    ];

    if (additionalMenuItems != null) {
      menuItemOptions.splice(1, 0, ...additionalMenuItems);
    }

    this.contextMenu = Menu.buildFromTemplate(menuItemOptions);
    if (await firstValueFrom(this.desktopSettingsService.trayEnabled$)) {
      this.showTray();
    }
  }

  setupWindowListeners(win: BrowserWindow) {
    win.on("minimize", async (e: Event) => {
      if (await firstValueFrom(this.desktopSettingsService.minimizeToTray$)) {
        e.preventDefault();
        // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.hideToTray();
      }
    });

    win.on("close", async (e: Event) => {
      if (await firstValueFrom(this.desktopSettingsService.closeToTray$)) {
        if (!this.windowMain.isQuitting) {
          e.preventDefault();
          // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.hideToTray();
        }
      }
    });

    win.on("show", async () => {
      const enableTray = await firstValueFrom(this.desktopSettingsService.trayEnabled$);
      if (!enableTray) {
        setTimeout(() => this.removeTray(false), 100);
      }
    });
  }

  removeTray(showWindow = true) {
    // Due to https://github.com/electron/electron/issues/17622
    // we cannot destroy the tray icon on linux.
    if (this.tray != null && process.platform !== "linux") {
      this.tray.destroy();
      this.tray = null;
    }

    if (showWindow && this.windowMain.win != null && !this.windowMain.win.isVisible()) {
      this.windowMain.win.show();
    }
  }

  async hideToTray() {
    this.showTray();
    if (this.windowMain.win != null) {
      this.windowMain.win.hide();
    }
    if (this.isDarwin() && !(await firstValueFrom(this.desktopSettingsService.alwaysShowDock$))) {
      this.hideDock();
    }
  }

  restoreFromTray() {
    if (this.windowMain.win == null || !this.windowMain.win.isVisible()) {
      // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.toggleWindow();
    }
  }

  showTray() {
    if (this.tray != null) {
      return;
    }

    this.tray = new Tray(this.icon);
    this.tray.setToolTip(this.appName);
    this.tray.on("click", () => this.toggleWindow());
    this.tray.on("right-click", () => this.tray.popUpContextMenu(this.contextMenu));

    if (this.pressedIcon != null) {
      this.tray.setPressedImage(this.pressedIcon);
    }
    if (this.contextMenu != null && !this.isDarwin()) {
      this.tray.setContextMenu(this.contextMenu);
    }
  }

  updateContextMenu() {
    if (this.tray != null && this.contextMenu != null && this.isLinux()) {
      this.tray.setContextMenu(this.contextMenu);
    }
  }

  private hideDock() {
    app.dock.hide();
  }

  private showDock() {
    // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    app.dock.show();
  }

  private isDarwin() {
    return process.platform === "darwin";
  }

  private isLinux() {
    return process.platform === "linux";
  }

  private async toggleWindow() {
    if (this.windowMain.win == null) {
      if (this.isDarwin()) {
        // On MacOS, closing the window via the red button destroys the BrowserWindow instance.
        // FIXME: Verify that this floating promise is intentional. If it is, add an explanatory comment and ensure there is proper error handling.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.windowMain.createWindow().then(() => {
          this.windowMain.win.show();
          this.showDock();
        });
      }
      return;
    }
    if (this.windowMain.win.isVisible()) {
      this.windowMain.win.hide();
      if (this.isDarwin() && !(await firstValueFrom(this.desktopSettingsService.alwaysShowDock$))) {
        this.hideDock();
      }
    } else {
      this.windowMain.win.show();
      if (this.isDarwin()) {
        this.showDock();
      }
    }
  }

  private closeWindow() {
    this.windowMain.isQuitting = true;
    if (this.windowMain.win != null) {
      this.windowMain.win.close();
    }
  }

  private async fakePopup() {
    if (this.windowMain.win == null || this.windowMain.win.isDestroyed()) {
      await this.windowMain.createWindow("minimal-app");
      return;
    }

    // Restyle existing
    const existingWin = this.windowMain.win;

    existingWin.setBounds({
      width: 500,
      height: 400,
    });
    existingWin.setSize(450, 450, true);
    existingWin.setWindowButtonVisibility(false);
    existingWin.resizable = false;
    await existingWin.loadURL(
      url.format({
        protocol: "file:",
        //pathname: `${__dirname}/index.html`,
        pathname: path.join(__dirname, "/index.html"),
        slashes: true,
        hash: "/passkeys",
        query: {
          redirectUrl: "/passkeys",
        },
      }),
      {
        userAgent: cleanUserAgent(existingWin.webContents.userAgent),
      },
    );
    existingWin.center();
    existingWin.setAlwaysOnTop(true);
    existingWin.show();
    // TODO: Do things
    // ?? Enqueue the browser location
    // Change browser location and styling to minimal

    // Show popup
    // Change styling back to full
    // ?? Dequeue browser location
  }
}

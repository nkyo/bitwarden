import { Overlay, OverlayConfig, OverlayRef } from "@angular/cdk/overlay";
import { TemplatePortal } from "@angular/cdk/portal";
import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Input,
  OnDestroy,
  ViewContainerRef,
} from "@angular/core";
import { fromEvent, Observable, Subscription } from "rxjs";
import { filter, mergeWith } from "rxjs/operators";

import { MenuComponent } from "./menu.component";

@Directive({
  selector: "[bitMenuTriggerFor]",
  exportAs: "menuTrigger",
})
export class MenuTriggerForDirective implements OnDestroy {
  @HostBinding("attr.aria-expanded") isOpen = false;
  @HostBinding("attr.aria-haspopup") get hasPopup(): "menu" | "dialog" {
    return this.menu?.ariaRole || "menu";
  }
  @HostBinding("attr.role")
  @Input()
  role = "button";

  @Input("bitMenuTriggerFor") menu: MenuComponent;

  private overlayRef: OverlayRef;
  private defaultMenuConfig: OverlayConfig = {
    panelClass: "bit-menu-panel",
    hasBackdrop: true,
    backdropClass: "cdk-overlay-transparent-backdrop",
    scrollStrategy: this.overlay.scrollStrategies.reposition(),
    positionStrategy: this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: "start",
          originY: "bottom",
          overlayX: "start",
          overlayY: "top",
        },
        {
          originX: "end",
          originY: "bottom",
          overlayX: "end",
          overlayY: "top",
        },
      ])
      .withLockedPosition(true)
      .withFlexibleDimensions(false)
      .withPush(true),
  };
  private closedEventsSub: Subscription;
  private keyDownEventsSub: Subscription;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private viewContainerRef: ViewContainerRef,
    private overlay: Overlay,
  ) {}

  @HostListener("click") toggleMenu() {
    this.isOpen ? this.destroyMenu() : this.openMenu();
  }

  toggleMenuOnRightClick(position: { x: number; y: number }) {
    if (this.isOpen) {
      this.updateMenuPosition(position);
    } else {
      this.openMenu(position);
    }
  }

  ngOnDestroy() {
    this.disposeAll();
  }

  private openMenu(position?: { x: number; y: number }) {
    if (this.menu == null) {
      throw new Error("Cannot find bit-menu element");
    }

    this.isOpen = true;

    const positionStrategy = position
      ? this.overlay
          .position()
          .flexibleConnectedTo(position)
          .withPositions([
            {
              originX: "start",
              originY: "top",
              overlayX: "start",
              overlayY: "top",
            },
          ])
      : this.defaultMenuConfig.positionStrategy;

    const config = { ...this.defaultMenuConfig, positionStrategy };

    this.overlayRef = this.overlay.create(config);

    const templatePortal = new TemplatePortal(this.menu.templateRef, this.viewContainerRef);
    this.overlayRef.attach(templatePortal);

    this.closedEventsSub = this.getClosedEvents().subscribe((event: KeyboardEvent | undefined) => {
      if (["Tab", "Escape"].includes(event?.key)) {
        // Required to ensure tab order resumes correctly
        this.elementRef.nativeElement.focus();
      }
      this.destroyMenu();
    });
    if (this.menu.keyManager) {
      this.menu.keyManager.setFirstItemActive();
      this.keyDownEventsSub = this.overlayRef
        .keydownEvents()
        .subscribe((event: KeyboardEvent) => this.menu.keyManager.onKeydown(event));
    }
  }

  private updateMenuPosition(position: { x: number; y: number }) {
    if (this.overlayRef == null) {
      return;
    }

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(position)
      .withPositions([
        {
          originX: "start",
          originY: "top",
          overlayX: "start",
          overlayY: "top",
        },
      ]);

    this.overlayRef.updatePositionStrategy(positionStrategy);
  }

  private destroyMenu() {
    if (this.overlayRef == null || !this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.disposeAll();
  }

  private getClosedEvents(): Observable<any> {
    const detachments = this.overlayRef.detachments();
    const escKey = this.overlayRef.keydownEvents().pipe(
      filter((event: KeyboardEvent) => {
        const keys = this.menu.ariaRole === "menu" ? ["Escape", "Tab"] : ["Escape"];
        return keys.includes(event.key);
      }),
    );
    const backdrop = this.overlayRef.backdropClick();
    const menuClosed = this.menu.closed;

    const rightClickOutside = fromEvent<MouseEvent>(document, "contextmenu").pipe(
      filter((event: MouseEvent) => {
        return !this.overlayRef.overlayElement.contains(event.target as HTMLElement);
      }),
    );

    return detachments.pipe(mergeWith(escKey, backdrop, menuClosed, rightClickOutside));
  }

  private disposeAll() {
    this.closedEventsSub?.unsubscribe();
    this.overlayRef?.dispose();
    this.keyDownEventsSub?.unsubscribe();
  }
}

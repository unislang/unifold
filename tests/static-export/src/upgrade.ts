import {
  UnifoldApplicationMountMode,
  UnifoldApplicationMountStatus,
  mountUnifoldApplication,
  type MountUnifoldApplicationResult,
  type UnifoldApplicationPort
} from "@unislang/unifold";
import type { UiEvent } from "@unislang/unifold-events";

import uiDefinition from "../ui.json";

export interface StaticUpgradeResult {
  readonly diagnostics: MountUnifoldApplicationResult["diagnostics"];
  readonly status: UnifoldApplicationMountStatus;
}

interface StaticUpgradeWindow extends Window {
  __unifoldStaticEvents: UiEvent[];
  __unifoldStaticResult?: StaticUpgradeResult;
  __unifoldUpgradeStatic(): StaticUpgradeResult;
}

export function isManualUpgrade(location: Pick<Location, "search">): boolean {
  return new URLSearchParams(location.search).get("upgrade") === "manual";
}

export function installStaticUpgrade(target: StaticUpgradeWindow, owner: Document): void {
  let application: UnifoldApplicationPort | undefined;
  target.__unifoldStaticEvents = [];
  target.__unifoldUpgradeStatic = () => {
    if (application !== undefined) return mountedResult();
    const result = mountStaticApplication(owner);
    target.__unifoldStaticResult = publicResult(result);
    if (result.status === UnifoldApplicationMountStatus.Mounted) {
      application = result.application;
      captureEvents(application, target.__unifoldStaticEvents);
    }
    return target.__unifoldStaticResult;
  };
  if (!isManualUpgrade(target.location)) target.__unifoldUpgradeStatic();
}

function mountStaticApplication(owner: Document): MountUnifoldApplicationResult {
  const container = owner.querySelector("main");
  if (!(container instanceof HTMLElement)) throw new Error("Static export main is missing.");
  return mountUnifoldApplication(uiDefinition, container, {
    mountMode: UnifoldApplicationMountMode.UpgradeStatic
  });
}

function captureEvents(application: UnifoldApplicationPort, events: UiEvent[]): void {
  application.runtime.events$.subscribe((event) => events.push(event));
}

function publicResult(result: MountUnifoldApplicationResult): StaticUpgradeResult {
  return { diagnostics: result.diagnostics, status: result.status };
}

function mountedResult(): StaticUpgradeResult {
  return { diagnostics: [], status: UnifoldApplicationMountStatus.Mounted };
}

function installBrowserUpgrade(): void {
  if (typeof window === "undefined") return;
  if (document.querySelector("[data-unifold-static-document]") === null) return;
  installStaticUpgrade(window as unknown as StaticUpgradeWindow, document);
}

installBrowserUpgrade();

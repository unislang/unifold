import type {
  UnifoldBreadcrumb,
  UnifoldDialog,
  UnifoldMenuButton,
  UnifoldPopover,
  UnifoldStepper,
  UnifoldTabs,
  UnifoldWizard
} from "@unislang/unifold-elements";
import type { UnifoldApplicationPort } from "@unislang/unifold";

export interface MountedWorkflow {
  readonly application: UnifoldApplicationPort;
  readonly breadcrumb: UnifoldBreadcrumb;
  readonly container: HTMLElement;
  readonly dialog: UnifoldDialog;
  readonly menu: UnifoldMenuButton;
  readonly popover: UnifoldPopover;
  readonly stepper: UnifoldStepper;
  readonly tabs: UnifoldTabs;
  readonly wizard: UnifoldWizard;
}

export interface WorkflowInteraction {
  readonly breadcrumbItemId: string;
  readonly breadcrumbMilliseconds: number;
  readonly breadcrumbRenderedItems: number;
  readonly dialogFocused: boolean;
  readonly dialogMilliseconds: number;
  readonly dialogOpen: boolean;
  readonly menuItemId: string;
  readonly menuMilliseconds: number;
  readonly menuTriggerFocused: boolean;
  readonly popoverFocused: boolean;
  readonly popoverMilliseconds: number;
  readonly popoverOpen: boolean;
  readonly renderedButtons: number;
  readonly stepperMilliseconds: number;
  readonly stepperValue: string;
  readonly tabMilliseconds: number;
  readonly tabValue: string;
  readonly visibleTabPanels: number;
  readonly visiblePanels: number;
  readonly wizardMilliseconds: number;
  readonly wizardValue: string;
}

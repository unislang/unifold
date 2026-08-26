import { TooltipPlacement } from "@unislang/unifold-catalog";

export const TooltipDirection = { LeftToRight: "ltr", RightToLeft: "rtl" } as const;
export type TooltipDirection = (typeof TooltipDirection)[keyof typeof TooltipDirection];

export interface TooltipRectangle {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
}

interface TooltipViewport {
  readonly height: number;
  readonly width: number;
}

interface TooltipPosition {
  readonly left: number;
  readonly top: number;
}

const gap = 8;
const margin = 8;
const physicalPlacements: Readonly<
  Record<TooltipDirection, Readonly<Record<TooltipPlacement, TooltipPlacement>>>
> = {
  [TooltipDirection.LeftToRight]: {
    bottom: TooltipPlacement.Bottom,
    end: TooltipPlacement.End,
    start: TooltipPlacement.Start,
    top: TooltipPlacement.Top
  },
  [TooltipDirection.RightToLeft]: {
    bottom: TooltipPlacement.Bottom,
    end: TooltipPlacement.Start,
    start: TooltipPlacement.End,
    top: TooltipPlacement.Top
  }
};

export function tooltipPosition(
  trigger: TooltipRectangle,
  tooltip: TooltipRectangle,
  placement: TooltipPlacement,
  viewport: TooltipViewport,
  direction: TooltipDirection
): TooltipPosition {
  const physical = physicalPlacement(placement, direction);
  const candidate = positionFor(trigger, tooltip, physical);
  return {
    left: clamp(candidate.left, margin, viewport.width - tooltip.width - margin),
    top: clamp(candidate.top, margin, viewport.height - tooltip.height - margin)
  };
}

function physicalPlacement(
  placement: TooltipPlacement,
  direction: TooltipDirection
): TooltipPlacement {
  return physicalPlacements[direction][placement];
}

function positionFor(
  trigger: TooltipRectangle,
  tooltip: TooltipRectangle,
  placement: TooltipPlacement
): TooltipPosition {
  const centeredLeft = trigger.left + (trigger.width - tooltip.width) / 2;
  const centeredTop = trigger.top + (trigger.height - tooltip.height) / 2;
  const positions: Readonly<Record<TooltipPlacement, TooltipPosition>> = {
    bottom: { left: centeredLeft, top: trigger.bottom + gap },
    end: { left: trigger.right + gap, top: centeredTop },
    start: { left: trigger.left - tooltip.width - gap, top: centeredTop },
    top: { left: centeredLeft, top: trigger.top - tooltip.height - gap }
  };
  return positions[placement];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

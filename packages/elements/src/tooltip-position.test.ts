import { TooltipPlacement } from "@unislang/unifold-catalog";
import { expect, it } from "vitest";

import { TooltipDirection, tooltipPosition, type TooltipRectangle } from "./tooltip-position.js";

const trigger: TooltipRectangle = {
  bottom: 120,
  height: 20,
  left: 100,
  right: 140,
  top: 100,
  width: 40
};
const tooltip: TooltipRectangle = {
  bottom: 0,
  height: 40,
  left: 0,
  right: 0,
  top: 0,
  width: 80
};
const viewport = { height: 400, width: 400 };

it("positions every logical placement and mirrors inline direction", () => {
  expect(position(TooltipPlacement.Top)).toEqual({ left: 80, top: 52 });
  expect(position(TooltipPlacement.Bottom)).toEqual({ left: 80, top: 128 });
  expect(position(TooltipPlacement.Start).left).toBe(12);
  expect(position(TooltipPlacement.Start, TooltipDirection.RightToLeft).left).toBe(148);
});

it("clamps the overlay inside the viewport margin", () => {
  const edge = { ...trigger, bottom: 20, left: 0, right: 20, top: 0, width: 20 };
  expect(
    tooltipPosition(
      edge,
      tooltip,
      TooltipPlacement.Top,
      { height: 100, width: 100 },
      TooltipDirection.LeftToRight
    )
  ).toEqual({ left: 8, top: 8 });
});

function position(
  placement: TooltipPlacement,
  direction: (typeof TooltipDirection)[keyof typeof TooltipDirection] = TooltipDirection.LeftToRight
) {
  return tooltipPosition(trigger, tooltip, placement, viewport, direction);
}

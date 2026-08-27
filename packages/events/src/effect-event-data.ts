import type { JsonObject } from "@unislang/unifold-contracts";

import type { UiCommandType } from "./enums.js";
import type { UiNodeId } from "./node.js";

export interface UiEffectEventChange extends JsonObject {
  readonly commandType: UiCommandType;
  readonly targetId?: UiNodeId;
}

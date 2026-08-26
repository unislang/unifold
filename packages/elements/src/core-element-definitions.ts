import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldAccordion } from "./accordion.js";
import { UnifoldAlert } from "./alert.js";
import { UnifoldBox } from "./box.js";
import { UnifoldButton } from "./button.js";
import { UnifoldCheckbox } from "./checkbox.js";
import { UnifoldComposition } from "./composition.js";
import { UnifoldForm } from "./form.js";
import { UnifoldGrid } from "./grid.js";
import { UnifoldHeading } from "./heading.js";
import { UnifoldIcon } from "./icon.js";
import { UnifoldLink } from "./link.js";
import { UnifoldMultiSelect } from "./multi-select.js";
import { UnifoldRadioGroup } from "./radio-group.js";
import { UnifoldSelect } from "./select.js";
import { UnifoldStack } from "./stack.js";
import { UnifoldTable } from "./table.js";
import { UnifoldText } from "./text.js";
import { UnifoldTextArea } from "./text-area.js";
import { UnifoldTextField } from "./text-field.js";

export const coreElementDefinitions: readonly [CoreElementTag, CustomElementConstructor][] = [
  [CoreElementTag.Accordion, UnifoldAccordion],
  [CoreElementTag.Alert, UnifoldAlert],
  [CoreElementTag.Box, UnifoldBox],
  [CoreElementTag.Button, UnifoldButton],
  [CoreElementTag.Checkbox, UnifoldCheckbox],
  [CoreElementTag.Composition, UnifoldComposition],
  [CoreElementTag.Form, UnifoldForm],
  [CoreElementTag.Grid, UnifoldGrid],
  [CoreElementTag.Heading, UnifoldHeading],
  [CoreElementTag.Icon, UnifoldIcon],
  [CoreElementTag.Link, UnifoldLink],
  [CoreElementTag.MultiSelect, UnifoldMultiSelect],
  [CoreElementTag.RadioGroup, UnifoldRadioGroup],
  [CoreElementTag.Select, UnifoldSelect],
  [CoreElementTag.Stack, UnifoldStack],
  [CoreElementTag.Table, UnifoldTable],
  [CoreElementTag.Text, UnifoldText],
  [CoreElementTag.TextArea, UnifoldTextArea],
  [CoreElementTag.TextField, UnifoldTextField]
];

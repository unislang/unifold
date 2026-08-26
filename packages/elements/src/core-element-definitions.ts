import { CoreElementTag } from "@unislang/unifold-catalog";

import { UnifoldAccordion } from "./accordion.js";
import { UnifoldAlert } from "./alert.js";
import { UnifoldAuditLog } from "./audit-log.js";
import { UnifoldBox } from "./box.js";
import { UnifoldButton } from "./button.js";
import { UnifoldCheckbox } from "./checkbox.js";
import { UnifoldCombobox } from "./combobox.js";
import { UnifoldComposition } from "./composition.js";
import { UnifoldDataGrid } from "./data-grid.js";
import { UnifoldForm } from "./form.js";
import { UnifoldGrid } from "./grid.js";
import { UnifoldHeading } from "./heading.js";
import { UnifoldIcon } from "./icon.js";
import { UnifoldLink } from "./link.js";
import { UnifoldMasterDetail } from "./master-detail.js";
import { UnifoldMenuButton } from "./menu-button.js";
import { UnifoldMultiSelect } from "./multi-select.js";
import { UnifoldRadioGroup } from "./radio-group.js";
import { UnifoldSearchResults } from "./search-results.js";
import { UnifoldSelect } from "./select.js";
import { UnifoldStack } from "./stack.js";
import { UnifoldStepper } from "./stepper.js";
import { UnifoldTabs } from "./tabs.js";
import { UnifoldTable } from "./table.js";
import { UnifoldText } from "./text.js";
import { UnifoldTextArea } from "./text-area.js";
import { UnifoldTextField } from "./text-field.js";
import { UnifoldVirtualList } from "./virtual-list.js";
import { UnifoldWizard } from "./wizard.js";

export const coreElementDefinitions: readonly [CoreElementTag, CustomElementConstructor][] = [
  [CoreElementTag.Accordion, UnifoldAccordion],
  [CoreElementTag.Alert, UnifoldAlert],
  [CoreElementTag.AuditLog, UnifoldAuditLog],
  [CoreElementTag.Box, UnifoldBox],
  [CoreElementTag.Button, UnifoldButton],
  [CoreElementTag.Checkbox, UnifoldCheckbox],
  [CoreElementTag.Combobox, UnifoldCombobox],
  [CoreElementTag.Composition, UnifoldComposition],
  [CoreElementTag.DataGrid, UnifoldDataGrid],
  [CoreElementTag.Form, UnifoldForm],
  [CoreElementTag.Grid, UnifoldGrid],
  [CoreElementTag.Heading, UnifoldHeading],
  [CoreElementTag.Icon, UnifoldIcon],
  [CoreElementTag.Link, UnifoldLink],
  [CoreElementTag.MasterDetail, UnifoldMasterDetail],
  [CoreElementTag.MenuButton, UnifoldMenuButton],
  [CoreElementTag.MultiSelect, UnifoldMultiSelect],
  [CoreElementTag.RadioGroup, UnifoldRadioGroup],
  [CoreElementTag.SearchResults, UnifoldSearchResults],
  [CoreElementTag.Select, UnifoldSelect],
  [CoreElementTag.Stack, UnifoldStack],
  [CoreElementTag.Stepper, UnifoldStepper],
  [CoreElementTag.Tabs, UnifoldTabs],
  [CoreElementTag.Table, UnifoldTable],
  [CoreElementTag.Text, UnifoldText],
  [CoreElementTag.TextArea, UnifoldTextArea],
  [CoreElementTag.TextField, UnifoldTextField],
  [CoreElementTag.VirtualList, UnifoldVirtualList],
  [CoreElementTag.Wizard, UnifoldWizard]
];

import type { JsonObject } from "@unislang/unifold-contracts";

import { referenceAuditLogNode } from "./static-audit-log-reference.test-data.js";
import { referenceFileInputNode } from "./static-file-input-reference.test-data.js";
import { referenceSearchResultsNode } from "./static-search-results-reference.test-data.js";
import {
  referenceStepperNode,
  referenceWizardNode
} from "./static-workflow-reference.test-data.js";

export function referenceStaticForm(): JsonObject {
  return {
    $comp: "Form",
    id: "form",
    label: "Profile",
    errorMessages: ["Correct the highlighted field"],
    $children: referenceFormChildren()
  };
}

function referenceFormChildren(): readonly JsonObject[] {
  return [
    errorSummary(),
    referenceTextFieldNode(),
    field(),
    fieldset(),
    passwordField(),
    textArea(),
    referenceFileInputNode(),
    checkbox(),
    radioGroup(),
    selectNode("Combobox", "assignee", "Assignee", "email"),
    selectNode("Select", "country", "Country", "us"),
    selectNode("MultiSelect", "skills", "Skills", ["ts"]),
    referenceVirtualListNode(),
    referenceAuditLogNode(),
    tableNode(),
    dataGridNode(),
    masterDetailNode(),
    referenceSearchResultsNode(),
    referenceStepperNode(),
    referenceWizardNode(),
    { $comp: "Button", action: "submit", id: "save", label: "Save" }
  ];
}

export function referenceVirtualListNode(): JsonObject {
  return {
    $comp: "VirtualList",
    id: "records",
    label: "Records",
    options: choiceOptions(),
    value: "email"
  };
}

function errorSummary(): JsonObject {
  return {
    $comp: "ErrorSummary",
    errors: [{ message: "Enter your name", targetId: "name" }],
    id: "form-errors",
    title: "There is a problem"
  };
}

function field(): JsonObject {
  return {
    $comp: "Field",
    $children: [{ $comp: "TextField", id: "nickname", label: "Preferred name", name: "nickname" }],
    helpText: "Optional",
    id: "nickname-field",
    label: "Preferred name"
  };
}

function fieldset(): JsonObject {
  return {
    $comp: "Fieldset",
    $children: [{ $comp: "Checkbox", id: "group-news", label: "Product news", name: "group-news" }],
    helpText: "Choose communication preferences.",
    id: "communication-group",
    label: "Communication"
  };
}

export function referenceTextFieldNode(): JsonObject {
  return {
    $comp: "TextField",
    id: "name",
    errorMessage: "Name is required",
    inputType: "text",
    label: "Name",
    name: "name",
    required: true,
    value: "Ada"
  };
}

function passwordField(): JsonObject {
  return {
    $comp: "TextField",
    id: "password",
    inputType: "password",
    label: "Password",
    name: "password",
    value: "must-not-export"
  };
}

function textArea(): JsonObject {
  return {
    $comp: "TextArea",
    id: "biography",
    label: "Biography",
    name: "biography",
    rows: 3,
    value: "A pioneer",
    wrap: "soft"
  };
}

function checkbox(): JsonObject {
  return {
    $comp: "Checkbox",
    id: "newsletter",
    label: "Newsletter",
    name: "newsletter",
    value: true
  };
}

function radioGroup(): JsonObject {
  return {
    $comp: "RadioGroup",
    id: "contact",
    label: "Contact",
    name: "contact",
    options: choiceOptions(),
    value: "email"
  };
}

function selectNode(
  component: "Combobox" | "MultiSelect" | "Select",
  id: string,
  label: string,
  value: string | readonly string[]
): JsonObject {
  return { $comp: component, id, label, name: id, options: choiceOptions(), value };
}

function tableNode(): JsonObject {
  return {
    $comp: "Table",
    caption: "People",
    columns: [
      { key: "name", label: "Name" },
      { key: "active", label: "Active" }
    ],
    id: "people",
    rows: [
      { cells: { active: true, name: "Ada" }, id: "ada" },
      { cells: { active: false, name: "<strong>Grace</strong>" }, id: "grace" }
    ]
  };
}

function dataGridNode(): JsonObject {
  return {
    $comp: "DataGrid",
    caption: "Selectable people",
    columns: [{ key: "name", label: "Name" }],
    id: "people-grid",
    rows: [{ cells: { name: "Ada" }, id: "ada-grid" }],
    selectionMode: "single",
    sortableColumns: ["name"],
    value: { selectedRowIds: [] }
  };
}

function masterDetailNode(): JsonObject {
  return {
    $comp: "MasterDetail",
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" }
    ],
    detailLabel: "Person details",
    id: "people-master-detail",
    label: "People",
    masterColumn: "name",
    rows: [{ cells: { name: "Ada", status: "Active" }, id: "ada-master" }],
    value: "ada-master"
  };
}

function choiceOptions(): readonly JsonObject[] {
  return [
    { label: "Email", value: "email" },
    { disabled: true, label: "TypeScript", value: "ts" },
    { label: "United States", value: "us" }
  ];
}

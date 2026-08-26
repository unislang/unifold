interface ReferenceNode {
  readonly $comp?: string;
  $children?: ReferenceNode[];
  readonly id: string;
  readonly [key: string]: unknown;
}

interface ReferenceDocument {
  readonly compositions: { readonly template: ReferenceNode }[];
}

export function appendReferenceFormStructure(source: unknown): void {
  const document = source as ReferenceDocument;
  const form = requireForm(document);
  if (findNode(form, "form-errors") !== undefined) return;
  form.$children.splice(0, 0, errorSummaryNode());
  form.$children.splice(4, 0, fieldNode(), fieldsetNode());
}

function findNode(node: ReferenceNode, id: string): ReferenceNode | undefined {
  if (node.id === id) return node;
  return findChild(node.$children ?? [], id);
}

function findChild(children: readonly ReferenceNode[], id: string): ReferenceNode | undefined {
  for (const child of children) {
    const found = findNode(child, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

function requireForm(document: ReferenceDocument): ReferenceNode & { $children: ReferenceNode[] } {
  return requireChildren(findNode(requireRoot(document), "form"));
}

function requireRoot(document: ReferenceDocument): ReferenceNode {
  const root = document.compositions[0]?.template;
  if (root === undefined) throw new Error("Reference root is missing.");
  return root;
}

function requireChildren(
  node: ReferenceNode | undefined
): ReferenceNode & { $children: ReferenceNode[] } {
  if (node === undefined) throw new Error("Reference form is missing.");
  if (node.$children === undefined) throw new Error("Reference form children are missing.");
  return node as ReferenceNode & { $children: ReferenceNode[] };
}

function errorSummaryNode(): ReferenceNode {
  return {
    $comp: "ErrorSummary",
    errors: [],
    id: "form-errors",
    title: "There is a problem"
  };
}

function fieldNode(): ReferenceNode {
  return {
    $comp: "Field",
    $children: [
      { $comp: "TextField", id: "preferred-name", label: "Preferred name", name: "preferredName" }
    ],
    helpText: "Optional; used in informal messages.",
    id: "preferred-name-field",
    label: "Preferred name"
  };
}

function fieldsetNode(): ReferenceNode {
  return {
    $comp: "Fieldset",
    $children: [
      {
        $comp: "TextField",
        id: "secondary-email",
        inputType: "email",
        label: "Secondary email",
        name: "secondaryEmail"
      }
    ],
    helpText: "Choose how we may contact you.",
    id: "communication-preferences",
    label: "Communication preferences"
  };
}

import type { ComponentMap, JsonUINode } from "@jsonui/react";
import type { ChangeEventHandler, ReactNode } from "react";

type OracleProps = JsonUINode & { readonly children?: ReactNode };

export const oracleComponents: ComponentMap = {
  Box: oracleComponent("Box"),
  Edit: oracleComponent("Edit"),
  Stack: oracleComponent("Stack"),
  Text: oracleComponent("Text"),
  TextField: oracleComponent("TextField"),
  View: oracleComponent("View")
};

function oracleComponent(type: string) {
  return function OracleComponent(props: OracleProps) {
    const id = String(props["id"] ?? `upstream-${type}`);
    return (
      <div
        aria-label={optionalString(props["label"])}
        data-parity-id={id}
        data-parity-node="true"
        data-parity-properties={JSON.stringify(publicProperties(props))}
        data-parity-type={type}
      >
        {visibleContent(type, props)}
        {props.children}
      </div>
    );
  };
}

function publicProperties(props: OracleProps): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(props).filter(([name, value]) => isPublicProperty(name, value))
  );
}

function isPublicProperty(name: string, value: unknown): boolean {
  return !isInternalProperty(name) && typeof value !== "function";
}

function isInternalProperty(name: string): boolean {
  return name === "children" || name === "id" || name.startsWith("$");
}

function visibleContent(type: string, props: OracleProps): ReactNode {
  return visibleRenderers[type]?.(props);
}

const visibleRenderers: Readonly<Record<string, (props: OracleProps) => ReactNode>> = {
  Edit: (props) => <OracleInput {...props} />,
  Text: (props) => optionalString(props["content"]),
  TextField: (props) => (
    <input
      aria-label={optionalString(props["label"])}
      value={optionalString(props["value"])}
      readOnly
    />
  )
};

function OracleInput(props: OracleProps) {
  const error = fieldError(props);
  return (
    <input
      aria-invalid={ariaInvalid(error)}
      aria-label={optionalString(props["label"])}
      data-parity-error={error}
      data-parity-touched={touchedValue(props)}
      onChange={changeHandler(props["onChange"])}
      value={inputValue(props)}
    />
  );
}

function fieldError(props: OracleProps): string | undefined {
  return optionalString(props.$ctx?.fieldErrors);
}

function ariaInvalid(error: string | undefined): "false" | "true" {
  return error === undefined ? "false" : "true";
}

function touchedValue(props: OracleProps): string {
  return String(Boolean(props.$ctx?.fieldTouched));
}

function inputValue(props: OracleProps): string {
  return optionalString(props["value"]) ?? "";
}

function changeHandler(value: unknown): ChangeEventHandler<HTMLInputElement> | undefined {
  return typeof value === "function" ? (value as ChangeEventHandler<HTMLInputElement>) : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

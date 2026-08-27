import ts from "typescript";

export function findImportedBindingReexports(sourceText, fileName = "module.ts") {
  const source = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const imported = new Set(source.statements.filter(ts.isImportDeclaration).flatMap(importedNames));
  return [...namedReexports(source, imported), ...defaultReexports(source, imported)];
}

function namedReexports(source, imported) {
  return source.statements
    .filter(isLocalNamedExport)
    .flatMap(({ exportClause }) => exportClause.elements)
    .filter(({ propertyName, name }) => imported.has((propertyName ?? name).text))
    .map(({ propertyName, name }) => ({
      importedName: (propertyName ?? name).text,
      name: name.text
    }));
}

function defaultReexports(source, imported) {
  return source.statements
    .filter(ts.isExportAssignment)
    .filter(({ expression }) => ts.isIdentifier(expression) && imported.has(expression.text))
    .map(({ expression }) => ({ importedName: expression.text, name: "default" }));
}

function importedNames(statement) {
  const clause = statement.importClause;
  if (clause === undefined) return [];
  const names = clause.name === undefined ? [] : [clause.name.text];
  return [...names, ...namedBindingNames(clause.namedBindings)];
}

function namedBindingNames(bindings) {
  if (bindings === undefined) return [];
  if (ts.isNamespaceImport(bindings)) return [bindings.name.text];
  return bindings.elements.map(({ name }) => name.text);
}

function isLocalNamedExport(statement) {
  return (
    ts.isExportDeclaration(statement) &&
    statement.moduleSpecifier === undefined &&
    ts.isNamedExports(statement.exportClause)
  );
}

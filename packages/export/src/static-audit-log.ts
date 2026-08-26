import type { AuditLogEntry } from "@unislang/unifold-catalog";
import { DataClassification, type JsonValue } from "@unislang/unifold-contracts";
import type { UnifoldIrDocument, UnifoldIrNode } from "@unislang/unifold-ir";

import { escapeHtml } from "./html-escape.js";

interface StaticAuditLogContext {
  readonly document: UnifoldIrDocument;
  readonly node: UnifoldIrNode;
}

export function renderStaticAuditLog({ document, node }: StaticAuditLogContext): string {
  if (!isPublic(document, node)) return emptyPrivateAuditLog();
  const label = textProperty(node, "label");
  const entries = property(node, "entries") as unknown as readonly AuditLogEntry[];
  const content =
    entries.length === 0
      ? `<p>${textProperty(node, "emptyMessage", "No audit events")}</p>`
      : `<ol>${entries.map(renderEntry).join("")}</ol>`;
  return `<section><h2>${label}</h2>${content}</section>`;
}

function renderEntry(entry: AuditLogEntry): string {
  const correlation =
    entry.correlationId === undefined
      ? ""
      : `<code>Correlation: ${escapeHtml(entry.correlationId)}</code>`;
  return `<li${attribute("data-entry-id", entry.id)}><time${attribute(
    "datetime",
    entry.timestamp
  )}>${escapeHtml(entry.timestamp)}</time><span>${escapeHtml(entry.actor)}</span><strong>${escapeHtml(
    entry.action
  )}</strong><p>${escapeHtml(entry.summary)}</p>${correlation}</li>`;
}

function isPublic(document: UnifoldIrDocument, node: UnifoldIrNode): boolean {
  if (node.binding === undefined) return true;
  return document.storesById[node.binding.store]?.classification === DataClassification.Public;
}

function property(node: UnifoldIrNode, name: string): JsonValue | undefined {
  return node.properties[name];
}

function textProperty(node: UnifoldIrNode, name: string, fallback = ""): string {
  const value = property(node, name);
  return escapeHtml(typeof value === "string" ? value : fallback);
}

function emptyPrivateAuditLog(): string {
  return "<section><h2></h2><ol></ol></section>";
}

function attribute(name: string, value: string): string {
  return ` ${name}="${escapeHtml(value)}"`;
}

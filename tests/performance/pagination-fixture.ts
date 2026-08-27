import { PaginationItemKind, type PaginationItem } from "@unislang/unifold-catalog";
import type { UnifoldPagination } from "@unislang/unifold-elements";
import { defineUnifoldPagination } from "@unislang/unifold-elements/pagination";

import { percentile } from "./profile-statistics.js";

const PAGINATION_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;

export async function measurePaginationProjection() {
  defineUnifoldPagination(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await settle(fixture.pagination);
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const pagination: UnifoldPagination[] = [];
  for (let index = 0; index < PAGINATION_COUNT; index += 1) {
    const element = document.createElement("unifold-pagination") as UnifoldPagination;
    element.id = `pagination-${index}`;
    element.items = pageItems(index % 2 === 0);
    element.label = `Result pages ${index}`;
    container.append(element);
    pagination.push(element);
  }
  return { container, pagination };
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.pagination.forEach((element, index) => {
      element.items = pageItems((sample + index) % 2 === 0);
    });
    await settle(fixture.pagination);
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

async function settle(elements: readonly UnifoldPagination[]): Promise<void> {
  await Promise.all(elements.map((element) => element.updateComplete));
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const paginationCount = fixture.container.querySelectorAll("unifold-pagination").length;
  const final = currentPage(fixture.pagination.at(-1));
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    finalCurrentPage: final,
    gate: projectionGate(paginationCount, final, p95Milliseconds),
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    paginationCount,
    sampleCount: samples.length
  };
}

function projectionGate(count: number, current: string | undefined, p95: number) {
  return {
    actualCurrentPage: current,
    actualP95Milliseconds: p95,
    actualPaginationCount: count,
    limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
    name: "100-pagination projection",
    passed: [
      count === PAGINATION_COUNT,
      current === "2",
      p95 <= PROJECTION_P95_LIMIT_MILLISECONDS
    ].every(Boolean)
  };
}

function currentPage(element: UnifoldPagination | undefined): string | undefined {
  if (element === undefined) return undefined;
  return currentPageInRoot(element.shadowRoot);
}

function currentPageInRoot(root: ShadowRoot | null): string | undefined {
  if (root === null) return undefined;
  return trimmedText(root.querySelector('[aria-current="page"]'));
}

function trimmedText(element: Element | null): string | undefined {
  if (element === null || element.textContent === null) return undefined;
  return element.textContent.trim();
}

function pageItems(secondCurrent: boolean): readonly PaginationItem[] {
  return [
    navigationItem("previous", "Previous", PaginationItemKind.Previous, "?page=1"),
    pageItem("one", "1", !secondCurrent),
    pageItem("two", "2", secondCurrent),
    navigationItem("next", "Next", PaginationItemKind.Next, "?page=2")
  ];
}

function pageItem(id: string, label: string, current: boolean): PaginationItem {
  return {
    accessibleLabel: current ? `Current page, page ${label}` : `Go to page ${label}`,
    current,
    href: `?page=${label}`,
    id,
    kind: PaginationItemKind.Page,
    label
  };
}

function navigationItem(
  id: string,
  label: string,
  kind: PaginationItemKind,
  href: string
): PaginationItem {
  return { accessibleLabel: `${label} page`, href, id, kind, label };
}

import {
  deepestActiveElement,
  focusMayBeRetried,
  focusMayBeStarted,
  focusRenderedElement
} from "./focus-target.js";
import {
  FocusRestoreStatus,
  type PendingElementDefinitionOptions,
  type UnifoldElementHost
} from "./types.js";

export interface RenderedFocusRequest {
  readonly controlIndex: number | undefined;
  readonly currentElement: () => UnifoldElementHost | undefined;
  readonly element: UnifoldElementHost;
  readonly pendingDefinitions: PendingElementDefinitionOptions | undefined;
  readonly tagName: string;
}

export function restoreRenderedFocus(request: RenderedFocusRequest): Promise<FocusRestoreStatus> {
  if (!isCurrentElement(request)) return Promise.resolve(FocusRestoreStatus.NotFocused);
  return restoreCurrentFocus(request);
}

function restoreCurrentFocus(request: RenderedFocusRequest): Promise<FocusRestoreStatus> {
  const previousActive = deepestActiveElement(request.element.ownerDocument);
  const status = registeredDefinitionStatus(request);
  if (status === FocusRestoreStatus.Focused) return restoreReadyFocus(request, previousActive);
  if (status === FocusRestoreStatus.NotFocused) return Promise.resolve(status);
  return restorePendingFocus(request, previousActive);
}

async function restorePendingFocus(
  request: RenderedFocusRequest,
  previousActive: Element | null
): Promise<FocusRestoreStatus> {
  const definition = await pendingDefinition(request);
  if (!definitionIsAccepted(request, definition)) return FocusRestoreStatus.NotFocused;
  await Promise.resolve();
  return restoreReadyFocus(request, previousActive);
}

function registeredDefinitionStatus(request: RenderedFocusRequest): FocusRestoreStatus | undefined {
  const options = request.pendingDefinitions;
  if (options === undefined) return FocusRestoreStatus.Focused;
  return definitionStatus(options, request.tagName);
}

function definitionStatus(
  options: PendingElementDefinitionOptions,
  tagName: string
): FocusRestoreStatus | undefined {
  const definition = options.registry.get(tagName);
  if (definition === undefined) return undefined;
  return options.acceptsDefinition(tagName, definition)
    ? FocusRestoreStatus.Focused
    : FocusRestoreStatus.NotFocused;
}

function restoreReadyFocus(
  request: RenderedFocusRequest,
  previousActive: Element | null
): Promise<FocusRestoreStatus> {
  if (!isCurrentElement(request)) return Promise.resolve(FocusRestoreStatus.NotFocused);
  if (!focusMayBeStarted(request.element, previousActive)) {
    return Promise.resolve(FocusRestoreStatus.NotFocused);
  }
  return completeFocusRestore(request, previousActive);
}

async function completeFocusRestore(
  request: RenderedFocusRequest,
  previousActive: Element | null
): Promise<FocusRestoreStatus> {
  const initial = focusRenderedElement(request.element, request.controlIndex);
  try {
    await request.element.updateComplete;
  } catch {
    return FocusRestoreStatus.NotFocused;
  }
  const status = focusStatusAfterUpdate(request, initial, previousActive);
  if (status === FocusRestoreStatus.NotFocused) return status;
  const focused = deepestActiveElement(request.element.ownerDocument) as HTMLElement | null;
  return settleAncestorFocus(request, focused);
}

async function settleAncestorFocus(
  request: RenderedFocusRequest,
  focused: HTMLElement | null
): Promise<FocusRestoreStatus> {
  if (!(await ancestorUpdatesSettled(request.element))) return FocusRestoreStatus.NotFocused;
  return settledFocusStatus(request, focused);
}

function settledFocusStatus(
  request: RenderedFocusRequest,
  focused: HTMLElement | null
): FocusRestoreStatus {
  if (!hasCurrentFocusedTarget(request, focused)) return FocusRestoreStatus.NotFocused;
  return currentFocusStatus(request, focused);
}

function hasCurrentFocusedTarget(
  request: RenderedFocusRequest,
  focused: HTMLElement | null
): focused is HTMLElement {
  return isCurrentElement(request) && focused !== null;
}

function currentFocusStatus(
  request: RenderedFocusRequest,
  focused: HTMLElement
): FocusRestoreStatus {
  if (deepestActiveElement(request.element.ownerDocument) === focused) {
    return FocusRestoreStatus.Focused;
  }
  return focusMayBeRetried(request.element, focused)
    ? finalFocusStatus(request)
    : FocusRestoreStatus.NotFocused;
}

function focusStatusAfterUpdate(
  request: RenderedFocusRequest,
  initial: HTMLElement | undefined,
  previousActive: Element | null
): FocusRestoreStatus {
  if (!isCurrentElement(request)) return FocusRestoreStatus.NotFocused;
  if (focusAttemptSucceeded(request.element, initial)) return FocusRestoreStatus.Focused;
  return retryFocusStatus(request, initial, previousActive);
}

function focusAttemptSucceeded(
  element: UnifoldElementHost,
  initial: HTMLElement | undefined
): boolean {
  return initial !== undefined && deepestActiveElement(element.ownerDocument) === initial;
}

function retryFocusStatus(
  request: RenderedFocusRequest,
  initial: HTMLElement | undefined,
  previousActive: Element | null
): FocusRestoreStatus {
  return mayRetry(request.element, initial, previousActive)
    ? finalFocusStatus(request)
    : FocusRestoreStatus.NotFocused;
}

function finalFocusStatus(request: RenderedFocusRequest): FocusRestoreStatus {
  const focused = focusRenderedElement(request.element, request.controlIndex);
  return focused === undefined ? FocusRestoreStatus.NotFocused : FocusRestoreStatus.Focused;
}

function mayRetry(
  element: UnifoldElementHost,
  initial: HTMLElement | undefined,
  previousActive: Element | null
): boolean {
  return initial === undefined
    ? focusMayBeStarted(element, previousActive)
    : focusMayBeRetried(element, initial);
}

function definitionIsAccepted(
  request: RenderedFocusRequest,
  definition: CustomElementConstructor | undefined
): boolean {
  if (definition === undefined) return false;
  return request.pendingDefinitions?.acceptsDefinition(request.tagName, definition) === true;
}

async function pendingDefinition(
  request: RenderedFocusRequest
): Promise<CustomElementConstructor | undefined> {
  try {
    return await request.pendingDefinitions?.registry.whenDefined(request.tagName);
  } catch {
    return undefined;
  }
}

async function ancestorUpdatesSettled(element: UnifoldElementHost): Promise<boolean> {
  try {
    await Promise.all(pendingAncestorUpdates(element));
    return true;
  } catch {
    return false;
  }
}

function pendingAncestorUpdates(element: UnifoldElementHost): readonly Promise<boolean>[] {
  const updates: Promise<boolean>[] = [];
  let current = element.parentElement;
  while (current !== null) {
    const update = (current as UnifoldElementHost).updateComplete;
    if (update !== undefined) updates.push(update);
    current = current.parentElement;
  }
  return updates;
}

function isCurrentElement(request: RenderedFocusRequest): boolean {
  return request.currentElement() === request.element && request.element.isConnected;
}

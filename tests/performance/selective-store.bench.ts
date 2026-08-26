import { afterAll, bench, describe } from "vitest";

import { createRuleScaleHarness, evaluateRuleChain } from "./rule-scale-fixture.js";
import {
  REACTIVE_TRANSACTION_BENCHMARK_NAME,
  createReactiveTransactionHarness,
  executeReactiveTransaction
} from "./reactive-transaction-fixture.js";
import {
  ONE_THOUSAND_NODES,
  TEN_THOUSAND_NODES,
  createAggregateScaleHarness,
  createScaleHarness,
  reorderFirstGroup,
  replay,
  updateBulk,
  updateAggregateOne,
  updateOne
} from "./scale-fixture.js";

const harnesses = createBenchmarkHarnesses();
const ruleHarness = createRuleScaleHarness();
const reactiveTransactionHarness = createReactiveTransactionHarness();
let sequence = 0;

afterAll(() => {
  Object.values(harnesses).forEach(({ store }) => store.dispose());
  reactiveTransactionHarness.runtime.dispose();
});

describe("normalized store selective dispatch", () => {
  bench("1k one-node edit with 20% indexed selections", () => {
    updateOne(harnesses.oneThousand, ++sequence);
  });

  bench("10k one-node edit without selections", () => {
    updateOne(harnesses.tenThousandBaseline, ++sequence);
  });

  bench("10k one-node edit with 20% indexed selections", () => {
    updateOne(harnesses.tenThousandSelected, ++sequence);
  });

  bench("10k one-percent bulk edit", () => {
    updateBulk(harnesses.tenThousandBulk, ++sequence);
  });

  bench("10k one-hundred-sibling reorder", () => {
    reorderFirstGroup(harnesses.tenThousandReorder, ++sequence);
  });

  bench("10k one-hundred-transaction replay", () => {
    replay(harnesses.tenThousandReplay, 100, (sequence += 100));
  });

  bench("10k aggregate-heavy leaf edit", () => {
    updateAggregateOne(harnesses.tenThousandAggregate, ++sequence);
  });
});

describe("derived rule incrementality", () => {
  bench("1k rule graph with 25 affected rules", () => {
    evaluateRuleChain(ruleHarness, 0, ++sequence);
  });
});

describe("integrated reactive transaction", () => {
  bench(REACTIVE_TRANSACTION_BENCHMARK_NAME, () => {
    executeReactiveTransaction(reactiveTransactionHarness, ++sequence);
  });
});

function createBenchmarkHarnesses() {
  return {
    oneThousand: createScaleHarness(ONE_THOUSAND_NODES),
    tenThousandAggregate: createAggregateScaleHarness(TEN_THOUSAND_NODES),
    tenThousandBaseline: createScaleHarness(TEN_THOUSAND_NODES, false),
    tenThousandBulk: createScaleHarness(TEN_THOUSAND_NODES),
    tenThousandReorder: createScaleHarness(TEN_THOUSAND_NODES),
    tenThousandReplay: createScaleHarness(TEN_THOUSAND_NODES),
    tenThousandSelected: createScaleHarness(TEN_THOUSAND_NODES)
  };
}

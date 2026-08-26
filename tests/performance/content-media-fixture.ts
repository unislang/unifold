import type { UnifoldCard, UnifoldImage } from "@unislang/unifold-elements";
import { defineUnifoldCard, defineUnifoldImage } from "@unislang/unifold-elements/content-media";

import { percentile } from "./profile-statistics.js";

const ITEM_COUNT = 100;
const PROFILE_SAMPLES = 50;
const PROJECTION_P95_LIMIT_MILLISECONDS = 100;

export async function measureContentMediaProjection() {
  defineUnifoldCard(customElements);
  defineUnifoldImage(customElements);
  const fixture = buildFixture();
  document.body.append(fixture.container);
  try {
    await Promise.all(
      [...fixture.cards, ...fixture.images].map((element) => element.updateComplete)
    );
    return await runProfile(fixture);
  } finally {
    fixture.container.remove();
  }
}

function buildFixture() {
  const container = document.createElement("div");
  const cards: UnifoldCard[] = [];
  const images: UnifoldImage[] = [];
  for (let index = 0; index < ITEM_COUNT; index += 1) {
    const card = document.createElement("unifold-card") as UnifoldCard;
    const image = document.createElement("unifold-image") as UnifoldImage;
    configure(card, image, index);
    card.append(image);
    container.append(card);
    cards.push(card);
    images.push(image);
  }
  return { cards, container, images };
}

function configure(card: UnifoldCard, image: UnifoldImage, index: number): void {
  card.label = `Profile card ${index}`;
  image.alt = `Profile image ${index}`;
  image.height = 180;
  image.src = `/profile-${index}.svg`;
  image.width = 320;
}

async function runProfile(fixture: ReturnType<typeof buildFixture>) {
  const samples: number[] = [];
  for (let sample = 0; sample < PROFILE_SAMPLES; sample += 1) {
    const started = performance.now();
    fixture.images.forEach((image, index) => {
      image.alt = `Profile image ${index}, revision ${sample}`;
    });
    await Promise.all(fixture.images.map((image) => image.updateComplete));
    samples.push(performance.now() - started);
  }
  return projectionEvidence(fixture, samples);
}

function projectionEvidence(fixture: ReturnType<typeof buildFixture>, samples: readonly number[]) {
  const cardCount = fixture.container.querySelectorAll("unifold-card").length;
  const imageCount = fixture.container.querySelectorAll("unifold-image").length;
  const p95Milliseconds = percentile(samples, 0.95);
  return {
    cardCount,
    gate: {
      actualCardCount: cardCount,
      actualImageCount: imageCount,
      actualP95Milliseconds: p95Milliseconds,
      limitP95Milliseconds: PROJECTION_P95_LIMIT_MILLISECONDS,
      name: "100-card media projection",
      passed: cardCount === ITEM_COUNT && imageCount === ITEM_COUNT && p95Milliseconds <= 100
    },
    imageCount,
    maximumMilliseconds: Math.max(...samples),
    p50Milliseconds: percentile(samples, 0.5),
    p95Milliseconds,
    p99Milliseconds: percentile(samples, 0.99),
    sampleCount: samples.length
  };
}

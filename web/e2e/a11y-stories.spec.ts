import { existsSync, readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Every story through axe, WCAG 2.1 AA, one test per story. Runs against a built Storybook
// served on STORYBOOK_URL: npm run a11y:stories builds, serves and runs this file. The regular
// e2e run skips it.
const base = process.env.STORYBOOK_URL;
const indexFile = "storybook-static/index.json";

interface IndexEntry {
  id: string;
  type: "story" | "docs";
}

const stories: IndexEntry[] =
  base && existsSync(indexFile)
    ? Object.values(
        (JSON.parse(readFileSync(indexFile, "utf8")) as { entries: Record<string, IndexEntry> })
          .entries,
      ).filter((entry) => entry.type === "story")
    : [];

test.skip(!base, "STORYBOOK_URL not set: run npm run a11y:stories");

test("the built Storybook has the stories", () => {
  expect(stories.length).toBeGreaterThan(100);
});

for (const story of stories) {
  test(story.id, async ({ page }) => {
    await page.goto(`${base ?? ""}/iframe.html?id=${story.id}&viewMode=story`);
    // Not networkidle: loading stories hold their requests open on purpose.
    await page.locator("#storybook-root > *, [role=dialog]").first().waitFor();
    await page.waitForTimeout(300);
    // Finite animations only: a loading pulse never finishes.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
    );
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`),
    ).toEqual([]);
  });
}

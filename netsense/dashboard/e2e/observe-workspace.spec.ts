import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openObserve(page: Page) {
  await page.goto('/observe');
  await expect(page.getByRole('heading', { name: 'Central Services Campus' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Current situation' })).toBeVisible();
}

test('Observe exposes only supported, working workspace controls', async ({ page }) => {
  await openObserve(page);

  await expect(page.getByRole('link', { name: 'Observe' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Investigate' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Resolve' })).toBeVisible();
  await expect(page.getByRole('link')).toHaveCount(3);
  await expect(page.getByText('Operating normally')).toBeVisible();
  await expect(page.getByText('100% monitored')).toBeVisible();
  await expect(page.getByText('Evidence current', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Active incidents')).toHaveCount(0);
  await expect(page.getByText('No active alerts')).toHaveCount(0);

  await page.getByRole('button', { name: 'Context' }).click();
  await expect(page.getByRole('complementary', { name: 'Operational context' })).toBeVisible();
  await page.getByRole('button', { name: 'Close operational context' }).click();
  await expect(page.getByRole('complementary', { name: 'Operational context' })).toHaveCount(0);
});

test('operating environments are explicit, persistent, and preserve workflow semantics', async ({ page }) => {
  await openObserve(page);

  const root = page.locator('html');
  const dark = page.getByRole('button', { name: 'Operations Dark' });
  const daylight = page.getByRole('button', { name: 'Daylight' });

  await expect(page.getByRole('group', { name: 'Display environment' })).toBeVisible();
  await expect(root).toHaveAttribute('data-environment', 'operations-dark');
  await expect(dark).toHaveAttribute('aria-pressed', 'true');
  const darkCanvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg-canvas').trim());

  await daylight.click();
  await expect(root).toHaveAttribute('data-environment', 'daylight');
  await expect(daylight).toHaveAttribute('aria-pressed', 'true');
  const daylightCanvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg-canvas').trim());
  expect(daylightCanvas).not.toBe(darkCanvas);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Central Services Campus' })).toBeVisible();
  await expect(root).toHaveAttribute('data-environment', 'daylight');
  await expect(page.getByRole('button', { name: 'Daylight' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: /Operational topology map/ })).toBeVisible();
});

test('keyboard user can inspect an entity through the synchronized topology table', async ({ page }) => {
  await openObserve(page);
  await page.getByRole('button', { name: 'Table' }).click();

  const entity = page.getByRole('button', { name: 'Core Switch 01' });
  await entity.focus();
  await entity.press('Enter');

  const inspector = page.getByRole('complementary', { name: 'Core Switch 01 operational details' });
  await expect(inspector).toBeVisible();
  await expect(inspector.getByText('Organisational context')).toBeVisible();
  await expect(inspector.getByText('Connected context')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(inspector).toHaveCount(0);
  await expect(entity).toBeFocused();
});

test('working lenses project the same network into physical and dependency views', async ({ page }) => {
  await openObserve(page);

  await page.getByRole('button', { name: 'Physical' }).click();
  await expect(page.getByText('Atlas layered topology')).toBeVisible();
  await page.getByRole('button', { name: /Legend/ }).click();
  await expect(page.getByText('Physical adjacency')).toBeVisible();
  await expect(page.getByText('Depends on')).toHaveCount(0);

  await page.getByRole('button', { name: 'Dependency' }).click();
  await expect(page.getByText('Atlas layered topology')).toBeVisible();
  await page.getByRole('button', { name: /Legend/ }).click();
  await expect(page.getByText('Depends on')).toBeVisible();
  await expect(page.getByText('Physical adjacency')).toHaveCount(0);
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`map remains dominant without overlap at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openObserve(page);

    const map = page.getByRole('region', { name: /Operational topology map/ });
    await expect(map.locator('canvas')).toHaveCount(3);
    const mapBox = await map.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(mapBox!.width * mapBox!.height).toBeGreaterThan(viewport.width * viewport.height * 0.52);

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

    const context = page.getByRole('complementary', { name: 'Operational context' });
    if (viewport.width < 1600) {
      await expect(context).toHaveCount(0);
    } else {
      await expect(context).toBeVisible();
      const contextBox = await context.boundingBox();
      expect(mapBox!.x + mapBox!.width).toBeLessThanOrEqual(contextBox!.x + 1);
    }
  });
}

test('@a11y Observe has no automated accessibility violations', async ({ page }) => {
  await openObserve(page);
  const mapResults = await new AxeBuilder({ page }).analyze();
  expect(mapResults.violations).toEqual([]);

  await page.getByRole('button', { name: 'Table' }).click();
  const tableResults = await new AxeBuilder({ page }).analyze();
  expect(tableResults.violations).toEqual([]);
});

test('Investigate searches technical and operational identity and explains relationships', async ({ page }) => {
  await openObserve(page);
  await page.getByRole('link', { name: 'Investigate' }).click();
  await expect(page).toHaveURL(/\/investigate$/);
  await expect(page.getByRole('heading', { name: 'Investigate the evidence' })).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Search topology' });
  await search.fill('192.0.2.11');
  await expect(page.getByRole('button', { name: /Core Switch 01/ })).toBeVisible();
  await page.getByRole('button', { name: /Core Switch 01/ }).click();
  await expect(page.getByRole('complementary', { name: 'Core Switch 01 operational details' })).toBeVisible();

  await page.keyboard.press('Escape');
  await search.fill('Finance Platform');
  await page.getByRole('button', { name: /Finance Platform/ }).click();
  await page.getByRole('button', { name: 'depends on' }).first().click();
  const relationship = page.getByRole('complementary', { name: 'depends on relationship details' });
  await expect(relationship).toBeVisible();
  await expect(relationship.getByText('Relationship meaning')).toBeVisible();
  await expect(relationship.getByText('Evidence and limitations')).toBeVisible();
});

test('Resolve renders analysis outputs and enforces the session workflow', async ({ page }) => {
  await openObserve(page);
  await page.getByRole('link', { name: 'Resolve' }).click();
  await expect(page).toHaveURL(/\/resolve$/);
  await expect(page.getByRole('heading', { name: 'Resolve with defensible evidence' })).toBeVisible();
  await expect(page.getByText('Identity-dependent services unavailable')).toBeVisible();
  await expect(page.getByText('Probable-source candidates')).toBeVisible();
  await expect(page.getByText('Confirmed affected')).toBeVisible();
  await expect(page.getByText('No people or user count is inferred', { exact: false })).toBeVisible();

  const resolve = page.getByRole('button', { name: 'Mark resolved' });
  await expect(resolve).toBeDisabled();
  await page.getByRole('button', { name: 'Acknowledge' }).click();
  await page.getByRole('textbox', { name: 'Investigation notes' }).fill(
    'Verified current evidence and requested a local compute inspection.',
  );
  await page.getByRole('button', { name: 'Save notes' }).click();
  await expect(resolve).toBeEnabled();
  await resolve.click();
  await expect(page.getByText('Demo operator resolved the incident with investigation notes.')).toBeVisible();
});

test('Resolve exposes a healthy alternate path without claiming downstream outage', async ({ page }) => {
  await openObserve(page);
  await page.getByRole('link', { name: 'Resolve' }).click();
  await page.getByLabel('Synthetic scenario').selectOption('redundant');

  await expect(page.getByText('One campus access uplink down')).toBeVisible();
  await expect(page.getByText('Alternate path observed')).toBeVisible();
  await expect(page.getByText('Unaffected · alternate path')).toBeVisible();
  await expect(page.getByText('Confirmed affected')).toHaveCount(0);
});

test('@a11y Investigate and Resolve have no automated accessibility violations', async ({ page }) => {
  await page.goto('/investigate');
  await expect(page.getByRole('heading', { name: 'Investigate the evidence' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.goto('/resolve');
  await expect(page.getByRole('heading', { name: 'Resolve with defensible evidence' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('@a11y Daylight preserves accessibility across operator workflows', async ({ page }) => {
  await page.goto('/observe');
  await page.getByRole('button', { name: 'Daylight' }).click();

  for (const workspace of ['observe', 'investigate', 'resolve']) {
    await page.goto(`/${workspace}`);
    await expect(page.locator('html')).toHaveAttribute('data-environment', 'daylight');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`Investigate and Resolve remain usable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const workspace of ['investigate', 'resolve']) {
      await page.goto(`/${workspace}`);
      const map = page.getByRole('region', { name: /Operational topology map/ });
      await expect(map).toBeVisible();
      const mapBox = await map.boundingBox();
      expect(mapBox).not.toBeNull();
      expect(mapBox!.width).toBeGreaterThan(viewport.width * 0.4);
      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
    }
  });
}

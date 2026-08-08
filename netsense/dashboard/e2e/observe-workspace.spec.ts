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
  await expect(page.getByRole('link')).toHaveCount(1);
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

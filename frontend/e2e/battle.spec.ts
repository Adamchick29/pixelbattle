import { expect, test } from '@playwright/test';

test('guests can view the live board and the layout fits the screen', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Тысячи идей');
  await expect(page.getByText('В эфире', { exact: true })).toBeVisible();
  await expect(page.getByRole('application')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Цвет #/ })).toHaveCount(32);
  await expect(page.getByRole('button', { name: 'Войти и рисовать' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.getByRole('heading', { level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).toContain('Pixelkit Pixel');
  expect(errors).toEqual([]);
  if (process.env.CAPTURE_PREVIEW) await page.screenshot({ path: testInfo.outputPath('preview.png'), fullPage: true });
});

test('registration, live painting, shared cooldown, reload and logout', async ({ page, browser, baseURL }) => {
  await page.goto('/');
  await expect(page.getByText('В эфире', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Пароль', { exact: true }).fill('test-pixel-password');
  await dialog.getByRole('button', { name: 'Присоединиться' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  const observer = await browser.newContext({ baseURL });
  const spectator = await observer.newPage();
  const received: { type: string; x?: number; y?: number; color?: number }[] = [];
  spectator.on('websocket', socket => socket.on('framereceived', frame => {
    try { received.push(JSON.parse(String(frame.payload))); } catch { /* protocol control frames */ }
  }));
  await spectator.goto('/');
  await expect(spectator.getByText('В эфире', { exact: true })).toBeVisible();

  const board = await (await page.request.get('/api/board')).json();
  const oldColor = Buffer.from(board.pixels, 'base64')[128 * 256 + 129];
  const color = oldColor === 14 ? 24 : 14;
  await page.getByRole('button', { name: `Цвет ${board.palette[color]}`, exact: true }).click();
  await page.getByRole('application').press('ArrowRight');
  await expect(page.getByText('X: 129 · Y: 128', { exact: true })).toBeVisible();
  const before = Date.now();
  await page.getByRole('button', { name: 'Раскрасить пиксель', exact: true }).click();
  await expect.poll(() => received.some(event => event.type === 'pixel.changed' && event.x === 129 && event.y === 128 && event.color === color)).toBe(true);
  expect(Date.now() - before).toBeLessThan(2000);
  const rejected = await page.request.post('/api/pixels', {
    headers: { Origin: baseURL! }, data: { x: 130, y: 128, color },
  });
  expect(rejected.status()).toBe(429);
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.user.next_pixel_at).toBeGreaterThan(before);
  await page.getByRole('button', { name: `Цвет ${board.palette[color]}`, exact: true }).click();
  await page.getByRole('application').press('ArrowRight');
  await page.getByRole('application').press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Раскрасить пиксель', exact: true })).toBeEnabled({ timeout: 8000 });
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  await observer.close();
});

test('panning and zooming do not paint or accidentally select a pixel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('application')).toBeVisible();
  const before = await (await page.request.get('/api/board')).json();
  const bounds = (await page.getByRole('application').boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 50, bounds.y + bounds.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('Нажмите на поле, чтобы выбрать пиксель', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Увеличить масштаб', exact: true }).click();
  await page.getByRole('button', { name: 'Показать поле целиком', exact: true }).click();
  expect((await (await page.request.get('/api/board')).json()).revision).toBe(before.revision);
});

test('reconnect catches up with changes made while the browser was offline', async ({ page, context, baseURL, request }) => {
  const snapshots: number[] = [];
  page.on('websocket', socket => socket.on('framereceived', frame => {
    try {
      const event = JSON.parse(String(frame.payload));
      if (event.type === 'board.snapshot') snapshots.push(event.revision);
    } catch { /* protocol control frames */ }
  }));
  await page.goto('/');
  await expect(page.getByText('В эфире', { exact: true })).toBeVisible();
  const initial = await (await request.get('/api/board')).json();
  const registered = await request.post('/api/auth/register', { headers: { Origin: baseURL! },
    data: { email: `reconnect-${Date.now()}@example.com`, password: 'reconnect-test-password' } });
  expect(registered.status()).toBe(201);
  await context.setOffline(true);
  await expect(page.getByText('Восстанавливаем связь', { exact: true })).toBeVisible();
  const old = Buffer.from(initial.pixels, 'base64')[100 * 256 + 100];
  const changed = await request.post('/api/pixels', { headers: { Origin: baseURL! },
    data: { x: 100, y: 100, color: old === 14 ? 24 : 14 } });
  expect(changed.status()).toBe(200);
  const revision = (await changed.json()).revision;
  await context.setOffline(false);
  await expect(page.getByText('В эфире', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('application')).toBeVisible();
  await expect.poll(() => snapshots.includes(revision)).toBe(true);
});

test('protected VMUI opens with all project dashboards', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Infrastructure UI is verified once on desktop');
  test.skip(!process.env.MONITORING_PASSWORD, 'Set MONITORING_PASSWORD to test protected monitoring');
  const context = await browser.newContext({ httpCredentials: { username: 'monitor', password: process.env.MONITORING_PASSWORD! } });
  const page = await context.newPage();
  await page.goto(`${testInfo.project.use.baseURL}/monitoring/vmui/`);
  await expect(page.getByText('Dashboards', { exact: true }).first()).toBeVisible();
  await page.getByText('Dashboards', { exact: true }).first().click();
  await expect(page.getByText('Ресурсы сервера', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Занято и свободно CPU', exact: true })).toBeVisible();
  const response = await context.request.get(`${testInfo.project.use.baseURL}/monitoring/prometheus/vmui/custom-dashboards`);
  const titles = (await response.json()).dashboardsSettings.map((dashboard: { title: string }) => dashboard.title);
  expect(titles.sort()).toEqual(['Доступность', 'Использование приложения', 'Контейнеры', 'Ресурсы сервера'].sort());
  await context.close();
});

test('two-finger touch zoom does not select or paint a pixel', async ({ page, context, isMobile }) => {
  test.skip(!isMobile, 'Touch gestures are verified on a mobile device');
  await page.goto('/');
  const canvas = page.getByRole('application');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const bounds = (await canvas.boundingBox())!;
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  const oldZoom = await page.locator('.zoom-value').innerText();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 30, y, id: 1 }, { x: x + 30, y, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 60, y, id: 1 }, { x: x + 60, y, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.zoom-value')).not.toHaveText(oldZoom);
  await expect(page.getByText('Нажмите на поле, чтобы выбрать пиксель', { exact: true })).toBeVisible();
});

// Standalone Playwright test for the rating widget
import {test, expect} from '@playwright/test';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const widgetPath = join(__dirname, 'index.html');

test.describe('Rating Widget Tests', () => {
    test.beforeEach(async ({page}) => {
        await page.goto(`file://${widgetPath}`);
        await page.waitForSelector('.depth-container');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForSelector('.depth-container');

        // Show controls by modifying CSS to always display them
        await page.evaluate(() => {
            const controls = document.querySelector('.controls');
            controls.style.display = 'flex';
        });
    });

    test('should display initial state correctly', async ({page}) => {
        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(2500);

        const iconSrc = await page.locator('#depthIcon').getAttribute('src');
        expect(iconSrc).toContain('depth-3.png');
    });

    test('should add 100 points', async ({page}) => {
        await page.click('button:has-text("+100")');
        await page.waitForTimeout(200);

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(2600);
    });

    test('should add 200 points', async ({page}) => {
        await page.click('button:has-text("+200")');
        await page.waitForTimeout(200);

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(2700);
    });

    test('should subtract 100 points', async ({page}) => {
        await page.click('button:has-text("-100")');
        await page.waitForTimeout(200);

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(2400);
    });

    test('should subtract 200 points', async ({page}) => {
        await page.click('button:has-text("-200")');
        await page.waitForTimeout(200);

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(2300);
    });

    test('should change depth level when crossing threshold', async ({page}) => {
        await page.fill('#pointsInput', '4000');
        await page.click('button:has-text("Set Points")');
        await page.waitForTimeout(200);

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(4000);

        const iconSrc = await page.locator('#depthIcon').getAttribute('src');
        expect(iconSrc).toContain('depth-4.png');
    });

    test('should not go below 0 points', async ({page}) => {
        // Click subtract many times
        for (let i = 0; i < 15; i++) {
            await page.click('button:has-text("-200")');
            await page.waitForTimeout(50);
        }

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBeGreaterThanOrEqual(0);
    });

    test('should not exceed 10000 points', async ({page}) => {
        await page.fill('#pointsInput', '9900');
        await page.click('button:has-text("Set Points")');
        await page.waitForTimeout(200);

        await page.click('button:has-text("+200")');
        await page.waitForTimeout(100);

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBeLessThanOrEqual(10000);
    });

    test('should persist points in localStorage', async ({page}) => {
        await page.fill('#pointsInput', '5000');
        await page.click('button:has-text("Set Points")');
        await page.waitForTimeout(200);

        const storedPoints = await page.evaluate(() =>
            localStorage.getItem('deepOfNightPoints')
        );
        expect(storedPoints).toBe('5000');

        await page.reload();
        await page.waitForSelector('.depth-container');

        const pointsText = await page.locator('#currentPoints').textContent();
        expect(parseInt(pointsText)).toBe(5000);
    });
});

// @ts-check
const { test, expect } = require('@playwright/test');

function alphaOf(rgbaString) {
    const match = rgbaString.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(',').map(s => s.trim());
    return parts.length === 4 ? parseFloat(parts[3]) : 1;
}

const WEEKLY_LINK = 'https://asaas.test.invalid/weekly';
const DAILY_LINK = 'https://asaas.test.invalid/daily';

async function mockSubscribe(page, status, body) {
    await page.route('https://api.pulsedge.com.br/subscribe**', route => {
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body || {}) });
    });
}

async function mockStats(page) {
    await page.route('https://api.pulsedge.com.br/stats', route => {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ companies: 1234, cities: 7 }) });
    });
}

async function mockValidLink(page) {
    await mockStats(page);
    await mockSubscribe(page, 200, {
        weekly_plan_price: 297,
        daily_plan_price: 397,
        weekly_plan_link_url: WEEKLY_LINK,
        daily_plan_link_url: DAILY_LINK,
    });
}

test.describe('assinar.html — link valido', () => {
    test('renderiza os 2 planos com o diario pre-selecionado e preco formatado', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await expect(page.locator('#state-checkout')).toHaveClass(/active/);
        const cards = page.locator('.plan-card');
        await expect(cards).toHaveCount(2);

        const daily = page.locator('.plan-card[data-plan-id="daily"]');
        await expect(daily).toHaveClass(/selected/);
        await expect(daily.locator('.plan-price')).toContainText('R$ 397');

        const weekly = page.locator('.plan-card[data-plan-id="weekly"]');
        await expect(weekly).not.toHaveClass(/selected/);
        await expect(weekly.locator('.plan-price')).toContainText('R$ 297');
    });

    test('modal da foto do fundador abre ao clicar no avatar e fecha ao clicar na modal', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const modal = page.locator('#avatar-modal');
        await expect(modal).not.toHaveClass(/open/);

        await page.locator('#founder-avatar').click();
        await expect(modal).toHaveClass(/open/);

        await modal.click();
        await expect(modal).not.toHaveClass(/open/);
    });

    test('botao de assinar so habilita com plano selecionado + checkbox marcado', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const button = page.locator('#btn-subscribe');
        await expect(button).toBeDisabled();

        await page.locator('#consent-check').check();
        await expect(button).toBeEnabled();

        await page.locator('#consent-check').uncheck();
        await expect(button).toBeDisabled();
    });

    test('trocar de plano atualiza a selecao visual', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await page.locator('.plan-card[data-plan-id="weekly"]').click();
        await expect(page.locator('.plan-card[data-plan-id="weekly"]')).toHaveClass(/selected/);
        await expect(page.locator('.plan-card[data-plan-id="daily"]')).not.toHaveClass(/selected/);
    });

    test('agenda de recebimento reage a troca de plano', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await expect(page.locator('#schedule-badge')).toHaveText('Pulse Diário');
        await expect(page.locator('.schedule-day.is-daily')).toHaveCount(5);
        await expect(page.locator('#compare-daily')).toHaveClass(/is-active/);
        await expect(page.locator('#compare-weekly')).not.toHaveClass(/is-active/);

        await page.locator('.plan-card[data-plan-id="weekly"]').click();
        await expect(page.locator('#schedule-badge')).toHaveText('Pulse Semanal');
        await expect(page.locator('.schedule-day.is-daily')).toHaveCount(0);
        await expect(page.locator('.schedule-day.is-weekly')).toHaveCount(1);
        await expect(page.locator('#compare-weekly')).toHaveClass(/is-active/);
        await expect(page.locator('#compare-daily')).not.toHaveClass(/is-active/);
    });

    test('card do plano diário mostra o callout de vantagem de 6 dias', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const daily = page.locator('.plan-card[data-plan-id="daily"]');
        await expect(daily.locator('.plan-advantage')).toContainText('6 dias');

        const weekly = page.locator('.plan-card[data-plan-id="weekly"]');
        await expect(weekly.locator('.plan-advantage')).toHaveCount(0);
    });

    test('ao confirmar, redireciona para o link de pagamento do plano selecionado', async ({ page }) => {
        await mockValidLink(page);
        await page.route(DAILY_LINK, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>ok</html>' }));
        await page.goto('/assinar?l=lead123');

        await page.locator('#consent-check').check();
        await page.locator('#btn-subscribe').click();
        await page.waitForURL(DAILY_LINK);
    });

    test('FAQ em acordeao abre e fecha por pergunta', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const firstItem = page.locator('.faq-item').first();
        await expect(firstItem).not.toHaveClass(/open/);

        await firstItem.locator('.faq-item-summary').click();
        await expect(firstItem).toHaveClass(/open/);

        await firstItem.locator('.faq-item-summary').click();
        await expect(firstItem).not.toHaveClass(/open/);
    });

    test('FAQ lista a pergunta sobre vencimento da assinatura', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await expect(page.getByText('Quando vence a assinatura, e posso mudar a data?')).toBeVisible();
    });

    test('checkbox de consentimento aponta para termos e privacidade', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await expect(page.locator('.consent-text a').first()).toHaveAttribute('href', 'https://pulsedge.com.br/termos');
        await expect(page.locator('.consent-text a').nth(1)).toHaveAttribute('href', 'https://pulsedge.com.br/privacidade');
    });

    test('clicar no botao desabilitado faz o container de consentimento piscar em vermelho', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const consentWrap = page.locator('.consent-wrap');
        await expect(consentWrap).not.toHaveClass(/consent-alert/);

        await page.locator('#cta-click-zone').click({ position: { x: 10, y: 10 } });
        await expect(consentWrap).toHaveClass(/consent-alert/);
    });

    test('barra fixa nao aparece enquanto o card de planos e o botao principal ainda estao visiveis', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await page.locator('#plans-heading').scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        await expect(page.locator('#sticky-cta')).not.toHaveClass(/visible/);

        await page.locator('#cta-click-zone').scrollIntoViewIfNeeded();
        await page.waitForTimeout(100);
        await expect(page.locator('#sticky-cta')).not.toHaveClass(/visible/);
    });

    test('barra fixa de assinatura aparece ao rolar e reflete o plano selecionado', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const stickyCta = page.locator('#sticky-cta');
        await expect(stickyCta).not.toHaveClass(/visible/);

        await page.evaluate(() => {
            const rect = document.getElementById('cta-click-zone').getBoundingClientRect();
            window.scrollTo(0, window.scrollY + rect.bottom + 50);
        });
        await page.waitForTimeout(100);
        await expect(stickyCta).toHaveClass(/visible/);
        await expect(page.locator('#sticky-plan-name')).toHaveText('PULSE DIÁRIO', { useInnerText: true });
        expect(await page.locator('#sticky-plan-name').innerHTML()).toBe('Pulse <br class="plan-name-break">Diário');

        await page.locator('.plan-card[data-plan-id="weekly"]').click();
        await expect(page.locator('#sticky-plan-name')).toHaveText('PULSE SEMANAL', { useInnerText: true });
        expect(await page.locator('#sticky-plan-name').innerHTML()).toBe('Pulse <br class="plan-name-break">Semanal');
    });

    test('clicar na barra fixa sem consentimento rola para os planos e pisca o consentimento', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        await page.evaluate(() => {
            const rect = document.getElementById('cta-click-zone').getBoundingClientRect();
            window.scrollTo(0, window.scrollY + rect.bottom + 50);
        });
        await page.waitForTimeout(100);

        await page.locator('#btn-subscribe-sticky').click();

        const consentWrap = page.locator('.consent-wrap');
        await expect(consentWrap).toHaveClass(/consent-alert/, { timeout: 1000 });
    });

    test('clicar na barra fixa com consentimento marcado redireciona para o pagamento', async ({ page }) => {
        await mockValidLink(page);
        await page.route(DAILY_LINK, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<html>ok</html>' }));
        await page.goto('/assinar?l=lead123');

        await page.locator('#consent-check').check();
        await page.evaluate(() => {
            const rect = document.getElementById('cta-click-zone').getBoundingClientRect();
            window.scrollTo(0, window.scrollY + rect.bottom + 50);
        });
        await page.waitForTimeout(100);

        await page.locator('#btn-subscribe-sticky').click();
        await page.waitForURL(DAILY_LINK);
    });
});

test.describe('assinar.html — link invalido/expirado', () => {
    test('422 mostra a tela de link expirado', async ({ page }) => {
        await mockStats(page);
        await mockSubscribe(page, 422, {});
        await page.goto('/assinar?l=lead-expirado');

        await expect(page.locator('#state-expired')).toHaveClass(/active/);
        await expect(page.locator('#state-checkout')).not.toHaveClass(/active/);
    });

    test('sem parametro l tambem mostra tela de expirado', async ({ page }) => {
        await mockStats(page);
        await page.goto('/assinar');
        await expect(page.locator('#state-expired')).toHaveClass(/active/);
    });
});

test.describe('assinar.html — erro tecnico', () => {
    test('falha 500 da API mostra tela de erro', async ({ page }) => {
        await mockStats(page);
        await mockSubscribe(page, 500, {});
        await page.goto('/assinar?l=lead123');

        await expect(page.locator('#state-error')).toHaveClass(/active/);
        await expect(page.locator('#state-checkout')).not.toHaveClass(/active/);
    });
});

test.describe('assinar.html — estrutura geral', () => {
    test('header comeca transparente sobre o hero, fica solido apos rolar, e nao tem nav institucional', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        const header = page.locator('header');
        const initialBg = await header.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(alphaOf(initialBg)).toBeLessThan(0.05);

        await page.evaluate(() => {
            const wrap = document.querySelector('.hero-wrap');
            window.scrollTo(0, wrap.offsetHeight);
        });
        await page.waitForTimeout(100);

        const scrolledBg = await header.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(alphaOf(scrolledBg)).toBeGreaterThan(0.95);
        expect(scrolledBg).toContain('26, 43, 74');

        await expect(page.locator('header nav')).toHaveCount(0);
    });

    test('header fica solido navy nas telas de expirado e erro, mesmo sem rolar', async ({ page }) => {
        await mockStats(page);
        await mockSubscribe(page, 422, {});
        await page.goto('/assinar?l=lead-expirado');

        const bg = await page.locator('header').evaluate(el => getComputedStyle(el).backgroundColor);
        expect(alphaOf(bg)).toBeGreaterThan(0.95);
    });

    test('rodape com ano atual', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');
        const year = new Date().getFullYear().toString();
        await expect(page.locator('#footer-year')).toHaveText(year);
    });

    test('datas da planilha de exemplo sao calculadas em relacao a data atual', async ({ page }) => {
        await mockValidLink(page);
        await page.goto('/assinar?l=lead123');

        function expectedDate(offsetDays) {
            const d = new Date();
            d.setDate(d.getDate() + offsetDays);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${dd}/${mm}/${d.getFullYear()}`;
        }

        const cells = page.locator('[data-offset-days]');
        const count = await cells.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
            const cell = cells.nth(i);
            const offset = parseInt(await cell.getAttribute('data-offset-days'), 10);
            await expect(cell).toHaveText(expectedDate(offset));
        }
    });
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function sample(page:import('@playwright/test').Page){
 await page.goto('/');
 await page.getByRole('button',{name:/Delaware \/ Midland Permian Basin/}).click();
 await expect(page.getByRole('heading',{name:'Recommended allocation'})).toBeVisible();
}
test('compiled styles, accessible allocation and responsive detail',async({page})=>{
 await sample(page);
 await expect(page.getByRole('navigation',{name:'Workspace navigation'})).toBeVisible();
 expect(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(20, 43, 69)');
 await page.getByLabel('Search prospects').fill('Reeves County A-1');
 await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:'Reeves County A-1',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await page.keyboard.press('Escape');
 for(const width of [1440,1024,768,390]){
  await page.setViewportSize({width,height:850});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Reeves County A-1',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(el=>el.getBoundingClientRect().right<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByLabel('Search prospects').fill('');
 expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 await page.screenshot({path:'test-results/allocation-desktop.png',fullPage:true});
});

test('real analysis, immutable result, reload, stale state, export and invalid constraints',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'New portfolio',exact:true}).click();
 await page.getByLabel('Portfolio name',{exact:true}).fill(`Browser verification ${Date.now()}`);
 await page.getByRole('button',{name:'Run analysis',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Recommended allocation'})).toBeVisible({timeout:90000});
 const npv=await page.locator('.metrics dd').first().innerText();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Recommended allocation'})).toBeVisible();
 await expect(page.locator('.metrics dd').first()).toHaveText(npv);
 await page.getByRole('button',{name:'Assumptions & constraints'}).click();
 await page.getByLabel('Capital budget ($)',{exact:true}).fill('1');
 await page.keyboard.press('Escape');
 await expect(page.getByText(/Inputs have changed/)).toBeVisible();
 await page.getByRole('button',{name:'Reports',exact:true}).click();
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export full run'}).click();
 expect((await download).suggestedFilename()).toBe('analysis.json');
 await page.getByRole('button',{name:'Run analysis',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('No verified allocation',{timeout:90000});
 await expect(page.getByText(/Inputs have changed/)).toBeVisible();
});

test('scenario results and chart allocations remain reachable at a narrow width',async({page})=>{
 await sample(page);
 await page.setViewportSize({width:390,height:844});
 await page.getByLabel('Result scenario').selectOption('Crash Case');
 await expect(page.getByRole('heading',{name:'Return and downside'})).toBeVisible();
 await page.getByRole('button',{name:'Scenarios',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Scenario comparison'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/scenarios-mobile.png',fullPage:true});
});

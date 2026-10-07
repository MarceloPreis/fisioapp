// Browser smoke test with synthetic API responses only.
import { createServer } from 'vite'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const server = await createServer({ server: { host: '127.0.0.1', port: 5179, strictPort: true }, define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1') } })
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' })
  const page = await browser.newPage()
  const patientId = '11111111-1111-4111-8111-111111111111'
  const reports = []
  let failSave = false
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    let json
    if (pathname.endsWith('/auth/profile')) json = { userId: 'synthetic', role: 'PHYSIO', name: 'Profissional teste' }
    else if (pathname === '/api/v1/patients') json = [{ id: patientId, fullName: 'Paciente sintético', medicalRecordNumber: 'SYNTHETIC', birthDate: '2000-01-01' }]
    else if (pathname.endsWith('/reports')) {
      if (request.method() === 'POST') {
        if (failSave) return route.fulfill({ status: 500, json: { message: 'Synthetic failure' } })
        json = { ...request.postDataJSON(), id: 'synthetic-report-' + reports.length, createdAt: new Date().toISOString(), author: { name: 'Profissional teste' } }
        reports.unshift(json)
      } else json = { patient: { id: patientId, fullName: 'Paciente sintético' }, reports }
    } else throw new Error('Unexpected synthetic endpoint: ' + pathname)
    await route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json })
  })
  await page.goto('http://127.0.0.1:5179/patients')
  await page.getByRole('link', { name: 'Ver progresso de Paciente sintético' }).click()
  await page.getByRole('heading', { name: 'Nenhum relatório registrado' }).waitFor()
  await page.getByRole('button', { name: 'Novo relatório' }).click()
  await page.getByRole('dialog', { name: 'Novo relatório' }).waitFor()
  assert.equal(await page.getByLabel('Título', { exact: true }).evaluate(element => element === document.activeElement), true)
  await page.keyboard.press('Escape')
  await page.getByRole('dialog', { name: 'Novo relatório' }).waitFor({ state: 'detached' })
  assert.equal(await page.getByRole('button', { name: 'Novo relatório' }).evaluate(element => element === document.activeElement), true)
  await page.getByRole('button', { name: 'Novo relatório' }).click()
  await page.getByLabel('Título', { exact: true }).fill('Avaliação sintética')
  const content = '# Achados\n\n**Observação**\n\n- Item sintético\n\n<img src="https://invalid.test/tracker" onerror="window.pwned=true"><script>window.pwned=true</script>'
  await page.getByLabel('Laudo ou observação').fill(content)
  await page.keyboard.press('Escape')
  await page.getByRole('heading', { name: 'Descartar relatório?' }).waitFor()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('dialog', { name: 'Novo relatório' }).waitFor()
  assert.equal(await page.getByLabel('Laudo ou observação').inputValue(), content)
  await page.getByRole('button', { name: 'Pré-visualizar' }).click()
  await page.getByRole('heading', { name: 'Achados' }).waitFor()
  assert.equal(await page.locator('.markdown-content img, .markdown-content script').count(), 0)
  assert.equal(await page.evaluate(() => window.pwned), undefined)
  await page.getByRole('button', { name: 'Salvar relatório' }).click()
  await page.getByRole('heading', { name: 'Avaliação sintética' }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'Avaliação sintética' }).waitFor()
  await page.getByRole('button', { name: 'Novo relatório' }).click()
  await page.getByLabel('Título', { exact: true }).fill('Segundo relatório')
  await page.getByLabel('Laudo ou observação').fill('Texto sintético mantido após falha.')
  failSave = true
  await page.getByRole('button', { name: 'Salvar relatório' }).click()
  await page.getByText('Não foi possível salvar o relatório. Seu texto foi mantido para tentar novamente.').waitFor()
  assert.equal(await page.getByLabel('Laudo ou observação').inputValue(), 'Texto sintético mantido após falha.')
  failSave = false
  await page.getByRole('button', { name: 'Salvar relatório' }).click()
  await page.getByRole('heading', { name: 'Segundo relatório' }).waitFor()
  assert.equal(await page.locator('article').count(), 2)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false)
  assert.deepEqual(errors, [])
  console.log('Browser: patient action, empty state, Markdown preview, HTML sanitization, saving, reload, retry and mobile layout passed.')
} finally {
  await browser?.close()
  await server.close()
}

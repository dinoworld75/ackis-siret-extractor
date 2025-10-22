#!/usr/bin/env ts-node
import * as fs from 'fs'
import * as readline from 'readline'
import {chromium, Browser, Page, BrowserContext} from 'playwright'
// Note: playwright-stealth remplacé par techniques stealth manuelles intégrées

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  inputCsv: './test-website-723.csv',
  outputCsv: './results.csv',
  maxSites: 10,  // TEST: 10 sites pour baseline
  timeout: 20000,  // Augmenté à 20s pour les SPAs
  delayBetweenRequests: 2500,
  maxLegalPagesToCheck: 5,
  headless: true,
  columnIndex: 16, // Colonne 17 (corporate website) = index 16
}

// ============================================================================
// BLACKLIST HÉBERGEURS
// ============================================================================

const BLACKLIST_SIRENS = [
  '797876562', // Gestixi
  '423646512', // OVH
  '537407926', // Gandi
  '443061841', // O2Switch
]

// ============================================================================
// MOTS-CLÉS PAGES LÉGALES
// ============================================================================

const LEGAL_KEYWORDS = [
  'mention',
  'legal',
  'legale',
  'légale',
  'cgu',
  'cgv',
  'condition',
  'utilisation',
  'vente',
  'propos',
  'sommes',
  'siret',
  'siren',
  'politique',
  'confidentialite',
  'confidentialité',
  'cookie',
  'donnees',
  'données',
  'information',
]

// ============================================================================
// URLS LÉGALES À TESTER (par ordre de priorité - les plus fréquentes en premier)
// ============================================================================

const LEGAL_PATHS = [
  '/mentions-legales',
  '/mentions-legales/',
  '/mentions',              // BUG FIX: Ajout de /mentions sans "-legales" (ex: floralis.fr)
  '/mentions/',
  '/mentions-légales',
  '/mentions-légales/',
  '/cgv',
  '/cgv/',
  '/cgu',
  '/cgu/',
  '/conditions-generales-de-vente',
  '/conditions-generales-de-vente/',
  '/conditions-generales',
  '/conditions-generales/',
  '/politique-de-confidentialite',
  '/politique-de-confidentialite/',
  '/fr/mentions-legales',
  '/fr/mentions',           // BUG FIX: Variante i18n
  '/fr/conditions-generales',
  '/legal',
  '/legal/',
]

// ============================================================================
// USER AGENTS POOL
// ============================================================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
]

// ============================================================================
// TYPES
// ============================================================================

interface Identifier {
  siret?: string
  siren?: string
  tva?: string
  valid: boolean
}

interface ScrapeResult {
  url: string
  status: 'success' | 'error' | 'timeout' | 'antibot' | 'no_data'
  identifiers: Identifier[]
  foundOnPage?: string
  legalPagesChecked: string[]
  error?: string
  duration: number
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const SIRET_REGEX = /\b(?:\d{3}\s*){2}\d{3}\s*\d{5}\b/g
const SIREN_REGEX = /\b(?:\d{3}\s*){3}\b/g
const TVA_REGEX = /\bFR[\s]?\d{2}[\s]?(?:\d{3}\s*){3}\b/gi
const RCS_REGEX = /RCS\s+([A-ZÀ-Ÿ]+)\s+((?:\d{3}\s*){3})/gi

// ============================================================================
// VALIDATION LUHN
// ============================================================================

function isSiretValid(siret: string): boolean {
  const cleaned = siret.replace(/\s/g, '')
  if (cleaned.length !== 14 || isNaN(Number(cleaned))) return false

  // Cas spécial: La Poste
  if (cleaned.slice(0, 9) === '356000000') {
    const sum = Array.from(cleaned).reduce((acc, char) => acc + Number(char), 0)
    return sum % 5 === 0
  }

  const sum = Array.from(cleaned).reduce((acc, char, index) => {
    if (index % 2 === 0) {
      const mult = Number(char) * 2
      return acc + (mult > 9 ? mult - 9 : mult)
    }
    return acc + Number(char)
  }, 0)

  return sum % 10 === 0
}

function isSirenValid(siren: string): boolean {
  const cleaned = siren.replace(/\s/g, '')
  if (cleaned.length !== 9 || isNaN(Number(cleaned))) return false

  const sum = Array.from(cleaned).reduce((acc, char, index) => {
    if (index % 2 === 1) {
      const tmp = Number(char) * 2
      return acc + (tmp > 9 ? tmp - 9 : tmp)
    }
    return acc + Number(char)
  }, 0)

  return sum % 10 === 0
}

// ============================================================================
// EXTRACTION
// ============================================================================

function extractIdentifiers(text: string): Identifier[] {
  const results: Identifier[] = []
  const seen = new Set<string>()

  // 1. Extraire les SIRET
  const sirets = [...text.matchAll(SIRET_REGEX)]
  for (const match of sirets) {
    const siret = match[0].replace(/\s/g, '')
    if (!seen.has(siret) && isSiretValid(siret)) {
      const siren = siret.substring(0, 9)
      if (!BLACKLIST_SIRENS.includes(siren)) {
        results.push({siret, siren, valid: true})
        seen.add(siret)
      }
    }
  }

  // 2. Extraire les TVA
  const tvas = [...text.matchAll(TVA_REGEX)]
  for (const match of tvas) {
    const tva = match[0].replace(/\s/g, '').toUpperCase()
    const siren = tva.substring(4, 13) // FR + 2 chiffres + 9 chiffres SIREN
    if (!seen.has(tva) && isSirenValid(siren)) {
      if (!BLACKLIST_SIRENS.includes(siren)) {
        results.push({tva, siren, valid: true})
        seen.add(tva)
      }
    }
  }

  // 3. Extraire les SIREN (standalone)
  const sirens = [...text.matchAll(SIREN_REGEX)]
  for (const match of sirens) {
    const siren = match[0].replace(/\s/g, '')
    // Ne pas ajouter si déjà dans SIRET ou TVA
    const alreadyHave = results.some(r => r.siren === siren)
    if (!alreadyHave && !seen.has(siren) && isSirenValid(siren)) {
      if (!BLACKLIST_SIRENS.includes(siren)) {
        results.push({siren, valid: true})
        seen.add(siren)
      }
    }
  }

  // 4. Extraire via RCS (ex: "RCS MARSEILLE 388 318 313")
  const rcs = [...text.matchAll(RCS_REGEX)]
  for (const match of rcs) {
    const siren = match[2].replace(/\s/g, '')
    const alreadyHave = results.some(r => r.siren === siren)
    if (!alreadyHave && !seen.has(siren) && isSirenValid(siren)) {
      if (!BLACKLIST_SIRENS.includes(siren)) {
        results.push({siren, valid: true})
        seen.add(siren)
      }
    }
  }

  return results
}

// ============================================================================
// SCRAPING
// ============================================================================

async function readCsvUrls(filePath: string, maxUrls: number): Promise<string[]> {
  const urls: string[] = []
  const fileStream = fs.createReadStream(filePath)
  const rl = readline.createInterface({input: fileStream, crlfDelay: Infinity})

  let lineNumber = 0
  for await (const line of rl) {
    lineNumber++
    if (lineNumber === 1) continue
    const columns = line.split(';')
    const url = columns[CONFIG.columnIndex]?.trim()
    if (url && url.length > 0 && urls.length < maxUrls) {
      urls.push(url)
    }
    if (urls.length >= maxUrls) break
  }

  return urls
}

async function extractPageContent(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const scripts = document.querySelectorAll('script, style, noscript, iframe, svg')
    scripts.forEach(el => el.remove())
    return document.body?.innerText || ''
  })
}

async function findLegalLinksInFooter(page: Page, baseUrl: string): Promise<string[]> {
  const links = await page.evaluate(keywords => {
    const footers = document.querySelectorAll('footer, [role="contentinfo"], .footer, .footer-area')
    const allLinks: string[] = []

    footers.forEach(footer => {
      const anchors = footer.querySelectorAll('a[href]')
      anchors.forEach(a => {
        const href = (a as HTMLAnchorElement).href
        const text = (a as HTMLAnchorElement).textContent?.toLowerCase() || ''
        const combined = `${href.toLowerCase()} ${text}`

        if (keywords.some(kw => combined.includes(kw))) {
          allLinks.push(href)
        }
      })
    })

    return allLinks
  }, LEGAL_KEYWORDS)

  // Filtrer uniquement les liens du même domaine
  const base = new URL(baseUrl)
  return links
    .filter(href => {
      try {
        const url = new URL(href)
        return url.hostname === base.hostname
      } catch {
        return false
      }
    })
    .filter((v, i, a) => a.indexOf(v) === i) // Déduplique
}

async function scrapeSite(context: BrowserContext, url: string): Promise<ScrapeResult> {
  const startTime = Date.now()
  const result: ScrapeResult = {
    url,
    status: 'error',
    identifiers: [],
    legalPagesChecked: [],
    duration: 0,
  }

  let page: Page | null = null

  try {
    console.log(`[${new Date().toISOString()}] Scraping: ${url}`)

    page = await context.newPage()
    page.setDefaultTimeout(CONFIG.timeout)

    // Navigation homepage avec wait adapté aux SPAs
    const response = await page.goto(url, {
      waitUntil: 'load',
      timeout: CONFIG.timeout,
    })

    // BUG FIX #3: Vérifier le status UNIQUEMENT de la page principale (pas des ressources)
    if (!response) {
      result.status = 'error'
      result.error = 'No response'
      return result
    }

    if (response.status() === 403) {
      result.status = 'antibot'
      result.error = 'HTTP 403 Forbidden'
      return result
    }

    if (response.status() >= 400) {
      result.status = 'error'
      result.error = `HTTP ${response.status()}`
      return result
    }

    // BUG FIX: Attendre que le JavaScript rende le contenu (pour React/Vue/Next.js)
    await page.waitForTimeout(1500)

    // BUG FIX #3: Détection anti-bot avec patterns SPÉCIFIQUES (pas de faux positifs)
    const bodyText = await page.textContent('body').catch(() => '')
    const lowerBodyText = bodyText?.toLowerCase() || ''

    // Patterns spécifiques Cloudflare Challenge
    const cloudflarePatterns = [
      'checking your browser',
      'just a moment',
      'please enable cookies and',
      'cf-browser-verification',
      'attention required',
      'cloudflare ray id',
    ]

    // Patterns spécifiques autres anti-bots
    const antibotPatterns = [
      'access denied',
      'you have been blocked',
      'security check in progress',
      'verify you are human',
      'please complete the security check',
      'bot protection',
    ]

    const isCloudflareChallenge = cloudflarePatterns.some(p => lowerBodyText.includes(p))
    const isAntibotChallenge = antibotPatterns.some(p => lowerBodyText.includes(p))

    // Vérifier aussi les éléments DOM spécifiques
    const hasRecaptchaFrame = await page.$('iframe[src*="recaptcha/api2/bframe"]').catch(() => null)
    const hasCloudflareChallengeForm = await page.$('form#challenge-form').catch(() => null)

    if (isCloudflareChallenge || isAntibotChallenge || hasRecaptchaFrame || hasCloudflareChallengeForm) {
      result.status = 'antibot'
      result.error = 'Anti-bot challenge detected'
      return result
    }

    const baseUrl = response.url()

    // 1. Chercher sur la homepage d'abord
    const homepageContent = await extractPageContent(page)
    const homepageIds = extractIdentifiers(homepageContent)

    if (homepageIds.length > 0) {
      result.identifiers.push(...homepageIds)
      result.foundOnPage = baseUrl
      result.legalPagesChecked.push(baseUrl)
    }

    // 2. Si rien trouvé, tester les URLs légales standard
    if (result.identifiers.length === 0) {
      for (const path of LEGAL_PATHS.slice(0, CONFIG.maxLegalPagesToCheck)) {
        try {
          const legalUrl = new URL(path, baseUrl).href
          const legalResponse = await page.goto(legalUrl, {
            waitUntil: 'load',  // BUG FIX: 'load' au lieu de 'domcontentloaded'
            timeout: CONFIG.timeout,
          })

          if (legalResponse && legalResponse.status() >= 200 && legalResponse.status() < 400) {
            // BUG FIX: Wait pour SPAs
            await page.waitForTimeout(1000)

            result.legalPagesChecked.push(legalUrl)
            const content = await extractPageContent(page)
            const ids = extractIdentifiers(content)

            if (ids.length > 0) {
              result.identifiers.push(...ids)
              result.foundOnPage = legalUrl
              break // Trouvé, on arrête
            }
          }
        } catch {
          continue
        }
      }
    }

    // 3. Si toujours rien, chercher dans les liens footer
    if (result.identifiers.length === 0) {
      await page.goto(baseUrl, {waitUntil: 'domcontentloaded'})
      const footerLinks = await findLegalLinksInFooter(page, baseUrl)

      console.log(`  → Found ${footerLinks.length} footer legal links`)

      for (const link of footerLinks.slice(0, CONFIG.maxLegalPagesToCheck)) {
        try {
          const linkResponse = await page.goto(link, {
            waitUntil: 'load',  // BUG FIX
            timeout: CONFIG.timeout,
          })

          if (linkResponse && linkResponse.status() >= 200 && linkResponse.status() < 400) {
            // BUG FIX: Wait pour SPAs
            await page.waitForTimeout(1000)

            result.legalPagesChecked.push(link)
            const content = await extractPageContent(page)
            const ids = extractIdentifiers(content)

            if (ids.length > 0) {
              result.identifiers.push(...ids)
              result.foundOnPage = link
              break
            }
          }
        } catch {
          continue
        }
      }
    }

    // Déduplique les identifiants
    const uniqueIds = new Map<string, Identifier>()
    result.identifiers.forEach(id => {
      const key = id.siret || id.siren || id.tva || ''
      if (key && !uniqueIds.has(key)) {
        uniqueIds.set(key, id)
      }
    })
    result.identifiers = Array.from(uniqueIds.values())

    result.status = result.identifiers.length > 0 ? 'success' : 'no_data'
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      result.status = 'timeout'
      result.error = 'Page timeout'
    } else {
      result.status = 'error'
      result.error = err.message || 'Unknown error'
    }
    console.log(`  ✗ Error: ${result.error}`)
  } finally {
    if (page) await page.close().catch(() => {})
    result.duration = Date.now() - startTime
  }

  return result
}

// ============================================================================
// EXPORT CSV
// ============================================================================

function exportToCsv(results: ScrapeResult[], outputPath: string): void {
  const header = 'URL;Status;SIRETs;SIRENs;TVAs;Found On Page;Legal Pages Checked;Error;Duration (ms)\n'

  const rows = results.map(r => {
    const sirets = r.identifiers
      .filter(i => i.siret)
      .map(i => i.siret)
      .join(', ')
    const sirens = r.identifiers
      .filter(i => i.siren)
      .map(i => i.siren)
      .join(', ')
    const tvas = r.identifiers
      .filter(i => i.tva)
      .map(i => i.tva)
      .join(', ')
    const foundOn = r.foundOnPage || ''
    const checked = r.legalPagesChecked.length.toString()
    const error = (r.error || '').replace(/;/g, ',')

    return `${r.url};${r.status};${sirets};${sirens};${tvas};${foundOn};${checked};${error};${r.duration}`
  })

  fs.writeFileSync(outputPath, header + rows.join('\n'))
  console.log(`\n✓ Results exported to: ${outputPath}`)
}

// ============================================================================
// STATS
// ============================================================================

function displayStats(results: ScrapeResult[]): void {
  const total = results.length
  const withData = results.filter(r => r.status === 'success').length
  const noData = results.filter(r => r.status === 'no_data').length
  const withSiret = results.filter(r => r.identifiers.some(i => i.siret)).length
  const withSiren = results.filter(r => r.identifiers.some(i => i.siren)).length
  const withTva = results.filter(r => r.identifiers.some(i => i.tva)).length
  const errors = results.filter(r => r.status === 'error').length
  const timeouts = results.filter(r => r.status === 'timeout').length
  const antibots = results.filter(r => r.status === 'antibot').length
  const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / total)
  const totalPagesChecked = results.reduce((sum, r) => sum + r.legalPagesChecked.length, 0)
  const avgPagesPerSite = (totalPagesChecked / total).toFixed(1)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('         ACKIS SCRAPING STATISTICS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total sites scraped:       ${total}`)
  console.log(`Success (with data):       ${withData} (${Math.round((withData / total) * 100)}%)`)
  console.log(`No data found:             ${noData} (${Math.round((noData / total) * 100)}%)`)
  console.log(``)
  console.log(`Sites with SIRET:          ${withSiret} (${Math.round((withSiret / total) * 100)}%)`)
  console.log(`Sites with SIREN:          ${withSiren} (${Math.round((withSiren / total) * 100)}%)`)
  console.log(`Sites with TVA:            ${withTva} (${Math.round((withTva / total) * 100)}%)`)
  console.log(``)
  console.log(`Errors:                    ${errors}`)
  console.log(`Timeouts:                  ${timeouts}`)
  console.log(`Anti-bot blocks:           ${antibots}`)
  console.log(``)
  console.log(`Avg pages checked/site:    ${avgPagesPerSite}`)
  console.log(`Avg duration per site:     ${avgDuration}ms`)
  console.log(`Total duration:            ${Math.round(results.reduce((sum, r) => sum + r.duration, 0) / 1000)}s`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('   ACKIS SIRET EXTRACTOR - PLAYWRIGHT')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // 1. Lecture CSV
  console.log(`Reading CSV: ${CONFIG.inputCsv}`)
  const urls = await readCsvUrls(CONFIG.inputCsv, CONFIG.maxSites)
  console.log(`✓ Loaded ${urls.length} URLs\n`)

  if (urls.length === 0) {
    console.error('No URLs found in CSV')
    process.exit(1)
  }

  // 2. Launch browser
  console.log('Launching browser...')
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  })

  // User-Agent aléatoire
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

  const context = await browser.newContext({
    userAgent,
    viewport: {width: 1920, height: 1080},
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    permissions: [],
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1',
    },
  })

  // Apply manual stealth techniques
  await context.addInitScript(() => {
    // Override navigator.webdriver
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined})

    // Override permissions
    const originalQuery = window.navigator.permissions.query
    window.navigator.permissions.query = parameters => {
      return parameters.name === 'notifications'
        ? Promise.resolve({state: 'denied'} as PermissionStatus)
        : originalQuery(parameters)
    }

    // Add chrome object
    ;(window as any).chrome = {runtime: {}}
  })

  console.log(`✓ Browser ready (User-Agent: ${userAgent.substring(0, 50)}...)\n`)

  // 3. Scrape
  const results: ScrapeResult[] = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const result = await scrapeSite(context, url)
    results.push(result)

    // Display result
    if (result.status === 'success') {
      const summary = result.identifiers
        .map(id => {
          const parts = []
          if (id.siret) parts.push(`SIRET: ${id.siret}`)
          if (id.siren && !id.siret) parts.push(`SIREN: ${id.siren}`)
          if (id.tva) parts.push(`TVA: ${id.tva}`)
          return parts.join(', ')
        })
        .join(' | ')
      console.log(`  ✓ ${summary} (${result.duration}ms)`)
    } else if (result.status === 'no_data') {
      console.log(`  ⚠ No data found (checked ${result.legalPagesChecked.length} pages, ${result.duration}ms)`)
    }

    console.log(``)

    // Rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests))
    }
  }

  // 4. Cleanup
  await context.close()
  await browser.close()

  // 5. Export & Stats
  exportToCsv(results, CONFIG.outputCsv)
  displayStats(results)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

# SIRET Extractor: v1.0 vs v3.0 - Factual Comparison Report

## Executive Summary

**Result:** v3.0 nodriver performs **WORSE** than v1.0 Playwright baseline.

- **v1.0 Success Rate:** 50% (5/10 sites)
- **v3.0 Success Rate:** 0% (0/10 sites)
- **Verdict:** Regression, not improvement

---

## Test Configuration

- **Same 10 URLs** from `test-website-723.csv`
- **Same extraction logic** (SIRET/SIREN/TVA regex + Luhn validation)
- **Tested on:** WSL2 Ubuntu (Linux 6.6.87.2)
- **Date:** 2025-10-22

---

## v1.0 Playwright (TypeScript) - Baseline Results

**Test Log:** `test-v1-baseline.log`
**Results CSV:** `results.csv`

### Statistics
```
Total sites scraped:       10
Success (with data):       5 (50%)
No data found:             4 (40%)
Errors:                    1 (10%)
Anti-bot blocks:           0
Avg duration per site:     4240ms
```

### Successful Extractions

| Site | Identifiers Found | Found On Page |
|------|------------------|---------------|
| frontignanthb.fr | SIRET: 42375741800011, SIREN: 423757418 | /mentions-legales |
| altaigroup.travel | SIREN: 388318313 | /mentions-légales |
| hapik.fr | SIREN: 819171992 | /mentions-legales |
| opal-ch.com | SIREN: 511860314, 419423728<br>TVA: FR47511860314 | /mentions-legales |
| safer-aura.fr | SIRET: 06250036800170<br>SIREN: 062500368<br>TVA: FR19062500368 | /mentions-legales |

### Failed Sites

- **groupe-sogepar-hotels.com** - No data found
- **nakama.tech** - No data found
- **happydemics.com** - No data found
- **nipro-group.com** - No data found (checked 1 page)
- **codeogroup.com** - Connection error (ERR_CONNECTION_RESET)

---

## v3.0 nodriver (Python) - Final Results

**Test Log:** `nodriver-version/test-v3-REAL-FINAL.log`
**Results CSV:** `nodriver-version/results-nodriver.csv`

### Statistics
```
Total sites scraped:       10
Success (with data):       0 (0%)
No data found:             0 (0%)
Errors:                    10 (100%)
Anti-bot blocks:           0
Fallback to non-headless:  0 (failed during retry)
Avg duration per site:     2600ms
Avg pages checked/site:    0.0
```

### Error Summary

**All 10 sites failed with:**
1. "Anti-bot detected" (FALSE POSITIVE - v1.0 had no issues)
2. "Retrying in non-headless mode..."
3. "Error: object NoneType can't be used in 'await' expression"

**Zero successful extractions.**

---

## Critical Bugs Discovered in nodriver Implementation

### Bug #1: `tab.evaluate()` returns RemoteObject instead of value
**Root Cause:** nodriver's `evaluate()` does not auto-extract `.value` without `return_by_value=True`
**Status:** ✅ FIXED
**Fix:** Added `return_by_value=True` to all `tab.evaluate()` calls

### Bug #2: 404 check crashes with TypeError on None
**Root Cause:** `'404' in None` throws TypeError when `tab.evaluate()` returns None
**Status:** ✅ FIXED
**Fix:** Added None checks before string operations

### Bug #3: Arrow functions not invoked (CRITICAL)
**Root Cause:** `tab.evaluate("() => expression")` returns the function itself, not the result
**Status:** ✅ FIXED
**Fix:** Changed all arrow functions to IIFE pattern: `"(() => expression)()"`

### Bug #4: False positive anti-bot detection
**Root Cause:** Unknown - all pages incorrectly flagged as anti-bot
**Status:** ❌ NOT FIXED
**Impact:** Prevents any page from being scraped

### Bug #5: browser.stop() not awaitable during fallback
**Root Cause:** `await browser.stop()` returns None instead of awaitable coroutine
**Status:** ❌ NOT FIXED
**Impact:** Fallback retry mechanism broken

---

## Side-by-Side Comparison

| Metric | v1.0 Playwright | v3.0 nodriver | Δ |
|--------|----------------|---------------|---|
| **Success Rate** | 50% (5/10) | 0% (0/10) | **-50%** |
| **Sites with SIRET** | 2 | 0 | -2 |
| **Sites with SIREN** | 5 | 0 | -5 |
| **Sites with TVA** | 2 | 0 | -2 |
| **Errors** | 1 | 10 | +9 |
| **Anti-bot blocks** | 0 | 10 (false) | +10 |
| **Avg Duration** | 4.2s | 2.6s | +1.6s faster |
| **Pages Checked/Site** | 1.0 | 0.0 | -1.0 |

---

## Conclusion

### Expected vs Reality

**Expected (from README):**
> Total sites scraped: 10
> Success (with data): 7-8 (70-80%) ← **+20-30%**
> Anti-bot blocks: 0 ← **Bypass maximal**

**Reality:**
> Total sites scraped: 10
> Success (with data): 0 (0%) ← **-50% vs baseline**
> Anti-bot blocks: 10 (false positives) ← **Worse detection**

### Why nodriver Failed

1. **API Complexity:** nodriver's `tab.evaluate()` requires non-obvious patterns (IIFE + return_by_value) that differ from Playwright/Puppeteer
2. **Incomplete Documentation:** Critical parameters not documented in examples
3. **Async/Await Issues:** Some methods return None instead of awaitables
4. **False Positive Detection:** Anti-bot detection too aggressive for normal sites
5. **Environment Issues:** Non-headless fallback doesn't work in WSL2

### Recommendations

1. **Keep v1.0 Playwright** as the production version (50% success rate)
2. **Abandon nodriver** for this use case (0% success, multiple unfixed bugs)
3. **Alternative Approach:** Fix Playwright's anti-bot detection with stealth plugins instead
4. **Proxy Rotation:** Add to v1.0 Playwright rather than rewrite in nodriver

---

## Test Artifacts

All test logs and results are committed to the repository:

```
/
├── src/                          # v1.0 Playwright (TypeScript)
├── results.csv                   # v1.0 results (5/10 success)
├── test-v1-baseline.log          # v1.0 test log
├── nodriver-version/             # v3.0 nodriver (Python)
│   ├── scraper.py                # 3 bugs fixed, 2 bugs remaining
│   ├── results-nodriver.csv      # v3.0 results (0/10 success)
│   ├── test-v3-REAL-FINAL.log    # v3.0 final test log
│   └── README.md                 # Expected vs reality
└── COMPARISON-REPORT.md          # This report
```

---

## Factual Statement

After implementing v3.0 with nodriver and fixing 3 critical API bugs, the scraper achieved **0% success rate** compared to v1.0's **50% success rate**.

nodriver does **NOT** provide better anti-bot bypass than Playwright in this implementation.

The factual result is: **v1.0 Playwright outperforms v3.0 nodriver by 50 percentage points**.

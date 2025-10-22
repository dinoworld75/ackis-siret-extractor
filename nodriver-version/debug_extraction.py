"""
Debug script to test content extraction on a single site
"""
import asyncio
import nodriver as uc
from extractors import extract_identifiers

async def debug_site():
    # Test frontignanthb.fr which v1.0 found SIRET 42375741800011 on /mentions-legales
    browser = await uc.start(headless=True)
    tab = await browser.get('http://www.frontignanthb.fr/mentions-legales')

    await asyncio.sleep(3)  # Wait for page load

    print("="*60)
    print("Testing content extraction methods:")
    print("="*60)

    # Method 1: innerText (current approach)
    print("\n1. Using innerText:")
    text1 = await tab.evaluate("() => document.body?.innerText || ''", return_by_value=True)
    print(f"Length: {len(text1) if text1 else 0}")
    print(f"Type: {type(text1)}")
    if text1:
        print(f"First 200 chars: {text1[:200]}")
        ids1 = extract_identifiers(text1)
        print(f"Found identifiers: {len(ids1)}")
        for id in ids1:
            print(f"  SIRET: {id.siret}, SIREN: {id.siren}, TVA: {id.tva}")

    # Method 2: textContent
    print("\n2. Using textContent:")
    text2 = await tab.evaluate("() => document.body?.textContent || ''", return_by_value=True)
    print(f"Length: {len(text2) if text2 else 0}")
    print(f"Type: {type(text2)}")
    if text2:
        print(f"First 200 chars: {text2[:200]}")
        ids2 = extract_identifiers(text2)
        print(f"Found identifiers: {len(ids2)}")
        for id in ids2:
            print(f"  SIRET: {id.siret}, SIREN: {id.siren}, TVA: {id.tva}")

    # Method 3: innerHTML
    print("\n3. Using innerHTML:")
    text3 = await tab.evaluate("() => document.body?.innerHTML || ''", return_by_value=True)
    print(f"Length: {len(text3) if text3 else 0}")
    print(f"Type: {type(text3)}")
    if text3:
        # Remove HTML tags for extraction
        import re
        text3_clean = re.sub(r'<[^>]+>', ' ', text3)
        print(f"First 200 chars (cleaned): {text3_clean[:200]}")
        ids3 = extract_identifiers(text3_clean)
        print(f"Found identifiers: {len(ids3)}")
        for id in ids3:
            print(f"  SIRET: {id.siret}, SIREN: {id.siren}, TVA: {id.tva}")

    # Check if page is loaded
    print("\n4. Page status:")
    title = await tab.evaluate("() => document.title", return_by_value=True)
    print(f"Title: {title}")
    ready_state = await tab.evaluate("() => document.readyState", return_by_value=True)
    print(f"Ready state: {ready_state}")

    try:
        await browser.stop()
    except:
        pass

if __name__ == '__main__':
    asyncio.run(debug_site())

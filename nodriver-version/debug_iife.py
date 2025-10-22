"""
Test IIFE vs arrow function
"""
import asyncio
import nodriver as uc

async def test():
    browser = await uc.start(headless=True)
    tab = await browser.get('http://www.frontignanthb.fr/mentions-legales')
    await asyncio.sleep(3)

    # Test 1: Arrow function (WRONG)
    result1 = await tab.evaluate("() => 'hello world'", return_by_value=True)
    print(f"Test 1 - Arrow function:")
    print(f"  Type: {type(result1)}")
    print(f"  Value: {result1}")

    # Test 2: IIFE (CORRECT)
    result2 = await tab.evaluate("(() => 'hello world')()", return_by_value=True)
    print(f"\nTest 2 - IIFE:")
    print(f"  Type: {type(result2)}")
    print(f"  Value: {result2}")

    # Test 3: Plain expression (ALSO CORRECT)
    result3 = await tab.evaluate("'hello world'", return_by_value=True)
    print(f"\nTest 3 - Plain expression:")
    print(f"  Type: {type(result3)}")
    print(f"  Value: {result3}")

    # Test 4: Document title with IIFE
    result4 = await tab.evaluate("(() => document.title)()", return_by_value=True)
    print(f"\nTest 4 - Document title (IIFE):")
    print(f"  Type: {type(result4)}")
    print(f"  Value: {result4}")

    # Test 5: innerText with IIFE
    result5 = await tab.evaluate("(() => document.body?.innerText || '')()", return_by_value=True)
    print(f"\nTest 5 - innerText (IIFE):")
    print(f"  Type: {type(result5)}")
    if isinstance(result5, str):
        print(f"  Length: {len(result5)}")
        print(f"  First 100 chars: {result5[:100]}")

    try:
        await browser.stop()
    except:
        pass

if __name__ == '__main__':
    asyncio.run(test())

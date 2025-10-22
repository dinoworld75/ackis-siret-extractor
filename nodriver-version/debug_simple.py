"""
Simple test to understand nodriver evaluate return values
"""
import asyncio
import nodriver as uc

async def test():
    browser = await uc.start(headless=True)
    tab = await browser.get('http://www.frontignanthb.fr/mentions-legales')
    await asyncio.sleep(3)

    # Test 1: Simple string
    result1 = await tab.evaluate("() => 'hello world'", return_by_value=True)
    print(f"Test 1 - Simple string:")
    print(f"  Type: {type(result1)}")
    print(f"  Value: {result1}")
    if hasattr(result1, 'value'):
        print(f"  Has .value: {result1.value}")

    # Test 2: Get title
    result2 = await tab.evaluate("() => document.title", return_by_value=True)
    print(f"\nTest 2 - Document title:")
    print(f"  Type: {type(result2)}")
    print(f"  Value: {result2}")
    if hasattr(result2, 'value'):
        print(f"  Has .value: {result2.value}")

    # Test 3: Check if value attribute exists on RemoteObject
    result3 = await tab.evaluate("() => document.body?.innerText || ''")
    print(f"\nTest 3 - Without return_by_value:")
    print(f"  Type: {type(result3)}")
    if hasattr(result3, 'value'):
        print(f"  Has .value: {result3.value}")
    if hasattr(result3, 'deep_serialized_value'):
        print(f"  Has .deep_serialized_value: {result3.deep_serialized_value}")

    try:
        await browser.stop()
    except:
        pass

if __name__ == '__main__':
    asyncio.run(test())

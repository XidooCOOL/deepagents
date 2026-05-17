import asyncio
from langchain_repl.interpreter import Interpreter

def test_sync():
    print("Testing max, min, sum (sync)...")
    
    interpreter = Interpreter()
    
    test_cases = [
        "max(12.34, 56)",
        "max([1, 2, 3, 4, 5])",
        'max({"a": 1, "b": 2, "c": 3})',
        "min(12.34, 56)",
        "min([1, 2, 3, 4, 5])",
        'min({"a": 1, "b": 2, "c": 3})',
        "sum([1, 2, 3, 4, 5])",
        "sum([1, 2, 3], 10)"
    ]
    
    for code in test_cases:
        print(f"\nTesting: {code}")
        try:
            result = interpreter.evaluate(code)
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {type(e).__name__}: {e}")

async def test_async():
    print("\nTesting max, min, sum (async)...")
    
    interpreter = Interpreter()
    
    test_cases = [
        "max(12.34, 56)",
        "max([1, 2, 3, 4, 5])",
        'max({"a": 1, "b": 2, "c": 3})',
        "min(12.34, 56)",
        "min([1, 2, 3, 4, 5])",
        'min({"a": 1, "b": 2, "c": 3})',
        "sum([1, 2, 3, 4, 5])",
        "sum([1, 2, 3], 10)"
    ]
    
    for code in test_cases:
        print(f"\nTesting: {code}")
        try:
            result = await interpreter.aevaluate(code)
            print(f"Result: {result}")
        except Exception as e:
            print(f"Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_sync()
    asyncio.run(test_async())

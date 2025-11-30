import sys
import os

# 添加项目根目录到 sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from etl.processing.pipeline import Pipeline

def test_factory():
    print("Testing Pipeline.create factory method...")
    try:
        # 创建一个空的 Pipeline
        p = Pipeline.create([])
        
        if isinstance(p, Pipeline):
            print("SUCCESS: Pipeline.create returned a Pipeline instance.")
        else:
            print(f"FAILURE: Pipeline.create returned {type(p)}")
            sys.exit(1)
            
        # 验证 handlers 是否正确设置
        if p._handlers == []:
            print("SUCCESS: Handlers initialized correctly.")
        else:
            print(f"FAILURE: Handlers not initialized correctly. Got {p._handlers}")
            sys.exit(1)
            
    except Exception as e:
        print(f"ERROR: An exception occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_factory()

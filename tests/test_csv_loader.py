# easyquant/tests/test_csv_loader.py
import pytest
import pandas as pd
from easyquant.etl.data_loader.csv_loader import CsvLoader

@pytest.fixture
def sample_csv_folder(tmp_path):
    """创建一个包含多个 CSV 文件的临时文件夹用于测试"""
    folder_path = tmp_path / "csv_data"
    folder_path.mkdir()

    # 文件1
    csv_content_1 = """date,open,close
2023-01-01,100,102
"""
    (folder_path / "stock_1.csv").write_text(csv_content_1, encoding='utf-8')

    # 文件2
    csv_content_2 = """date,open,close
2023-01-02,102,107
"""
    (folder_path / "stock_2.csv").write_text(csv_content_2, encoding='utf-8')

    # 添加一个不匹配格式的文件
    (folder_path / "other.txt").write_text("ignore me", encoding='utf-8')
    
    return str(folder_path)

@pytest.fixture
def sample_single_csv_file(tmp_path):
    """创建一个临时的单个 CSV 文件用于测试"""
    csv_content = """date,open,close
2023-01-01,100,102
"""
    file_path = tmp_path / "single.csv"
    file_path.write_text(csv_content, encoding='utf-8')
    return str(file_path)

@pytest.mark.asyncio
async def test_stream_from_folder(sample_csv_folder):
    """
    测试 CsvLoader 从文件夹流式加载多个 CSV 文件的能力。
    """
    loader = CsvLoader(path=sample_csv_folder, file_pattern="*.csv")
    
    results = []
    async for file_path, df in loader.stream():
        assert isinstance(df, pd.DataFrame)
        assert not df.empty
        results.append(df)

    assert len(results) == 2
    
    # 验证合并后的结果
    final_df = pd.concat(results, ignore_index=True)
    assert len(final_df) == 2
    assert 'close' in final_df.columns

@pytest.mark.asyncio
async def test_load_from_folder(sample_csv_folder):
    """
    测试 CsvLoader 使用 load 方法从文件夹加载的能力。
    """
    loader = CsvLoader(path=sample_csv_folder)
    df = await loader.load()

    assert isinstance(df, pd.DataFrame)
    assert not df.empty
    assert len(df) == 2
    assert list(df.columns) == ['date', 'open', 'close']

@pytest.mark.asyncio
async def test_load_from_single_file(sample_single_csv_file):
    """
    测试 CsvLoader 从单个文件加载的能力。
    """
    loader = CsvLoader(path=sample_single_csv_file)
    df = await loader.load()

    assert isinstance(df, pd.DataFrame)
    assert not df.empty
    assert len(df) == 1
    assert df.loc[0, 'close'] == 102

@pytest.mark.asyncio
async def test_load_from_non_existent_path():
    """
    测试当路径不存在时，CsvLoader 是否返回一个空的 DataFrame。
    """
    loader = CsvLoader(path="/path/to/non_existent_folder")
    df = await loader.load()

    assert isinstance(df, pd.DataFrame)
    assert df.empty
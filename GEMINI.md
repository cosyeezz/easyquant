# Gemini Pro Agent 开发与交互准则

本文档定义了与 Gemini Pro Agent 在本`EasyQuant`项目中交互和协作的核心编码约定。所有由 Agent 生成或修改的代码、文档和注释都必须严格遵守以下规范。

---

## **重要编码约定：代码功能化与职责单一原则**

**为了确保项目的长期可维护性、可读性和可测试性，所有代码贡献都应遵循以下核心原则：**

*   **统一语言：中文优先 (Language: Chinese First):**
    *   **交流与文档:** 所有项目相关的交流、文档、注释、`git commit` 信息均应使用中文。
    *   **代码内字符串:** 代码中所有面向用户展示的日志信息、异常信息等字符串，必须使用中文。
    *   **目标:** 确保团队成员之间的沟通无障碍，代码和日志对中文母语者友好，降低理解成本。

*   **函数/方法职责单一 (Single Responsibility Principle):**
    *   一个函数或方法应该只做一件事情，并且把它做好。
    *   避免编写“万能”的、包含大量逻辑的超长函数。

*   **保持简短，提高可读性:**
    *   将复杂的流程拆解为一系列命名清晰、职责单一的辅助函数。
    *   主干逻辑函数的代码应该像一份高级伪代码，通过调用这些辅助函数，能清晰地展示出业务流程的各个步骤。读者仅通过阅读主干函数的方法名，就应该能理解整个流程在做什么。

*   **示例:**

    ```python
    # 不推荐 ❌: 一个冗长且难以阅读的函数
    async def process_market_data_file(file_path: str):
        # 1. 读取文件
        logger.info(f"开始处理文件: {file_path}")
        try:
            with open(file_path, 'r') as f:
                content = f.read()
        except Exception as e:
            logger.error("读取文件失败")
            return

        # 2. 解析数据
        lines = content.split('\n')
        data = []
        for line in lines:
            # ...复杂的解析逻辑...
            data.append(parsed_item)

        # 3. 清洗和转换
        df = pd.DataFrame(data)
        # ...复杂的数据清洗和转换逻辑...
        
        # 4. 存入数据库
        logger.info("开始写入数据库...")
        # ...直接在这里写数据库连接和插入逻辑...
        logger.info("数据处理完成。")

    # 推荐 ✅: 功能化、职责清晰的实现
    async def _read_data_from_file(file_path: str) -> str:
        """
        [职责1: 数据读取]
        专门负责从文件中安全地读取所有原始内容。
        - **封装IO操作**: 将文件读写的细节（如编码、异常处理）封装在此处。
        - **易于测试**: 可以通过模拟文件轻松测试此函数。
        """
        # ...具体的 aiofiles 读写实现细节...
        # ...包含详细的 try...except...finally 块来确保资源被释放...
        pass

    def _parse_raw_content(content: str) -> pd.DataFrame:
        """
        [职责2: 数据解析]
        将原始的、非结构化的字符串内容解析成结构化的 DataFrame。
        - **纯函数**: 它的输出完全由输入决定，不依赖任何外部状态（如文件、数据库）。
        - **极易测试**: 测试时只需传入不同的字符串，断言输出的 DataFrame 是否符合预期即可。
        """
        # ...具体的数据解析逻辑，例如按行分割、按分隔符切分、类型转换等...
        pass

    def _clean_and_transform_data(df: pd.DataFrame) -> pd.DataFrame:
        """
        [职责3: 业务处理]
        对已结构化的 DataFrame 进行数据清洗、计算新指标、转换格式等核心业务操作。
        - **封装业务逻辑**: 所有的数据处理规则都集中在这里，是业务的核心。
        - **可独立测试**: 可以创建一个小型的、包含各种边界情况的 DataFrame 来专门测试这里的逻辑是否正确。
        """
        # ...具体的业务逻辑，例如处理缺失值、计算均线、调整数据格式等...
        pass

    async def _save_data_to_db(df: pd.DataFrame):
        """
        [职责4: 数据存储]
        将最终处理好的 DataFrame 高效地存入数据库。
        - **封装数据库交互**: 将数据库的连接、批量插入等技术细节封装起来。
        - **可模拟 (Mock)**: 在测试主流程时，可以轻易地用一个假的（mock）函数替换掉它，从而避免了真实的数据库写入。
        """
        # ...调用已封装好的 bulk_insert_df 等高性能数据库操作...
        pass

    async def process_market_data_file(file_path: str):
        """
        [主流程编排器 (Orchestrator)]
        这个函数本身不执行任何具体的业务逻辑，它的唯一职责是“编排”和“调度”其他辅助函数。
        它的代码读起来就像一份任务清单，清晰地描述了完成整个任务需要哪几步。
        """
        try:
            # --- 步骤 0: 记录任务开始 ---
            # 提供清晰的日志跟踪，是良好可维护性的开端。
            logger.info(f"开始处理文件: {file_path}")

            # --- 步骤 1: 读取 ---
            # 调用职责单一的IO函数，只关心能否拿到原始数据。
            raw_content = await _read_data_from_file(file_path)

            # --- 步骤 2: 解析 ---
            # 将原始数据传递给解析函数，获得结构化数据。
            raw_df = _parse_raw_content(raw_content)

            # --- 步骤 3: 处理 ---
            # 将结构化数据传递给业务处理函数，获得最终结果。
            clean_df = _clean_and_transform_data(raw_df)

            # --- 步骤 4: 存储 ---
            # 将最终结果传递给存储函数，完成持久化。主流程不关心具体如何存储。
            await _save_data_to_db(clean_df)

            # --- 步骤 5: 记录任务成功 ---
            logger.info(f"文件处理成功: {file_path}")

        except Exception as e:
            # --- 统一的异常处理 ---
            # 任何一个步骤失败，都会在这里被捕获和记录。
            # 这使得核心流程更加健壮，错误处理逻辑集中在一处，而非散落在各处。
            logger.error(f"处理文件失败: {file_path}，错误: {e}", exc_info=True)

    ```

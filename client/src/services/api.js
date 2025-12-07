import axios from 'axios';

const API_BASE_URL = '/api/v1';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        const msg = err.response?.data?.detail || err.message || '请求失败'
        console.error('API Error:', msg)
        return Promise.reject(err)
      }
    );
  }

  /**
   * 获取事件列表
   * @param {Object} params - 查询参数
   * @param {string} params.process_name - 进程名称筛选
   * @param {string} params.event_name - 事件名称筛选
   * @param {number} params.limit - 返回数量限制
   * @param {number} params.offset - 分页偏移
   */
  async getEvents(params = {}) {
    const response = await this.client.get('/events', { params });
    return response.data;
  }

  /**
   * 获取所有进程列表和最新状态
   */
  async getProcesses() {
    const response = await this.client.get('/processes');
    return response.data;
  }

  /**
   * 获取特定进程的事件
   * @param {string} processName - 进程名称
   * @param {number} limit - 返回数量限制
   */
  async getProcessEvents(processName, limit = 50) {
    return this.getEvents({
      process_name: processName,
      limit,
    });
  }

  // ========== ETL Config API ==========

  async getETLConfigs() {
    const response = await this.client.get('/etl-configs');
    return response.data;
  }

  async getETLConfig(id) {
    const response = await this.client.get(`/etl-configs/${id}`);
    return response.data;
  }

  async createETLConfig(config) {
    const response = await this.client.post('/etl-configs', config);
    return response.data;
  }

  async updateETLConfig(id, config) {
    const response = await this.client.put(`/etl-configs/${id}`, config);
    return response.data;
  }

  async deleteETLConfig(id) {
    const response = await this.client.delete(`/etl-configs/${id}`);
    return response.data;
  }

  async runETLConfig(id) {
    const response = await this.client.post(`/etl-configs/${id}/run`);
    return response.data;
  }

  async previewSource(sourceType, sourceConfig) {
    const response = await this.client.post('/etl/preview-source', {
      source_type: sourceType,
      source_config: sourceConfig,
    });
    return response.data;
  }

  async getHandlers() {
    const response = await this.client.get('/etl/handlers');
    return response.data;
  }

  // ========== Data Table API ==========

  async getDataTables() {
    const response = await this.client.get('/data-tables');
    return response.data;
  }

  async getDataTable(id) {
    const response = await this.client.get(`/data-tables/${id}`);
    return response.data;
  }

  async createDataTable(data) {
    const response = await this.client.post('/data-tables', data);
    return response.data;
  }

  async updateDataTable(id, data) {
    const response = await this.client.put(`/data-tables/${id}`, data);
    return response.data;
  }

  async deleteDataTable(id) {
    const response = await this.client.delete(`/data-tables/${id}`);
    return response.data;
  }

  async publishDataTable(id) {
    const response = await this.client.post(`/data-tables/${id}/publish`);
    return response.data;
  }

  async getTableCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }
}

export default new ApiService();

import axios from 'axios';

const API_BASE_URL = '/api/v1';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
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
   * 创建新事件
   * @param {Object} event - 事件数据
   * @param {string} event.process_name - 进程名称
   * @param {string} event.event_name - 事件名称
   * @param {Object} event.payload - 事件详细信息
   */
  async createEvent(event) {
    const response = await this.client.post('/events', event);
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
}

export default new ApiService();

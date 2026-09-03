import apiClient from '../client';

export const aiApi = {
  /**
   * Scans a receipt, bill, or UPI payment screenshot using Vision AI
   * @param {FormData} formData containing 'file'
   */
  scanReceipt: (formData) =>
    apiClient.post('/ai/scan-receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * Parses natural language text into a structured expense
   * @param {string} text
   */
  parseExpense: (text) => apiClient.post('/ai/parse-expense', { text }),

  /**
   * Sends user message to FinTrack AI Financial Advisor
   * @param {string} message
   * @param {Array} history
   */
  chat: (message, history = []) => apiClient.post('/ai/chat', { message, history }),

  /**
   * Retrieves predictive spending forecast and budget overrun alerts
   */
  getForecast: () => apiClient.get('/ai/forecast'),

  /**
   * Retrieves monthly financial health score and digest
   * @param {string} [month] - YYYY-MM-01 format
   */
  getMonthlyDigest: (month) => apiClient.get('/ai/monthly-digest', { params: { month } }),
};

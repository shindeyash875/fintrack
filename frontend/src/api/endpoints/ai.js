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
   * @param {string|object} textOrPayload
   */
  parseExpense: (textOrPayload) => {
    const text = typeof textOrPayload === 'object' && textOrPayload !== null ? textOrPayload.text : textOrPayload;
    return apiClient.post('/ai/parse-expense', { text });
  },

  /**
   * Sends user message to FinTrack AI Financial Advisor
   * @param {string|object} messageOrPayload
   * @param {Array} [history]
   */
  chat: (messageOrPayload, history = []) => {
    if (typeof messageOrPayload === 'object' && messageOrPayload !== null) {
      return apiClient.post('/ai/chat', {
        message: messageOrPayload.message,
        history: messageOrPayload.history || [],
      });
    }
    return apiClient.post('/ai/chat', { message: messageOrPayload, history });
  },

  /**
   * Retrieves predictive spending forecast and budget overrun alerts
   */
  getForecast: () => apiClient.get('/ai/forecast'),

  /**
   * Retrieves monthly financial health score and digest
   * @param {string} [month] - YYYY-MM-01 format
   */
  getMonthlyDigest: (month) => apiClient.get('/ai/monthly-digest', { params: { month } }),

  /**
   * Simulates purchase affordability against budget headroom and cashflow
   * @param {object} payload - { item_name, amount, category_id, payment_method, emi_months }
   */
  simulateAffordability: (payload) => apiClient.post('/ai/simulate-affordability', payload),

  /**
   * Generates AI 50/30/20 Smart Auto-Budget recommendations
   * @param {object} payload - { monthly_income, savings_target_percentage, lifestyle_mode }
   */
  generateSmartBudget: (payload) => apiClient.post('/ai/generate-smart-budget', payload),

  /**
   * Saves and persists generated smart budget limits to user's database
   * @param {object} payload - { period_month, overall_limit, category_budgets }
   */
  applySmartBudget: (payload) => apiClient.post('/ai/apply-smart-budget', payload),
};


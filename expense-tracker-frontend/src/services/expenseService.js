import api from '../api/axios';

/**
 * Fetch all expenses (no pagination) optionally filtered by date range.
 * @param {{startDate?: string|null, endDate?: string|null}} range
 * @returns {Promise<Array>} list of ExpenseDto-like objects
 */
export async function fetchAllExpenses(range = {}) {
  const params = {};
  if (range.startDate) params.start = range.startDate; // expect YYYY-MM-DD
  if (range.endDate) params.end = range.endDate;

  // NOTE: baseURL already ends with /api (see Dashboard api.get('/expenses')) so we use '/expenses/export'
  const endpoint = '/expenses/export';
  try {
    const res = await api.get(endpoint, { params });
    return res.data;
  } catch (err) {
    console.error('fetchAllExpenses failed', { endpoint, params, err });
    throw err;
  }
}

export default { fetchAllExpenses };

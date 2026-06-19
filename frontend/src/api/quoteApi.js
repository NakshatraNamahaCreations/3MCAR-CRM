import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const quoteApi = {
  ...createCrudApi('/quotes'),
  accept: (id, payload = {}) => api.patch(`/quotes/${id}/accept`, payload).then((r) => r.data),
  createFromEnquiry: (payload) => api.post('/quotes', payload).then((r) => r.data),
  byEnquiry: (enquiryId) => api.get(`/quotes/enquiry/${enquiryId}`).then((r) => r.data),
  changeStatus: (id, status) =>
    api.patch(`/quotes/${id}/status`, { status }).then((r) => r.data),
  /** Fetch the PDF as a Blob object URL (for inline <iframe> viewing). Caller must revoke it. */
  pdfObjectUrl: async (id) => {
    const blob = await api.get(`/quotes/${id}/pdf?inline=1`, { responseType: 'blob' });
    return window.URL.createObjectURL(blob);
  },
  downloadPdf: async (id, quoteNumber) => {
    const blob = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Quote-${quoteNumber || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export { quoteApi };
export default quoteApi;

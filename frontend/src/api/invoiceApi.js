import api from './axiosInstance.js';
import { createCrudApi } from './crudFactory.js';

const invoiceApi = {
  ...createCrudApi('/invoices'),
  cancel: (id) => api.patch(`/invoices/${id}/cancel`).then((r) => r.data),
  byJobCard: (jobCardId) => api.get(`/invoices/jobcard/${jobCardId}`).then((r) => r.data),
  /** Fetch the invoice PDF as a Blob object URL (for inline <iframe> viewing). Caller must revoke it. */
  pdfObjectUrl: async (id) => {
    const blob = await api.get(`/invoices/${id}/pdf?inline=1`, { responseType: 'blob' });
    return window.URL.createObjectURL(blob);
  },
  /**
   * Fetch the invoice PDF as a Blob and trigger a browser download.
   * The axios interceptor unwraps to `res.data`, which is the Blob here.
   */
  downloadPdf: async (id, invoiceNumber) => {
    const blob = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoiceNumber || id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export { invoiceApi };
export default invoiceApi;

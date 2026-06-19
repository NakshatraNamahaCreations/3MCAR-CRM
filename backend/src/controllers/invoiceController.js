import * as invoiceService from '../services/invoiceService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';
import { streamInvoicePdf } from '../utils/invoicePdf.js';
import { getSettings } from '../services/settingsService.js';

export const createFromJobCard = asyncHandler(async (req, res) => {
  const jobCardId = req.body.jobCardId || req.params.jobCardId;
  const invoice = await invoiceService.createFromJobCard(jobCardId, req.user._id);
  sendSuccess(res, {
    message: 'Invoice generated from job card',
    data: invoice,
    statusCode: 201,
  });
});

export const getAll = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.getAll({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Invoices fetched', data: invoices });
});

export const getById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  sendSuccess(res, { message: 'Invoice fetched', data: invoice });
});

export const getByCustomerId = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.getByCustomerId(req.params.customerId);
  sendSuccess(res, { message: 'Invoices fetched', data: invoices });
});

export const getByJobCardId = asyncHandler(async (req, res) => {
  const invoices = await invoiceService.getByJobCardId(req.params.jobCardId);
  sendSuccess(res, { message: 'Invoices fetched', data: invoices });
});

export const update = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.update(req.params.id, req.body);
  sendSuccess(res, { message: 'Invoice updated', data: invoice });
});

export const cancel = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.cancel(req.params.id);
  sendSuccess(res, { message: 'Invoice cancelled', data: invoice });
});

/**
 * Stream the invoice as a downloadable PDF.
 * Not wrapped in the JSON envelope — sets PDF headers and pipes the document.
 */
export const downloadPdf = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(req.params.id);
  const settings = await getSettings();
  const filename = `Invoice-${invoice.invoiceNumber || invoice._id}.pdf`;
  const disposition = req.query.inline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  await streamInvoicePdf(invoice, res, settings);
});

export default {
  createFromJobCard,
  getAll,
  getById,
  getByCustomerId,
  getByJobCardId,
  update,
  cancel,
  downloadPdf,
};

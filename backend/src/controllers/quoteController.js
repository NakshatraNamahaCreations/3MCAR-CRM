import {
  createQuoteFromEnquiry,
  getAllQuotes,
  getQuoteById,
  getQuotesByEnquiryId,
  updateQuote,
  changeQuoteStatus,
  deleteQuote,
} from '../services/quoteService.js';
import { acceptQuoteAndConvert } from '../services/conversionService.js';
import { sendSuccess, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiResponse.js';
import { streamQuotePdf } from '../utils/quotePdf.js';
import { getSettings } from '../services/settingsService.js';

/**
 * Create a quote from an enquiry.
 */
export const createFromEnquiry = asyncHandler(async (req, res) => {
  const quote = await createQuoteFromEnquiry({ ...req.body, branchId: req.activeBranchId }, req.user._id);
  sendSuccess(res, { message: 'Quote created successfully', data: quote, statusCode: 201 });
});

/**
 * List quotes (filters: status, enquiryId; search).
 */
export const getAll = asyncHandler(async (req, res) => {
  const quotes = await getAllQuotes({ ...req.query, branchId: req.activeBranchId });
  sendSuccess(res, { message: 'Quotes fetched successfully', data: quotes });
});

/**
 * Get a single quote by id.
 */
export const getById = asyncHandler(async (req, res) => {
  const quote = await getQuoteById(req.params.id);
  sendSuccess(res, { message: 'Quote fetched successfully', data: quote });
});

/**
 * Get all quotes for an enquiry.
 */
export const getByEnquiryId = asyncHandler(async (req, res) => {
  const quotes = await getQuotesByEnquiryId(req.params.enquiryId);
  sendSuccess(res, { message: 'Quotes fetched successfully', data: quotes });
});

/**
 * Update a quote.
 */
export const update = asyncHandler(async (req, res) => {
  const quote = await updateQuote(req.params.id, req.body);
  sendSuccess(res, { message: 'Quote updated successfully', data: quote });
});

/**
 * Change a quote's status.
 */
export const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError('status is required', 400);
  const quote = await changeQuoteStatus(req.params.id, status);
  sendSuccess(res, { message: 'Quote status updated successfully', data: quote });
});

/**
 * Accept a quote and convert it (delegated to conversionService).
 */
export const acceptQuote = asyncHandler(async (req, res) => {
  const { appointmentDate, appointmentTime } = req.body || {};
  const result = await acceptQuoteAndConvert(req.params.id, req.user._id, { appointmentDate, appointmentTime });
  sendSuccess(res, { message: 'Quote accepted and converted successfully', data: result });
});

/**
 * Delete a quote.
 */
export const remove = asyncHandler(async (req, res) => {
  const result = await deleteQuote(req.params.id);
  sendSuccess(res, { message: 'Quote deleted successfully', data: result });
});

/**
 * Stream the quote as a downloadable PDF.
 */
export const downloadPdf = asyncHandler(async (req, res) => {
  const quote = await getQuoteById(req.params.id);
  const settings = await getSettings();
  const filename = `Quote-${quote.quoteNumber || quote._id}.pdf`;
  const disposition = req.query.inline ? 'inline' : 'attachment';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
  await streamQuotePdf(quote, res, settings);
});

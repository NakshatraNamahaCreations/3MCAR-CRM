import * as settingsService from '../services/settingsService.js';
import { sendSuccess, asyncHandler } from '../utils/apiResponse.js';

export const getSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.getSettings();
  sendSuccess(res, { message: 'Settings fetched', data });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.updateSettings(req.body);
  sendSuccess(res, { message: 'Settings updated', data });
});

export default { getSettings, updateSettings };

import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
) {
  return res.status(200).json({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    message,
  });
}

export function sendError(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, message });
}

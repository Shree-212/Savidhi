import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { templesRouter } from './routes/temples';
import { deitiesRouter } from './routes/deities';
import { pujasRouter } from './routes/pujas';
import { chadhavasRouter } from './routes/chadhavas';
import { pujarisRouter } from './routes/pujaris';
import { astrologersRouter } from './routes/astrologers';
import { hampersRouter } from './routes/hampers';
import { settingsRouter } from './routes/settings';

const app = express();
const PORT = process.env.PORT ?? 4003;

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3001').split(','), credentials: true }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'catalog-service', timestamp: new Date().toISOString() });
});

app.use('/api/v1/catalog/temples', templesRouter);
app.use('/api/v1/catalog/deities', deitiesRouter);
app.use('/api/v1/catalog/pujas', pujasRouter);
app.use('/api/v1/catalog/chadhavas', chadhavasRouter);
app.use('/api/v1/catalog/pujaris', pujarisRouter);
app.use('/api/v1/catalog/astrologers', astrologersRouter);
app.use('/api/v1/catalog/hampers', hampersRouter);
app.use('/api/v1/catalog/settings', settingsRouter);

app.use(errorHandler);

app.listen(PORT, () => { console.log(`[catalog-service] Running on port ${PORT}`); });

export default app;

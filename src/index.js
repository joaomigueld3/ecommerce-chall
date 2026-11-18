import { readFileSync } from 'node:fs';
import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import './database/index.js';
import allRoutes from './adapters/secondary/routes/allRoutes.js';

dotenv.config({ path: '.env' });

const swaggerDocument = JSON.parse(
  readFileSync(new URL('./swagger-output.json', import.meta.url), 'utf8'),
);

const PORT = process.env.PORT || 9095;
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', allRoutes);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on PORT ${PORT}`);
});

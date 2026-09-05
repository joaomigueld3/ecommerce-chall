import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import allRoutes from './adapters/secondary/routes/allRoutes.js';
import swaggerDocument from './swagger-output.json' with { type: 'json' };
import { ready as databaseReady } from './database/index.js';
import { expressErrorHandler, notFoundHandler } from './utils/errorHandler.js';

const { PORT } = process.env;

const app = express();

app.use(cors());
app.use(helmet());

app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api', allRoutes);

app.use(notFoundHandler);
app.use(expressErrorHandler);

async function start() {
  await databaseReady;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on PORT ${PORT}`);
  });
}

start();

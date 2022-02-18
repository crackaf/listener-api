/* eslint-disable no-console */
import express from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { AbiItem } from 'web3-utils';
import { IContractSchema, IEventSchema } from './utils/types';
import abi from './config/abi/standardInterface.json';
import { Listener } from './modules/listener';
import db from './modules/database';
import { EventModel } from './schema';

const app = express();
const port = 3000;

// Listener calling
// let l = null;
try {
  // l = new Listener(db);
} catch (e) {
  Sentry.captureException(e);
}

// const listener: Listener = l;

Sentry.init({
  dsn: 'https://b0559d6508694b5da9915e251e3dbb48@o1146133.ingest.sentry.io/6214565',
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

// RequestHandler creates a separate execution context using domains,
// so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// All controllers should live here

app.get('/contracts', (req, res) => {
  db.fetchContract(req.query)
    .then((result) => {
      if (result.length > 0) {
        console.info(`Contract found`);
        Sentry.addBreadcrumb({
          message: `Contract found.`,
          data: req.query,
        });
      } else {
        console.info(`Could not find contract.`);
        Sentry.addBreadcrumb({
          message: `Contract not found.`,
          data: req.query,
        });
      }
      res.json(result);
    })
    .catch((err) => {
      console.info(`Encountered error while getting contract.`);
      Sentry.addBreadcrumb({
        message: `Error getting contract.`,
        data: { error: err, ...req.query },
      });
      res.json(err);
    });
});

app.get('/events', (req, res) => {
  db.fetchEvent(req.query)
    .then((result) => {
      if (result.length > 0) {
        console.info(`Event found`);
        Sentry.addBreadcrumb({
          message: `Event found.`,
          data: req.query,
        });
        console.info(result);
      } else {
        console.info(`Could not find event`);
        Sentry.addBreadcrumb({
          message: `Event not found.`,
          data: req.query,
        });
      }
      res.json(result);
    })
    .catch((err) => {
      console.info(`Encountered error while getting event`);
      Sentry.addBreadcrumb({
        message: `Error getting event.`,
        data: { error: err, ...req.query },
      });
      res.json(err);
    });
});

// app.get('/addcontractevent', (req, res) => {

// })

app.get('/testcontract', async (req, res) => {
  const contractObj: IContractSchema = {
    network: 'rinkeby',
    jsonInterface: abi as AbiItem[],
    address: '12345',
    events: ['Transfer', 'OwnershipTransferred'],
    latestBlock: 10165138,
  };
  db.insertContract(contractObj);
});

// app.post('/addcontractevent', (req, res) => {
//   const address=
//   res.status(200);
// });

app.get('/testUpdate/:contract/', async (req, res) => {
  const { blockNum, events } = req.query as {
    blockNum: string;
    events: string;
  };
  await db.updateContract({
    address: req.params.contract,
    latestBlock: parseInt(blockNum),
    events: JSON.parse(events),
  });
  // ContractModel.exists({address})
  // if (flag) res.send('updated');
  // else res.send('not updated');
  res.status(200);
});

// The error handler must be before any other error middleware
// and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  console.error(err);
  // eslint-disable-next-line no-param-reassign
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

app.listen(port, () => {
  return console.info(`Express is listening at http://localhost:${port}`);
});

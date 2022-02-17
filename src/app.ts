import express from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { AbiItem } from 'web3-utils';
import { EventModel } from './schema';
import { IContractSchema, IEventSchema } from './utils/types';
import abi from './config/abi/standardInterface.json';
import { Listener } from './modules/listener';
import db from './modules/database';

const app = express();
const port = 3000;

// Listener calling
let l = null;
try {
  l = new Listener(db);
} catch (e) {
  Sentry.captureException(e);
}

const listener: Listener = l;

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

app.get('/testcontract', async (req, res) => {
  const contractObj: IContractSchema = {
    network: 'https://rinkeby-light.eth.linkpool.io/',
    jsonInterface: abi as AbiItem[],
    address: '0x0D72bad65008D1E3D42E9699dF619c7555A1311d',
    events: ['TransferTo', 'TransferFrom'],
    latestBlock: 12,
  };
  db.insertContract(contractObj);
  res.send('inserted');
});

app.get('/testevent', async (req, res) => {
  const eventObj: IEventSchema = {
    address: '0x706d17f6a15177865244B25aEfdfDBE1e572c7E6',
    blockNumber: 70,
    transactionHash: '0x706d17f6a15177865244B25aEfdfDBE1e572c7E6',
    event: 'TransferFrom',
    returnValues: {
      owner: '0x369f70E1eb531E4523AEe4a66Fb9DF49E73e912E',
      amount: 22,
    },
  };
  // dbConnector.insertEvent(eventObj);
  const newObj = await new EventModel(eventObj).save();
  res.send(newObj);
});

// The error handler must be before any other error middleware
// and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

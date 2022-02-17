import express from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { AbiItem } from 'web3-utils';
import { IContractSchema } from './utils/types';
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

app.get('/testcontract', async (req, res) => {
  const contractObj: IContractSchema = {
    network: 'rinkeby',
    jsonInterface: abi as AbiItem[],
    address: '0x0D72bad65008D1E3D42E9699dF619c7555A1311d',
    events: ['Transfer', 'OwnershipTransferred'],
    latestBlock: 10165138,
  };
  // db.insertContract(contractObj);

  const flag = await db.isExistContract(
    '0x0d72BAD65008D1E3D42E9699dffF619c7555A1311D',
  );
  if (flag) res.send('exists');
  else res.send('doesnt exist');
});

app.get('/testUpdate/:contract/:block', async (req, res) => {
  const flag = await db.updateContract({
    address: req.params.contract,
    latestBlock: parseInt(req.params.block),
  });
  // ContractModel.exists({address})
  // if (flag) res.send('updated');
  // else res.send('not updated');
  console.log(flag);
  res.send(flag);
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

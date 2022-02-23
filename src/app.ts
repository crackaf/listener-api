import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Listener } from './modules/listener';
import db from './modules/database';
import { makeQuery } from './utils/apiHelper';
import { IContractSchema, IEventSchema } from './utils/types';

const app = express();
const port = process.argv[2];
console.info('Using Port: ', port);

let listener: Listener;
try {
  listener = new Listener(db);
} catch (e) {
  Sentry.captureException(e);
  console.error(e);
}

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

// cross origin reques
app.use(cors());
// RequestHandler creates a separate execution context using domains,
// so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(bodyParser.json());

// All controllers should live here

// GET contracts
app.get('/contracts/:address/:network', (req, res) => {
  const obj = makeQuery<IContractSchema>(req.params, req.query);

  db.fetchContract(obj).then((result) => {
    res.json(result);
  });
});

app.get('/contracts/:address', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);

  db.fetchContract(obj).then((result) => {
    res.json(result);
  });
});

app.get('/contracts', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);

  db.fetchContract(obj).then((result) => {
    res.json(result);
  });
});

// GET EVENTS

app.get('/events/:address', (req, res) => {
  const obj = makeQuery<IEventSchema>(
    req.params as any,
    req.query,
    'retrunValues',
  );
  db.fetchEvent(obj).then((result) => {
    res.json(result);
  });
});

app.get('/events', (req, res) => {
  const obj = makeQuery<IEventSchema>(req.params as any, req.query);
  db.fetchEvent(obj).then((result) => {
    res.json(result);
  });
});

// GET TOKENS

app.get('/tokens/:address/:network/:tokenId', (req, res) => {
  const obj = makeQuery(req.params as any, req.query, 'data');
  db.fetchToken(obj).then((result) => {
    res.json(result);
  });
});

app.get('/tokens/:address/:tokenId', (req, res) => {
  const obj = makeQuery(req.params as any, req.query, 'data');
  db.fetchToken(obj).then((result) => {
    res.json(result);
  });
});

app.get('/tokens/:address/:network', (req, res) => {
  const obj = makeQuery(req.params as any, req.query, 'data');
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});

app.get('/tokens/:address', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});

app.get('/tokens', (req, res) => {
  const obj = makeQuery(req.params as any, req.query);
  db.fetchToken(obj).then((result) => {
    res.json([req.params, req.query, obj, result]);
  });
});

// POST contracts
app.post('/contracts', (req, res) => {
  const { network, jsonInterface, address, events, latestBlock } = req.body;
  listener
    .add(network, jsonInterface, address, events, latestBlock)
    .then((result) => {
      if (result) {
        console.info(`Added contract ${result.msg}`);
        Sentry.addBreadcrumb({
          message: `Contract added.`,
          data: { result: result },
        });
      } else {
        console.info(`Could not add contract ${result.msg}`);
        Sentry.addBreadcrumb({
          message: `Contract not added.`,
          data: { result: result },
        });
      }
      res.json(result);
    })
    .catch((err: Error) => {
      console.info(
        `Encountered error while inserting contract ${req.body}.
       Error: ${err.message}`,
      );
      Sentry.addBreadcrumb({
        message: `Error inserting contract.`,
        data: { error: err, body: req.body },
      });
      res.json(err);
    })
    .finally(() => {
      listener._loadDb();
    });
});

// PUT contract
app.put('/contracts/:id', (req, res) => {
  const data = { ...req.body, ...req.params };
  db.updateContract(data)
    .then((doc) => {
      if (!doc) {
        console.info(`Invalid address. Not updated `);
        Sentry.addBreadcrumb({
          message: `Contract not updated.`,
          data: data,
        });
      } else {
        console.info(`Contract updated`);
        Sentry.addBreadcrumb({
          message: `Contract updated.`,
          data: { ...req.body, ...req.params },
        });
      }
      res.json(doc);
    })
    .catch((err) => {
      console.info(`Encountered error while updating contract`);
      Sentry.addBreadcrumb({
        message: `Error updating contract.`,
        data: {
          error: err,
        },
      });
      res.json(err);
    });
});

// DELETE contract
app.delete('/contracts/:id', (req, res) => {
  const data = req.params.id;
  db.deleteContract(data)
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      res.json(err);
    });
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

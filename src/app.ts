import express from 'express';
import { AbiItem } from 'web3-utils';
import { EventModel } from './schema';
import { IContractSchema, IEventSchema } from './schema';
import abi from './config/abi/standardInterface.json';
import { Listener } from './modules/listener';
import db from './modules/database';

const app = express();
const port = 3000;
const listener = new Listener(db);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

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

app.get('/addcontract/:contract', (req, res) => {
  const contract = req.params.contract;
  listener.add(
    'rinkeby',
    abi as AbiItem[],
    contract,
    ['Transfer', 'OwnershipTransferred'],
    10165138,
  );
});

// app.get('/contract/:contract', (req, res) => {
//   const contract = req.params.contract;
//   res.send(getContract(contract));
// });

// app.get('/contract/:contract/:tokenid', (req, res) => {
//   const contract = req.params.contract;
//   const tokenID = req.params.tokenid;
//   res.send(getNFT(contract, parseInt(tokenID)));
// });

// app.get('/insertcontract/:contract/:block', (req, res) => {
//   const contract = req.params.contract;
//   const latestBlock = req.params.block;
//   res.send(insertContract(contract, parseInt(latestBlock)));
// });

// app.get('/insertnFT/:contract/:owner/:tokenid', (req, res) => {
//   const contract = req.params.contract;
//   const owner = req.params.owner;
//   const tokenID = req.params.tokenid;
//   res.send(insertNFT(contract, parseInt(tokenID), owner));
// });

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

import express from 'express';
import { getNFT, getContract, insertContract, insertNFT } from './utils/helper';
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/contract/:contract', (req, res) => {
  const contract = req.params.contract;
  res.send(getContract(contract));
});

app.get('/contract/:contract/:tokenID', (req, res) => {
  const contract = req.params.contract;
  const tokenID = req.params.tokenID;
  res.send(getNFT(contract, parseInt(tokenID)));
});

app.get('/insertContract/:contract/:block', (req, res) => {
  const contract = req.params.contract;
  const latestBlock = req.params.block;
  res.send(insertContract(contract, parseInt(latestBlock)));
});

app.get('/insertNFT/:contract/:owner/:tokenID', (req, res) => {
  const contract = req.params.contract;
  const owner = req.params.owner;
  const tokenID = req.params.tokenID;
  res.send(insertNFT(contract, parseInt(tokenID), owner));
});

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

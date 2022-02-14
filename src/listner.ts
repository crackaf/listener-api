import Web3 from 'web3';
import {AbiItem} from 'web3-utils';
import medusaNftAbi from './config/constant/abis/medusaNFT.json';

const web3 = new Web3('https://rinkeby-light.eth.linkpool.io/');
const ABI = medusaNftAbi as AbiItem[];
const CONTRACT_ADDRESS = '0x9150D69d9cf80Ba60F6F1e368b3268A4e52c99c8';
const myContract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

let options = {
  fromBlock: 10165138, //Number || "earliest" || "pending" || "latest"
};

myContract
  .getPastEvents('Transfer', options)
  .then((results) => console.log(results))
  .catch((err) => console.error(err));

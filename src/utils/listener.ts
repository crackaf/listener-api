import Web3 from 'web3';
import {AbiItem} from 'web3-utils';
import {ContractOptions} from 'web3-eth-contract';

function useGetPastEvents(
  jsonInterface: AbiItem | AbiItem[],
  address: string,
  event: string,
  contractOptions?: ContractOptions,
  eventOptions?: {fromBlock: number; toBlock: number | 'latest'; step: number},
) {
  let {fromBlock = 0, toBlock = 'latest', step} = eventOptions;

  const web3 = new Web3('wss://rinkeby-light.eth.linkpool.io/ws');

  if (toBlock === 'latest') {
    web3.eth.getBlockNumber().then((value) => {
      toBlock = value;
    });
  }

  const myContract = new web3.eth.Contract(
    jsonInterface,
    address,
    contractOptions,
  );

  let currentBlock = fromBlock;

  async function getPastEvents() {
    for (; currentBlock <= toBlock; currentBlock += step) {
      myContract
        .getPastEvents(event, {
          fromBlock: currentBlock,
          toBlock: currentBlock + step,
        })
        .then((results) => console.log(results))
        .catch((err) => console.error(err));
    }
  }

  return {getPastEvents};
}

// // let options = {
// //   fromBlock: 0, //Number || "earliest" || "pending" || "latest"
// //   toBlock: 10165238,
// // };

// // myContract
// //   .getPastEvents('Transfer', options)
// //   .then((results) => console.log(results))
// //   .catch((err) => console.error(err));

// let options: EventOptions = {
//   fromBlock: 10165138,
// };

// myContract.once('Transfer', options, (err, data) => {
//   console.log('Error', err);
//   console.log(data);
// });
// // .Transfer(options)
// // .on('data', (event: EventData) => console.log(event.blockNumber))
// // .on('changed', (changed) => console.log(changed))
// // .on('error', (err) => {
// //   throw err;
// // })
// // .on('connected', (str) => console.log(str));

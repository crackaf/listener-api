import 'dotenv/config';

export default {
  ropsten: `wss://ropsten.infura.io/v3/${process.env.INFURA_KEY}`,

  kovan: `wss://kovan.infura.io/v3/${process.env.INFURA_KEY}`,

  rinkeby: `wss://rinkeby.infura.io/ws/v3/${process.env.INFURA_KEY}`,

  // main ethereum network(mainnet
  ethMainnet: `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_KEY}`,

  // bsc testnet
  bscTestnet:
    'wss://speedy-nodes-nyc.moralis.io/f8e37d911b5231fe3fdde3a6/bsc/testnet/ws',

  // bsc mainnet
  bscMainnet: 'https://bsc-dataseed.binance.org',

  // Polygon mumbai testnet
  polygonTestnet: 'https://rpc-mumbai.maticvigil.com',

  // Polygon mainnet
  polygonMainnet: 'https://polygon-rpc.com',

  // Fantom Blockchain testnet
  fantomTestnet: 'https://rpc.testnet.fantom.network',

  // Fantom Blockchain mainnet
  fantomMainnet: 'https://rpc.ftm.tools',

  // HT Heco testnet
  hecoTestnet: 'https://http-testnet.hecochain.com',

  // HT Heco mainnet
  hecoMainnet: 'https://http-mainnet-node.huobichain.com',

  // Arbitrum rinkeby
  arbitrumRinkeby: 'https://rinkeby.arbitrum.io/rpc',

  // Arbitrum mainnet
  arbitrumMainnet: 'https://arb1.arbitrum.io/rpc',
};

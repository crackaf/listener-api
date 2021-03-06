import fetch from 'node-fetch';
import { ITokenSchema } from '../../utils/types';
import { methodHandler } from './method';

let apiHitCounter = 0;

/**
 * @dev Get token image against its uri
 * @param {string} tokenURI
 * @return {string}
 */
async function fetchImageURL(tokenURI: string) {
  const url = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
  let newURL = '';
  await fetch(url)
    .then((result: { json: () => any }) => result.json())
    .then((json: any) => {
      newURL = json.image;
      //   console.log('First: ' + url);
      console.info('Api Hit End:', apiHitCounter, url);
      apiHitCounter--;
    })
    .catch((err: { type: string }) => {
      if (err.type === 'invalid-json') {
        // console.info(err.type);
        newURL = url;
      } else {
        console.error(err);
      }
      console.info('ApiHitEnd:', apiHitCounter, url);
      apiHitCounter--;
    });
  newURL = newURL.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return newURL;
}

/**
 * @dev insert token into database
 * @param {ITokenSchema} data
 * @return {void}
 */
export function uriHandler(data: ITokenSchema) {
  try {
    const uri = data.data.tokenURI as string;
    const { address, network, tokenId, blockNumber } = data;
    const { media, ...other } = data.data;
    setTimeout(() => {
      console.info('Hitting:', uri);
      fetchImageURL(uri).then((result) => {
        media.image = result;
        methodHandler({
          address,
          network,
          tokenId,
          blockNumber,
          data: { ...other, media },
        });
      });
    }, apiHitCounter * 2500); // 2.5s delay
    apiHitCounter++;
  } catch (err) {
    if (!!!err.code || (!!err.code && err.code !== 11000)) console.error(err);
  }
}

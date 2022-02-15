import { ContractModel } from '../schema';
import { NFTSModel } from '../schema';

/**
 *
 * @param {string} address
 * @return {IContract}
 */
export async function getContract(address: string) {
  const contractObj = await ContractModel.find({ contractAddr: address });
  return contractObj;
}

/**
 *
 * @param {string} address
 * @param {number}tokenID
 * @return {INFTS}
 */
export async function getNFT(address: string, tokenID: number) {
  const nft = await NFTSModel.find({
    contractAddr: address,
    nftID: tokenID,
  });
  return nft;
}

/**
 *
 * @param {string} address
 * @param {number} latestBlock
 * @return {Boolean}
 */
export async function insertContract(address: string, latestBlock: number) {
  const contractObj = await ContractModel.exists({ contractAddr: address });
  if (!contractObj) {
    await new ContractModel({
      contractAddr: address,
      latestBlock: latestBlock,
    }).save();
    return true;
  }
  return false;
}

/**
 *
 * @param {string} address
 * @param {number} tokenID
 * @param {string} owner
 * @return {boolean}
 */
export async function insertNFT(
  address: string,
  tokenID: number,
  owner: string,
) {
  const contractObj = await ContractModel.exists({ contractAddr: address });
  if (!contractObj) {
    await new NFTSModel({
      contractAddr: address,
      nftID: tokenID,
      owner: owner,
    }).save();
    return true;
  }
  return false;
}

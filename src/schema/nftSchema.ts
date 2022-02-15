import { model, Schema } from 'mongoose';

export interface INFTS {
  contractAddr: String;
  nftID: number;
  owner: string;
}

const nftSchema = new Schema<INFTS>({
  contractAddr: {
    type: String,
    required: true,
  },
  nftID: {
    type: Number,
    required: true,
  },
  owner: {
    type: String,
    required: true,
  },
});

export const NFTSModel = model('NFTS', nftSchema);

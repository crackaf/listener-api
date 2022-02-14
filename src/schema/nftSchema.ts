import {model, Schema} from 'mongoose';

export interface INFTS {
  contractAddr: Schema.Types.ObjectId;
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

export default model('NFTS', nftSchema);

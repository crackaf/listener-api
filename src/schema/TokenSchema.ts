import { model, Schema } from 'mongoose';
import { ITokenSchema } from '../utils/types';

const tokenSchema = new Schema<ITokenSchema>({
  address: {
    type: String,
    required: true,
  },
  network: {
    type: String,
    required: true,
  },
  tokenId: {
    type: String,
    required: true,
  },
  blockNumber: {
    type: Number,
    required: true,
  },
  data: {
    type: Object,
  },
}).index({ address: 1, network: 1, tokenId: 1 }, { unique: true });

export const TokenModel = model('Token', tokenSchema);

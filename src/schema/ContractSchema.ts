import { model, Schema } from 'mongoose';
import { IContractSchema } from '../utils/types';

const contractSchema = new Schema<IContractSchema>({
  address: {
    type: String,
    required: true,
  },
  latestBlock: {
    type: Number,
    required: true,
  },
  network: {
    type: String,
    required: true,
  },
  events: [
    {
      type: String,
    },
  ],
  jsonInterface: [
    {
      type: Object,
    },
  ],
}).index({ address: 1, network: 1 }, { unique: true });

export const ContractModel = model('Contract', contractSchema);

import { model, Schema } from 'mongoose';
import { AbiItem } from 'web3-utils';

export interface IContractSchema {
  address: string;
  latestBlock: number;
  network: string;
  events: string[];
  jsonInterface: AbiItem | AbiItem[];
}

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
});

export const ContractModel = model('Contract', contractSchema);

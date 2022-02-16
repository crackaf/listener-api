import { model, Schema } from 'mongoose';

export interface IContract {
  address: string;
  latestBlock: number;
  network: string;
  events: string[];
  jsonInterface: object[];
}

const contractSchema = new Schema<IContract>({
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

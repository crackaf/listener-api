import { Document, Types } from 'mongoose';
import { AbiItem } from 'web3-utils';
import { PastEventOptions, EventData } from 'web3-eth-contract';
import { StandardInterface, EventOptions } from '../config/abi/types';

// types
export interface ApiEventData extends EventData {
  rpc: string;
}

// schema types
export interface IContractSchema {
  address: string;
  network: string;
  latestBlock: number;
  events: string[];
  jsonInterface: AbiItem | AbiItem[];
}
export interface IEventSchema extends Partial<ApiEventData> {
  address: string;
  rpc: string;
  blockNumber: number;
  transactionHash: string;
  event: string;
  returnValues: {
    [key: string]: any;
  };
}

// classes interface
export interface IDatabase {
  getContracts: () =>
    | Promise<
        (Document<unknown, any, IContractSchema> &
          IContractSchema & {
            _id: Types.ObjectId;
          })[]
      >
    | Promise<IContractSchema[]>
    | IContractSchema[];
  isExistContract: (address: string, network: string) => Promise<boolean>;
  insertContract: (data: Partial<IContractSchema>) => void;
  updateContract(data: Partial<IContractSchema>): void;
  insertEvent: (data: IEventSchema) => void;
  insertEvents: (data: IEventSchema[]) => void;
  eventHandler: (data: IEventSchema | IEventSchema[]) => void;
}

export interface IListen {
  getJsonInterface: () => AbiItem | AbiItem[];
  loadPastEvents: (
    event: string,
    eventHandler: (data: ApiEventData[]) => void,
    eventOptions?: PastEventOptions,
  ) => void;
  listen: (
    event: keyof StandardInterface['events'],
    eventHandler: (data: ApiEventData) => void,
    eventOptions?: EventOptions,
  ) => void;
}

// returning types
export interface IReturn {
  success: boolean;
  msg: string;
}

// requests types
export type IParams = {
  address: string;
  network: string;
};

export type IQuery<T> = Partial<T> & {
  sort?: string;
  range?: string;
  select?: string;
};

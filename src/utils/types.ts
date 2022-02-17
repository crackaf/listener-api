import { Document, Types } from 'mongoose';
import { AbiItem } from 'web3-utils';
import { PastEventOptions, EventData } from 'web3-eth-contract';
import { StandardInterface, EventOptions } from '../config/abi/types';

// schema types
export interface IContractSchema {
  address: string;
  latestBlock: number;
  network: string;
  events: string[];
  jsonInterface: AbiItem | AbiItem[];
}
export interface IEventSchema {
  address: string;
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
  isExistContract: (address: string) => boolean;
  insertContract: (data: IContractSchema) => void;
  updateContract({
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: IContractSchema): void;
  insertEvent: (data: EventData) => void;
  insertEvents: (data: EventData[]) => void;
  eventHandler: (data: EventData | EventData[]) => void;
}

export interface IListen {
  getJsonInterface: () => AbiItem | AbiItem[];
  loadPastEvents: (
    event: string,
    eventHandler: (data: EventData | EventData[]) => void,
    eventOptions?: PastEventOptions,
  ) => void;
  listen: (
    event: keyof StandardInterface['events'],
    eventHandler: (data: EventData) => void,
    eventOptions?: EventOptions,
  ) => void;
}

// returning types
export interface IReturn {
  success: boolean;
  msg: string;
}

import { Document, Types } from 'mongoose';
import { AbiItem } from 'web3-utils';
import { PastEventOptions, EventData } from 'web3-eth-contract';
import { StandardInterface, EventOptions } from '../config/abi/types';

// types
export interface ApiEventData extends EventData {
  network: string;
}

export interface ApiFunctionData {
  [key: string]: any;
}

// schema types
export interface IContractSchema {
  address: string;
  network: string;
  latestBlock: number;
  events: string[];
  jsonInterface?: AbiItem | AbiItem[];
}

export interface IEventSchema extends Partial<ApiEventData> {
  address: string;
  network: string;
  blockNumber: number;
  transactionHash: string;
  event: string;
  returnValues: {
    [key: string]: any;
  };
}

export interface ITokenSchema {
  address: string;
  network: string;
  tokenId: string;
  blockNumber: number;
  data: {
    [key: string]: string;
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
  methodHandler: (data: ITokenSchema) => void;
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
  method: (
    methodName: string,
    methodHandler: (data: any) => void,
    methodArgs?: any[],
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

export type IMongoQ = {
  filter: {
    [key: string]: any;
  };
  limit: number;
  skip: number;
  sort: {
    [key: string]: number;
  };
  select: {
    [key: string]: number;
  };
};

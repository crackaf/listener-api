import 'dotenv/config';
import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { ContractModel, EventModel, TokenModel } from '../schema';
import {
  IContractSchema,
  IEventSchema,
  ITokenSchema,
  IReturn,
  IMongoQ,
} from '../utils/types';
import { IDatabase } from '../utils/types';

/**
 * Database management class
 */
export class Database implements IDatabase {
  private static _instance: Database;

  /**
   * Create database connection
   */
  private constructor() {
    const uri = process.env.MONGO_URI;
    mongoose
      .connect(uri)
      .then(() => console.info('Database connected!'))
      .catch((err) => console.error(err));
  }

  /**
   * Return or create database instance
   */
  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  /**
   * @return {IContractSchema[]}
   */
  getContracts() {
    return ContractModel.find({}).exec();
  }

  /**
   *
   * @param {string} address
   * @return {boolean}
   */
  async isExistContract(address: string): Promise<boolean> {
    const contractObj = await ContractModel.exists({
      address: { $regex: new RegExp(address, 'i') },
    });
    return !!contractObj;
  }

  /**
   *
   * @param {string} network
   * @param {object} jsonInterface
   * @param {string} address
   * @param {string[]} events
   * @param {number} latestBlock
   */
  async insertContract({
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: IContractSchema): Promise<IReturn> {
    const data = await new ContractModel({
      address,
      latestBlock,
      network,
      events,
      jsonInterface,
    }).save();
    return {
      success: !!data,
      msg: data as any,
    };
  }

  /**
   * @dev insert event into database
   * @param {IEventSchema} eventObject
   */
  async insertEvent({
    address,
    event,
    network,
    transactionHash,
    blockNumber,
    returnValues,
  }: IEventSchema) {
    new EventModel({
      address,
      network,
      event,
      transactionHash,
      blockNumber,
      returnValues,
    })
      .save()
      .then((result: IEventSchema) => {
        if (result) {
          console.info(`Added event ${address}`);
          Sentry.addBreadcrumb({
            message: `Event added.`,
            data: { address: address, event: event },
          });
        } else {
          console.info(`Could not add event ${address}`);
          Sentry.addBreadcrumb({
            message: `Event not added.`,
            data: { address: address, event: event },
          });
        }
      })
      .catch((err: Error) => {
        console.info(
          `Encountered error while inserting event ${address}. ${err.message}`,
        );
        Sentry.addBreadcrumb({
          message: `Error inserting event.`,
          data: { error: err, address: address, event: event },
        });
      });
  }

  /**
   * @dev delete the contract
   * @param {string} id object id
   * @return {Promise}
   */
  async deleteContract(id: string) {
    return await ContractModel.findByIdAndDelete(id);
  }

  /**
   * @dev insert multiple events into database
   * @param {IEventSchema[]} events
   */
  async insertEvents(events: IEventSchema[]) {
    if (events.length <= 0) return;
    const data: IEventSchema[] = events.map(
      ({
        address,
        network,
        event,
        transactionHash,
        blockNumber,
        returnValues,
      }) => {
        return {
          address,
          network,
          event,
          transactionHash,
          blockNumber,
          returnValues,
        };
      },
    );
    EventModel.insertMany(data)
      .then((result) => {
        if (result) {
          console.info(`Added events ${data.length}`);
          Sentry.addBreadcrumb({
            message: `Events added.`,
          });
        } else {
          console.info(`Could not add event ${data.length}`);
          Sentry.addBreadcrumb({
            message: `Events not added.`,
          });
        }
      })
      .catch((err) => {
        console.info(`Encountered error while inserting events ${data.length}.
        ${err.message}`);
        Sentry.addBreadcrumb({
          message: `Error inserting events.`,
          data: {
            error: err,
          },
        });
      });
  }

  /**
   * @dev insert token into the database
   * @param {ITokenSchema} token
   */
  async insertToken({
    address,
    network,
    tokenId,
    blockNumber,
    data,
  }: ITokenSchema) {
    const res = await new TokenModel({
      address,
      network,
      tokenId,
      blockNumber,
      data,
    }).save();
    return {
      success: !!res,
      msg: res as any,
    };
  }

  /**
   * @dev update token according to given address and network
   * Note: address and network cannot be updated
   * @param {string} address
   * @param {string} network
   * @param {string} tokenId
   * @param { object } data
   */
  async updateToken({
    address,
    network,
    tokenId,
    blockNumber,
    data,
  }: {
    address: string;
    network: string;
    tokenId: string;
    blockNumber: number;
    data: object;
  }) {
    const filter = {
      address: { $regex: new RegExp(address, 'i') },
      network: { $regex: new RegExp(network, 'i') },
      tokenId: { $regex: new RegExp(tokenId, 'i') },
      blockNumber: { $lt: blockNumber },
    };
    return await TokenModel.findOneAndUpdate(filter, { blockNumber, data });
  }

  /**
   * @dev update contract according to given id or (address+ network)
   * Note: address and network can only be changed if object id is provided.
   * Object id can be obtained from the database
   * @param {string} contractAddr
   * @param {IContractSchema} contractObj
   * @return {boolean}
   */
  async updateContract({
    id,
    address,
    latestBlock,
    network,
    events,
    jsonInterface,
  }: Partial<IContractSchema & { id?: string }>) {
    if (!!id) {
      return await ContractModel.findByIdAndUpdate(id, {
        address,
        network,
        latestBlock,
        events,
        jsonInterface,
      });
    }
    const filter = {
      address: { $regex: new RegExp(address, 'i') },
      network: { $regex: new RegExp(network, 'i') },
    };
    const update = {
      latestBlock: latestBlock,
      events: events,
      jsonInterface: jsonInterface,
    };
    return await ContractModel.findOneAndUpdate(filter, update, {
      new: true,
    });
  }

  /**
   * @dev insert new event(s) and update latest block in database if needed
   * @param {IEventSchema | IEventSchema[]} data
   */
  eventHandler(data: IEventSchema | IEventSchema[]) {
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const maxBlockNumber = Math.max(...data.map((d) => d.blockNumber));
        const latestBlockData = data.find(
          (dataItem: IEventSchema) => dataItem.blockNumber == maxBlockNumber,
        );
        this.insertEvents(data)
          .catch((err: Error) => {
            console.info(err.message);
          })
          .finally(() => {
            this.updateContract({
              address: latestBlockData.address,
              latestBlock: latestBlockData.blockNumber,
            }).catch((err: Error) => {
              console.info(err.message);
            });
          });
      }
    } else {
      this.insertEvent(data)
        .catch((err: Error) => {
          console.info(err.message);
        })
        .finally(() => {
          this.updateContract({
            address: data.address,
            latestBlock: data.blockNumber,
          }).catch((err: Error) => {
            console.info(err.message);
          });
        });
    }
  }

  /**
   * @dev insert token into database
   * @param {ITokenSchema} data
   */
  methodHandler(data: ITokenSchema) {
    this.insertToken(data)
      .then((result) => {
        if (result.success === false) {
          this.updateToken(data).catch((err: Error) => {
            console.info(err.message);
          });
        }
      })
      .catch((err: Error | any) => {
        if (!!err.code && err.code !== 11000) console.info(err.message);
      })
      .finally(() => {
        this.updateToken(data).catch((err: Error) => {
          console.info(err.message);
        });
      });
  }

  /**
   *
   * @param {IMongoQ} data
   */
  async fetchContract(data: IMongoQ) {
    return await ContractModel.find(data.filter)
      .select(data.select)
      .sort(data.sort)
      .skip(data.skip)
      .limit(data.limit)
      .exec();
  }

  /**
   *
   * @param {IMongoQ} data
   */
  async fetchEvent(data: IMongoQ) {
    return await EventModel.find(data.filter)
      .select(data.select)
      .sort(data.sort)
      .skip(data.skip)
      .limit(data.limit)
      .exec();
  }

  /**
   *
   * @param {IMongoQ} data
   */
  async fetchToken(data: IMongoQ) {
    return await TokenModel.find(data.filter)
      .select(data.select)
      .sort(data.sort)
      .skip(data.skip)
      .limit(data.limit)
      .exec();
  }
}

// console.log(process.env.MONGO_URI);
export default Database.Instance;

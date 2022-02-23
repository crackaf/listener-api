import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { ContractModel, EventModel, TokenModel } from '../schema';
import {
  IContractSchema,
  IEventSchema,
  ITokenSchema,
  IReturn,
  ApiFunctionData,
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
    const uri =
      'mongodb+srv://bubbles:KseTfjRc4rOlgQXK@bubbles-project.vus3i.mongodb.net/listenerDatabase?retryWrites=true&w=majority';
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

    // .then((result) => {
    //   if (result) {
    //     console.info(`Added contract ${address}`);
    //     Sentry.addBreadcrumb({
    //       message: `Contract added.`,
    //       data: { address: address, network: network },
    //     });
    //   } else {
    //     console.info(`Could not add contract ${address}`);
    //     Sentry.addBreadcrumb({
    //       message: `Contract not added.`,
    //       data: { address: address, network: network },
    //     });
    //   }
    // })
    // .catch((err: Error) => {
    //   console.info(
    //     `Encountered error while inserting contract ${address}.
    //      Error: ${err.message}`,
    //   );
    //   Sentry.addBreadcrumb({
    //     message: `Error inserting contract.`,
    //     data: { error: err, address: address, network: network },
    //   });
    // });
  }

  /**
   *
   * @param {IEventSchema} eventObject
   */
  async insertEvent({
    address,
    event,
    rpc,
    transactionHash,
    blockNumber,
    returnValues,
  }: IEventSchema) {
    new EventModel({
      address,
      rpc,
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
   * delete the contract
   * @param {string} id object id
   * @return {Promise}
   */
  async deleteContract(id: string) {
    return await ContractModel.findByIdAndDelete(id);
  }

  /**
   *
   * @param {IEventSchema[]} events
   * @return {void}
   */
  async insertEvents(events: IEventSchema[]) {
    if (events.length <= 0) return;
    const data: IEventSchema[] = events.map(
      ({ address, rpc, event, transactionHash, blockNumber, returnValues }) => {
        return {
          address,
          rpc,
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
   *
   * @param {ITokenSchema} token
   */
  async insertToken(token: ITokenSchema) {
    const res = await new TokenModel(token).save();
    return {
      success: !!res,
      msg: res as any,
    };
  }

  /**
   * @param {string} address
   * @param {string} network
   * @param {string} tokenId
   * @param { object } data
   */
  async updateToken({
    address,
    network,
    tokenId,
    ...data
  }: {
    address: string;
    network: string;
    tokenId: string;
    data: object;
  }) {
    const filter = {
      address: { $regex: new RegExp(address, 'i') },
      network: { $regex: new RegExp(network, 'i') },
      tokenId: tokenId,
    };
    return await TokenModel.findOneAndUpdate(filter, { data });
  }

  /**
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
   *
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
   *
   * @param {ITokenSchema} data
   */
  methodHandler(data: ITokenSchema) {
    this.insertToken(data)
      .then((result) => {
        if (result) {
          this.updateToken(data).catch((err: Error) => {
            console.info(err.message);
          });
        }
      })
      .catch((err: Error) => {
        console.info(err.message);
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

export default Database.Instance;

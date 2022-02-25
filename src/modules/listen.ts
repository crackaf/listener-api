import Web3 from 'web3';
import * as Sentry from '@sentry/node';
import { AbiItem } from 'web3-utils';
import { PastEventOptions, EventData } from 'web3-eth-contract';
import standardAbi from '../config/abi/standardInterface.json';
import { StandardInterface, EventOptions } from '../config/abi/types';
import { ApiEventData, IListen } from '../utils/types';

/**
 * Listen to the past and current events of Contract
 */
export class Listen implements IListen {
  public readonly address: string;
  public readonly rpc: string;
  public readonly network: string;
  public readonly jsonInterface: AbiItem | AbiItem[];

  private readonly _web3: Web3;
  private readonly _contract: StandardInterface;

  /**
   * Listener Constructor
   * @param { string } rpc RPC URL
   * @param { string } address Address of the contract
   * @param { string } network Address of the contract
   * @param { AbiItem | AbiItem[] } jsonInterface Abi interface for the contract
   */
  constructor(
    rpc: string,
    address: string,
    network?: string,
    jsonInterface?: AbiItem | AbiItem[],
  ) {
    Sentry.addBreadcrumb({
      message: 'Listen Constructor Called',
      data: {
        rpc: rpc,
        address: address,
      },
    });

    if (!Web3.utils.isAddress(address)) {
      console.warn('Address not valid!');
      Sentry.addBreadcrumb({
        message: 'Address not valid!',
        data: {
          rpc: rpc,
          address: address,
        },
      });
    }

    this.rpc = rpc;
    this.address = address;
    this.network = network ?? 'rinkbey';
    this.jsonInterface = jsonInterface ?? (standardAbi as AbiItem[]);

    // making contract instance
    try {
      const options = {
        timeout: 30000, // ms

        clientConfig: {
          // Useful if requests are large
          maxReceivedFrameSize: 100000000, // bytes - default: 1MiB
          maxReceivedMessageSize: 100000000, // bytes - default: 8MiB

          // Useful to keep a connection alive
          keepalive: true,
          keepaliveInterval: 60000, // ms
        },

        // Enable auto reconnection
        // reconnect: {
        //   auto: true,
        //   delay: 5000, // ms
        //   maxAttempts: 5,
        //   onTimeout: false,
        // },
      };
      this._web3 = new Web3(
        new Web3.providers.WebsocketProvider(this.rpc, options),
      );
      this._contract = new this._web3.eth.Contract(
        this.jsonInterface,
        this.address,
      ) as any as StandardInterface;
    } catch (error) {
      throw error;
    }
  }

  /**
   * JsonInterface/Abi of the contract
   * @return {AbiItem|AbiItem[]}
   */
  getJsonInterface(): AbiItem | AbiItem[] {
    return this.jsonInterface;
  }

  /**
   * Recursive function in case of large data
   * @param {string} _event Event name
   * @param {EventOptions} _eventOptions event options
   * @return {ApiEventData[]}
   */
  private async _loadPastEvents(
    _event: string,
    _eventOptions: PastEventOptions & {
      fromBlock: number;
      toBlock: number;
    },
  ): Promise<ApiEventData[]> {
    const returnData = [];
    const event = _event;
    const realStart = _eventOptions.fromBlock;
    const realEnd = _eventOptions.toBlock;

    const recur = async (start: number, end: number) => {
      try {
        const data = await this._contract.getPastEvents(event, {
          fromBlock: start,
          toBlock: end,
        });
        if (data) {
          returnData.push(...data);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase() ===
            'returned error: query returned more than 10000 results'
        ) {
          const middle = Math.round((start + end) / 2);
          console.info(
            'Infura 10000 limit [' +
              start +
              '..' +
              end +
              '] ->  [' +
              start +
              '..' +
              middle +
              '] ' +
              'and [' +
              (middle + 1) +
              '..' +
              end +
              ']',
          );
          recur(start, middle);
          recur(middle + 1, end);
        } else throw err;
      }
    };

    await recur(realStart, realEnd);

    return returnData;
  }

  /**
   * Load the past events
   * @param {string} event Event name
   * @param {()} eventHandler Function to handle the emitted data
   * @param {EventOptions} eventOptions event options
   */
  async loadPastEvents(
    event: string,
    eventHandler: (data: ApiEventData[]) => void,
    eventOptions?: PastEventOptions,
  ) {
    Sentry.addBreadcrumb({
      message: 'Loading Past Events',
      data: {
        address: this.address,
        rpc: this.rpc,
        event: event,
        eventOptions: eventOptions,
      },
    });
    if (event in this._contract.events) {
      try {
        const data = await this._contract.getPastEvents(event, eventOptions);
        eventHandler(
          data.map((e) => {
            return { ...e, network: this.network };
          }),
        );
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.toLowerCase() ===
            'returned error: query returned more than 10000 results'
        ) {
          let start = 0;
          let end = await this._web3.eth.getBlockNumber();
          if (eventOptions) {
            if (eventOptions.fromBlock) start = eventOptions.fromBlock as any;
            if (eventOptions.toBlock) end = eventOptions.toBlock as any;
          }
          const data = await this._loadPastEvents(event, {
            fromBlock: start,
            toBlock: end,
          });
          eventHandler(
            data.map((e) => {
              return { ...e, network: this.network };
            }),
          );
        } else throw err;
      }
    } else console.warn(`Event ${event} is not in contract events`);
  }

  /**
   * listen to the specific event
   * @param {string} event Event name
   * @param {()} eventHandler Function to handle the emitted data
   * @param {EventOptions} eventOptions event options
   */
  listen(
    event: keyof StandardInterface['events'],
    eventHandler: (data: ApiEventData) => void,
    eventOptions?: EventOptions,
  ) {
    if (event in this._contract.events) {
      Sentry.addBreadcrumb({
        message: 'Loading Past Events',
        data: {
          address: this.address,
          rpc: this.rpc,
          event: event,
          eventOptions: eventOptions,
        },
      });
      this._contract.events[event](eventOptions)
        .on('data', (data: EventData) => {
          eventHandler({ ...data, network: this.network });
        })
        .on('changed', (changed) => {
          console.info(changed);
        })
        .on('error', (err) => {
          // console.error(err);
          throw err;
        })
        .on('connected', (str) => {
          return console.info(str);
        });
    } else console.warn(`Event ${event} is not in contract events`);
  }

  // eslint-disable-next-line require-jsdoc
  async method(
    methodName: string,
    methodHandler: (data: any) => void,
    methodArgs: any[] = [],
  ) {
    try {
      const result = await this._contract.methods[methodName](
        ...methodArgs,
      ).call();
      // console.info(methodName, result);
      methodHandler({ [methodName]: result });
    } catch (err) {
      console.error(`${methodName} can't be called for ${this.address}`);
      throw err;
    }
  }
}

import Web3 from 'web3';
import * as Sentry from '@sentry/node';
import { AbiItem } from 'web3-utils';
import { PastEventOptions, EventData } from 'web3-eth-contract';
import { StandardInterface, EventOptions } from '../config/abi/types';
import { ApiEventData, IListen } from '../utils/types';

/**
 * Listen to the past and current events of Contract
 */
export class Listen implements IListen {
  public readonly address: string;
  public readonly rpc: string;
  public readonly jsonInterface: AbiItem | AbiItem[];

  private readonly _web3: Web3;
  private readonly _contract: StandardInterface;

  /**
   * Listener Constructor
   * @param { string } rpc RPC URL
   * @param { AbiItem | AbiItem[] } jsonInterface Abi interface for the contract
   * @param { string } address Address of the contract
   */
  constructor(
    rpc: string,
    jsonInterface: AbiItem | AbiItem[],
    address: string,
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
    this.jsonInterface = jsonInterface;
    this.address = address;

    // making contract instance
    try {
      this._web3 = new Web3(this.rpc);
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
   * Load the past events
   * @param {string} event Event name
   * @param {()} eventHandler Function to handle the emitted data
   * @param {EventOptions} eventOptions event options
   */
  loadPastEvents(
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
    this._contract
      .getPastEvents(event, eventOptions)
      .then((data) =>
        eventHandler(
          data.map((e) => {
            return { ...e, rpc: this.rpc };
          }),
        ),
      )
      .catch((err) => {
        console.error(err);
        throw err;
      });
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
        .on('data', (data: EventData) =>
          eventHandler({ ...data, rpc: this.rpc }),
        )
        .on('changed', (changed) => console.info(changed))
        .on('error', (err) => {
          console.error(err);
          throw err;
        })
        .on('connected', (str) => console.info(str));
    } else console.warn(`Event ${event} is not in contract events`);
  }

  // eslint-disable-next-line require-jsdoc
  async method(tokenId: string | number) {
    return await this._contract.methods.tokenURI(tokenId).call();
  }
}

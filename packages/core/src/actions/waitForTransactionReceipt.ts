import type {
  CallParameters,
  Chain,
  WaitForTransactionReceiptParameters as viem_WaitForTransactionReceiptParameters,
  WaitForTransactionReceiptReturnType as viem_WaitForTransactionReceiptReturnType,
} from 'viem'
import { hexToString } from 'viem'
import {
  call,
  getTransaction,
  waitForTransactionReceipt as viem_waitForTransactionReceipt,
} from 'viem/actions'

import type { Config } from '../config.js'
import type { ChainId } from '../types/properties.js'
import type { Evaluate } from '../types/utils.js'

export type WaitForTransactionReceiptParameters<
  config extends Config = Config,
  chainId extends
    | config['chains'][number]['id']
    | undefined = config['chains'][number]['id'],
> = Evaluate<
  viem_WaitForTransactionReceiptParameters & ChainId<config, chainId>
>

export type WaitForTransactionReceiptReturnType<
  config extends Config = Config,
  chainId extends
    | config['chains'][number]['id']
    | undefined = config['chains'][number]['id'],
  ///
  chains extends readonly Chain[] = chainId extends config['chains'][number]['id']
    ? [Extract<config['chains'][number], { id: chainId }>]
    : config['chains'],
> = Evaluate<
  {
    [key in keyof chains]: viem_WaitForTransactionReceiptReturnType<chains[key]>
  }[number]
>

export type WaitForTransactionReceiptError = Error

export async function waitForTransactionReceipt<
  config extends Config,
  chainId extends config['chains'][number]['id'] | undefined,
>(
  config: config,
  parameters: WaitForTransactionReceiptParameters<config, chainId>,
): Promise<WaitForTransactionReceiptReturnType<config, chainId>> {
  const { chainId, timeout = 0, ...rest } = parameters
  const client = config.getClient({ chainId })

  const receipt = await viem_waitForTransactionReceipt(client, {
    ...rest,
    timeout,
  })
  if (receipt.status === 'reverted') {
    const txn = await getTransaction(client, { hash: receipt.transactionHash })
    const code = (await call(client, {
      ...txn,
      gasPrice: txn.type !== 'eip1559' ? txn.gasPrice : undefined,
      maxFeePerGas: txn.type === 'eip1559' ? txn.maxFeePerGas : undefined,
      maxPriorityFeePerGas:
        txn.type === 'eip1559' ? txn.maxPriorityFeePerGas : undefined,
    } as CallParameters)) as unknown as string
    const reason = hexToString(`0x${code.substring(138)}`)
    throw new Error(reason)
  }
  return receipt as WaitForTransactionReceiptReturnType<config, chainId>
}
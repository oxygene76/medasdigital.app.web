import { SifchainLiquidityAPYResult } from '@keplr-wallet/stores/build/query/cosmos/supply/sifchain';
import { Fee, Sender } from '@tharsis/transactions';

export type Account = {
	address: string;
	name: string;
	publicKey: string;
};

export type TxResponse = {
	code: number;
	codespace?: SifchainLiquidityAPYResult;
	data?: string;
	events?: any[];
	gas_used: string;
	gas_wanted: string;
	height: string;
	info?: string;
	logs?: any[];
	raw_log: string;
	timestamp?: string;
	tx?: any;
	txhash: string;
};

export type TransactionResponse = {
	tx_response: TxResponse | null;
	sender?: Sender;
};

export type Tx<T> = {
	fee: Fee;
	msg?: T;
	msgs?: T[];
	memo: string;
};

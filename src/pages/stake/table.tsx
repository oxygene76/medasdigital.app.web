import React, { FunctionComponent, useMemo } from 'react';
import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import classNames from 'classnames';
import DataTable from 'src/components/insync/data-table';
import CircularProgress from 'src/components/insync/circular-progress';
import { useStore } from 'src/stores';
import { formatCount } from 'src/utils/number-formats';
import { config } from 'src/config-insync';
import { useAppSelector } from 'src/hooks/use-app-select';
import { useAddress } from 'src/hooks/use-address';
import { RootState } from 'src/reducers/store';
import UnDelegateButton from '../home/token-details/un-delegate-button';
import ReDelegateButton from '../home/token-details/re-delegate-button';
import DelegateButton from './delegate-button';
import ValidatorName from './validator-name';
import { DelegationResult } from 'src/stores/rebus/query/delegations/types';
import { CellRendererProps, ColumnDef } from 'src/components/insync/data-table/types';
import { CoinPretty, Dec } from '@keplr-wallet/unit';
import { Currency } from '@keplr-wallet/types';

interface ParsedValidator {
	commissionRate: number | null;
	identity: number;
	isDelegated: boolean;
	jailed: boolean;
	moniker: string;
	operatorAddress: string;
	tokensStaked: string;
	status: number;
	votingPercentage: number;
	votingPower: number;
}

const ValidatorCell: FunctionComponent<CellRendererProps<any, ParsedValidator>> = ({ data, rowIndex }) => (
	<ValidatorName index={rowIndex} moniker={data.moniker} identity={data.identity} />
);

const StatusCell: FunctionComponent<CellRendererProps<ParsedValidator['status'], ParsedValidator>> = ({ data }) => (
	<StatusCellWrapper
		className={classNames('status', data.jailed ? 'red_status' : '', data.status !== 3 ? 'unbonded' : '')}
		title={data.status === 1 ? 'Unbonded' : data.status === 2 ? 'Unbonding' : data.status === 3 ? 'Active' : ''}>
		{data.status === 1 ? 'Unbonded' : data.status === 2 ? 'Unbonding' : data.status === 3 ? 'Active' : ''}
	</StatusCellWrapper>
);

const VotingPowerCell: FunctionComponent<CellRendererProps<ParsedValidator['votingPower'], ParsedValidator>> = ({
	value,
}) => (
	<VotingCellWrapper>
		<p>{formatCount(value, true)}</p>
	</VotingCellWrapper>
);

const VotingPercentageCell: FunctionComponent<CellRendererProps<
	ParsedValidator['votingPercentage'],
	ParsedValidator
>> = ({ value }) => (
	<VotingCellWrapper>
		<p>{value}%</p>
	</VotingCellWrapper>
);

const CommissionCell: FunctionComponent<CellRendererProps<ParsedValidator['commissionRate'], ParsedValidator>> = ({
	value,
}) => <>{value ? `${value}%` : '0%'}</>;

const TokensStakedCell: FunctionComponent<CellRendererProps<any, ParsedValidator>> = ({ value }) => {
	return <TokensCellWrapper className={value ? 'tokens' : 'no_tokens'}>{value || 'no tokens'}</TokensCellWrapper>;
};

const ActionCell: FunctionComponent<CellRendererProps<boolean, ParsedValidator>> = ({ data, value }) =>
	value ? (
		<ActionCellWrapper>
			<ReDelegateButton valAddress={data.operatorAddress} />
			<Divider />
			<UnDelegateButton valAddress={data.operatorAddress} />
			<Divider />
			<DelegateButton valAddress={data.operatorAddress} />
		</ActionCellWrapper>
	) : (
		<ActionCellWrapper>
			<DelegateButton valAddress={data.operatorAddress} />
		</ActionCellWrapper>
	);

const columnDefs: ColumnDef<ParsedValidator>[] = [
	{
		property: 'moniker',
		header: 'Validator',
		CellRenderer: ValidatorCell,
		width: 4,
		headerAlign: 'center',
		canSort: true,
		hideHeaderMobile: true,
	},
	{
		property: 'status',
		header: 'Status',
		CellRenderer: StatusCell,
		width: 2,
		align: 'center',
		headerAlign: 'center',
	},
	{
		property: 'votingPower',
		header: 'Voting Power',
		CellRenderer: VotingPowerCell,
		width: 3,
		align: 'center',
		headerAlign: 'center',
		canSort: true,
	},
	{
		property: 'votingPercentage',
		header: 'Voting Percentage',
		CellRenderer: VotingPercentageCell,
		width: 2,
		align: 'center',
		headerAlign: 'center',
		canSort: true,
	},
	{
		property: 'commissionRate',
		header: 'Commission',
		CellRenderer: CommissionCell,
		width: 2,
		align: 'center',
		headerAlign: 'center',
		canSort: true,
	},
	{
		property: 'tokensStaked',
		header: 'Tokens Staked',
		CellRenderer: TokensStakedCell,
		width: 2,
		align: 'center',
		headerAlign: 'center',
		canSort: true,
	},
	{
		property: 'isDelegated',
		header: 'Action',
		CellRenderer: ActionCell,
		width: 9,
		align: 'flex-end',
		headerAlign: 'center',
		hideHeaderMobile: true,
	},
];

type TableProps = {
	active: number;
	className?: string;
	tableRowClassName?: string;
};

const selector = (state: RootState) => {
	return {
		lang: state.language,
		validatorList: state.stake.validators.list,
		inProgress: state.stake.validators.inProgress,
		delegatedValidatorList: state.stake.delegatedValidators.list,
	};
};

const EMPTY_DELEGATIONS: DelegationResult[] = [];
const EMPTY_TABLE_DATA: any[][] = [];

const Table = observer<TableProps>(({ active, className, tableRowClassName }) => {
	const { delegatedValidatorList, inProgress, validatorList } = useAppSelector(selector);

	const { chainStore, queriesStore } = useStore();
	const address = useAddress();

	const bondedTokensQuery = queriesStore.get(chainStore.current.chainId).cosmos.queryPool;
	const bondedTokens = bondedTokensQuery.response?.data.result.bonded_tokens;

	const delegationsQuery = queriesStore.get(chainStore.current.chainId).rebus.queryDelegations.get(address);
	const delegations = delegationsQuery.response?.data?.result || EMPTY_DELEGATIONS;

	const delegationsByValidatorAddress = useMemo(() => {
		return delegations.reduce((acc: any, item: any) => {
			acc[item.delegation.validator_address] = item;
			return acc;
		}, {});
	}, [delegations]);

	const tableData = useMemo(() => {
		const bondedTokensNumber = Number(bondedTokens) || 0;
		let dataToMap = active === 2 ? delegatedValidatorList : validatorList;

		if (active === 3 && dataToMap) {
			// Inactive validators
			dataToMap = dataToMap.filter((item: any) => item.status !== 3);
		} else if (active === 1 && dataToMap) {
			// Active validators
			dataToMap = dataToMap.filter((item: any) => item.status === 3);
		}

		return dataToMap && dataToMap.length
			? dataToMap.map(item => {
					const votingPercentage =
						bondedTokensNumber === 0 ? 0 : ((Number(item.tokens) || 0) / bondedTokensNumber) * 100;

					const delegation = delegationsByValidatorAddress[item.operator_address];
					const tokensStaked = delegation?.balance?.amount
						? new CoinPretty(chainStore.current.stakeCurrency, new Dec(delegation.balance.amount))
								.hideDenom(true)
								.trim(true)
								.maxDecimals(4)
								.toString()
						: '';

					const parsedItem: ParsedValidator = {
						commissionRate: item.commission.commission_rates.rate
							? parseFloat((Number(item.commission.commission_rates.rate) * 100).toFixed(2))
							: null,
						jailed: item.jailed,
						identity: item.description.identity,
						isDelegated: !!delegation,
						moniker: item.description.moniker,
						operatorAddress: item.operator_address,
						status: item.status,
						tokensStaked,
						votingPercentage: parseFloat(votingPercentage.toFixed(2)),
						votingPower: parseFloat((Number(item.tokens) / 10 ** config.COIN_DECIMALS).toFixed(1)),
					};

					return parsedItem;
			  })
			: EMPTY_TABLE_DATA;
	}, [bondedTokens, active, delegatedValidatorList, validatorList, delegationsByValidatorAddress, chainStore]);

	const noDataFound = <div className="no_data_table"> No data found </div>;
	const loader = <CircularProgress />;

	return (
		<DataTable
			className={className}
			columnDefs={columnDefs}
			data={tableData}
			loading={inProgress}
			loader={loader}
			minWidth="1270px"
			noData={noDataFound}
			tableRowClassName={tableRowClassName}
		/>
	);
});

const Divider = styled.span`
	border: 1px solid #d2d2d2;
	margin: 0 10px;
	height: 20px;

	@media (max-width: 426px) {
		display: none;
	}
`;

const TokensCellWrapper = styled.div`
	font-family: Inter, ui-sans-serif, system-ui;
	font-weight: 600;
	font-size: 18px;
	line-height: 130%;

	&.no_tokens {
		color: rgba(255, 255, 255, 0.6);
	}

	&.tokens {
		text-align: center;
		color: #5084e9;
	}

	@media (max-width: 958px) {
		text-align: right !important;
	}
`;

const StatusCellWrapper = styled.div`
	background: linear-gradient(104.04deg, #50e996 0%, #b8e950 100%);
	box-sizing: border-box;
	border-radius: 4px;
	font-family: Inter, ui-sans-serif, system-ui;
	font-size: 14px;
	color: green;
	padding: 6px 10px;
	text-align: center;

	&.red_status {
		background: linear-gradient(104.04deg, #e95062 0%, #e950d0 100%);
		color: white;
	}

	&.unbonded {
		background: linear-gradient(104.04deg, #dddbe9 0%, #c2c0d1 100%);
		color: black;
	}

	@media (max-width: 1025px) {
		width: max-content;
		margin: auto;
	}

	@media (max-width: 958px) {
		margin-right: unset;
	}
`;

const VotingCellWrapper = styled.div`
	align-items: center;
	display: flex;
	justify-content: center;

	@media (max-width: 958px) {
		justify-content: flex-end;
	}
`;

const ActionCellWrapper = styled.div`
	align-items: center;
	display: flex;
	justify-content: flex-end;

	button {
		flex-shrink: 0;
	}

	@media (max-width: 426px) {
		justify-content: space-around;
		flex-wrap: wrap;

		& > button {
			padding: 5px 10px;
		}
	}

	@media (max-width: 375px) {
		flex-direction: column;

		& > button {
			width: 100%;
			margin: 4px 0;
		}
	}
`;

export default Table;

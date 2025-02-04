import { Button } from '@material-ui/core';
import React, { FunctionComponent } from 'react';
import { ArrowDownwardRounded, ArrowUpwardRounded } from '@material-ui/icons';
import { ColumnDef, SortState } from './types';

type Props = {
	align?: ColumnDef['align'];
	canSort?: boolean;
	header: string;
	headerStyle?: React.CSSProperties;
	index: number;
	property: string;
	setSortState: React.Dispatch<React.SetStateAction<SortState | undefined>>;
	sortState?: SortState;
	width: ColumnDef['width'];
};

const TableHeaderCell: FunctionComponent<Props> = ({
	align,
	canSort,
	index,
	header,
	headerStyle,
	property,
	setSortState,
	sortState,
	width,
}) => {
	const style: React.CSSProperties = {
		color: 'rgba(255,255,255,.6)',
		fontFamily: 'Inter,ui-sans-serif,system-ui',
		fontSize: '14px',
		height: '100%',
		justifyContent: align,
		gridColumn: `span ${width}`,
		padding: '0',
		paddingLeft: '4px',
		paddingRight: '4px',
		lineHeight: '18px',
		textTransform: 'initial',
		...(headerStyle || {}),
	};

	if (!canSort) {
		return (
			<div className={`flex items-center table-header-cell-${index}`} style={style}>
				{header}
			</div>
		);
	}

	const isSorted = property === sortState?.property;
	const isAscending = sortState?.direction === 'asc';

	const onClick = () => {
		if (isSorted) {
			if (!isAscending) {
				setSortState(undefined);
			} else {
				setSortState({
					property,
					direction: isAscending ? 'desc' : 'asc',
				});
			}
		} else {
			setSortState({
				property,
				direction: 'asc',
			});
		}
	};

	return (
		<Button className={`flex table-header-cell-${index}`} onClick={onClick} style={style}>
			{header}
			<div className={isSorted ? 'block' : 'hidden'}>
				{isAscending ? (
					<ArrowUpwardRounded style={{ width: '18px' }} />
				) : (
					<ArrowDownwardRounded style={{ width: '18px' }} />
				)}
			</div>
		</Button>
	);
};

export { TableHeaderCell };

import React from 'react';
import { Button } from '@material-ui/core';
import * as PropTypes from 'prop-types';
import { connect } from 'react-redux';
import variables from 'src/utils/variables';
import { showDelegateDialog } from 'src/actions/stake';
import { showMessage } from 'src/actions/snackbar';

const StakeTokensButton = props => {
	const handleClick = () => {
		if (!props.address) {
			props.showMessage(variables[props.lang]['connect_account']);
			return;
		}

		props.handleOpen('Stake');
	};

	return (
		<Button className="btn gradient-blue" variant="outlined" onClick={handleClick}>
			{variables[props.lang]['stake_tokens']}
		</Button>
	);
};

StakeTokensButton.propTypes = {
	handleOpen: PropTypes.func.isRequired,
	lang: PropTypes.string.isRequired,
	showMessage: PropTypes.func.isRequired,
	address: PropTypes.string,
};

const stateToProps = state => {
	return {
		address: state.accounts.address.value,
		lang: state.language,
	};
};

const actionToProps = {
	handleOpen: showDelegateDialog,
	showMessage,
};

export default connect(stateToProps, actionToProps)(StakeTokensButton);

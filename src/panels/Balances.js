import React from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign, faEuroSign, faPoundSign, faCoins } from '@fortawesome/free-solid-svg-icons';

const BalancesPanel = styled.div`
	display: flex;
	margin-bottom: 20px;
`;

const BalanceBox = styled.div`
	display: flex;
	margin-right: 2%;
	background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3));
	backdrop-filter: blur(4px);
	z-index: 2;
	padding: 15px;
	border-radius: 15px;
	box-shadow: 3px 3px 3px #9f434e;
`;

const BalanceBoxValue = styled.div`
	font-size: 36px;
	line-height: 36px;
	color: #f1592a;
	@media screen and (max-width: 767px) {
		line-height: 22px;
		font-size: 22px;
	}
`;

const Icon = styled(FontAwesomeIcon)`
	font-size: 36px;
	color: lightgray;
	margin-left: 10px;
`;

export const Balances = ({
	totalBalance,
	selectedCurrency,
	showNumber,
	getSelectedCurrencyAlterdotPrice,
}) => {
	return (
		<BalancesPanel>
			<BalanceBox title="Your total ADOT balance">
				<BalanceBoxValue>{showNumber(totalBalance, 8)}</BalanceBoxValue>
				<Icon icon={faCoins} />
			</BalanceBox>
			<BalanceBox
				style={{ marginRight: '0' }}
				title={'1 ADOT = ' + getSelectedCurrencyAlterdotPrice() + ' ' + selectedCurrency}
			>
				<BalanceBoxValue style={{ color: '#d03c48' }}>
					{showNumber(totalBalance * getSelectedCurrencyAlterdotPrice(), 2)}
				</BalanceBoxValue>
				<Icon
					icon={
						selectedCurrency === 'EUR'
							? faEuroSign
							: selectedCurrency === 'GBP'
							? faPoundSign
							: faDollarSign
					}
				/>
			</BalanceBox>
		</BalancesPanel>
	);
};

import React from 'react';
import styled from 'styled-components';

const Panel = styled.div`
	position: relative;
	background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3));
	backdrop-filter: blur(4px);
	z-index: 2;
	padding: 15px;
	border-radius: 15px;
	box-shadow: 3px 3px 3px #9f434e;

	@media screen and (max-width: 768px) {
		float: none;
		width: 100%;
		font-size: 12px;
	}
`;

export function Transactions(props) {
	const renderAllTransactions = (transactions, fullSize) => {
		var twoMinutesAgo = new Date(new Date().getTime() + 2 * 60000);

		return (
			<div id="transactions">
				{transactions.map((tx) => {
					var isConfirmed = tx.txlock || tx.confirmations > 0 || tx.time > twoMinutesAgo;
					var confirmedClass = isConfirmed ? 'confirmed' : 'pending';
					var sentReceivedClass = tx.amountChange > 0 ? 'sent' : 'received';
					var combinedClass = `${confirmedClass} ${sentReceivedClass} tx-row`;
					return (
						<div className={combinedClass} key={tx.id}>
							<div className="colTx">
								<div className="tx_link">
									<a
										className="short-link"
										href={`https://${props.explorer}/tx/${tx.id}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										{tx.id.substring(0, 6)}...{tx.id.substring(tx.id.length - 4)}
									</a>
								</div>
							</div>
							<div className="colDate">
								<span className="txDate">{tx.time.toLocaleDateString()}</span>{' '}
								<span className="txTime">
									{tx.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
								</span>
							</div>
							<div className="colAlterdot" title={props.showAlterdotNumber(tx.amountChange)}>
								{(tx.amountChange > 0 ? '+' : '') +
									props.showNumber(tx.amountChange, fullSize ? 8 : 5)}
							</div>
							<div className="colFiat">
								{(tx.amountChange > 0 ? '+' : '') +
									(tx.amountChange * props.getSelectedCurrencyAlterdotPrice()).toFixed(2)}
							</div>
							<div className="colConfirmations">
								{tx.confirmations +
									(props.showNumber(tx.amountChange, fullSize ? 8 : 5) === '0'
										? ' PrivateSend'
										: tx.txlock
										? ' InstantSend'
										: isConfirmed
										? ''
										: ' Unconfirmed')}
							</div>
						</div>
					);
				})}
				{transactions.length === 0 && (
					<div>No recent transactions (or still loading, please wait a few seconds)</div>
				)}
			</div>
		);
	};

	return (
		<div className="panel" style={{ marginTop: '20px', height: '42%' }}>
			<div className="box-title">
				<h3>Transaction History</h3>
			</div>
			<div id="tx-table">
				<div className="tx-row">
					<div className="colTx">Transaction</div>
					<div className="colDate">Date</div>
					<div className="colAlterdot">ADOT</div>
					<div className="colFiat">{props.selectedCurrency}</div>
					<div className="colConfirmations">Confirmations</div>
				</div>
			</div>
			{renderAllTransactions(
				props.transactions.slice(0, 50).sort((a, b) => b.time - a.time),
				true
			)}
		</div>
	);
}

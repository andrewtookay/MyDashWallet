import React, { Component } from 'react'
import styled from 'styled-components'

const Panel = styled.div`
	position: relative;
	background: linear-gradient(to bottom right, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.3));
	backdrop-filter: blur(4px);
	z-index: 2;
	padding: 15px;
	border-radius: 15px;
	box-shadow: 3px 3px 3px #9f434e;
	margin-top: 20px;
	@media screen and (max-width: 768px) {
		float: none;
		width: 100%;
		font-size: 12px;
	}
`

export class Transactions extends Component {
	render = () => {
		return (
			<Panel>
				<div className="box-info all-transactions">
					<div className="box-info-inner">
						<div className="box-title">
							<h3>Transaction History</h3>
						</div>
						{this.renderAllTransactions(
							this.props.transactions.slice(0, 50).sort((a, b) => b.time - a.time),
							true
						)}
					</div>
				</div>
			</Panel>
		)
	}
	renderAllTransactions = (transactions, fullSize) => {
		var twoMinutesAgo = new Date(new Date().getTime() + 2 * 60000)
		console.log(transactions);
		return (
			<div id="transactions">
				<table style={{ tableLayout: 'fixed', width: '100%' }}>
					<tbody>
						<tr>
							<th className="colTx">Transaction</th>
							<th className="colDate">Date</th>
							<th className="colAlterdot">ADOT</th>
							<th className="colFiat">{this.props.selectedCurrency}</th>
							<th className="colConfirmations">Confirmations</th>
						</tr>
						{transactions.map(tx => {
							var isConfirmed = tx.txlock || tx.confirmations > 0 || tx.time > twoMinutesAgo
							var confirmedClass = isConfirmed ? 'confirmed' : 'pending'
							var sentReceivedClass = tx.amountChange > 0 ? 'sent' : 'received'
							var combinedClass = confirmedClass + ' ' + sentReceivedClass
							return (
								<tr className={combinedClass} key={tx.id}>
									<td className="colTx">
										<div className="tx_link">
											<a
												className="short-link"
												href={
													'https://' +
													this.props.explorer +
													(this.props.explorer === 'blockchair.com/dash'
														? '/transaction/'
														: '/tx/') +
													tx.id
												}
												target="_blank"
												rel="noopener noreferrer"
											>
												{tx.id.substring(0, 6)}...{tx.id.substring(tx.id.length - 4)}
											</a>
										</div>
									</td>
									<td className="colDate">
										<span className="txDate">{tx.time.toLocaleDateString()}</span>{' '}
										<span className="txTime">
											{tx.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
										</span>
									</td>
									<td className="colAlterdot" title={this.props.showAlterdotNumber(tx.amountChange)}>
										{(tx.amountChange > 0 ? '+' : '') +
											this.props.showNumber(tx.amountChange, fullSize ? 8 : 5)}
									</td>
									<td className="colFiat">
										{(tx.amountChange > 0 ? '+' : '') +
											(tx.amountChange * this.props.getSelectedCurrencyAlterdotPrice()).toFixed(2)}
									</td>
									<td className="colConfirmations">
										{tx.confirmations +
											(this.props.showNumber(tx.amountChange, fullSize ? 8 : 5) === '0'
												? ' PrivateSend'
												: tx.txlock
												? ' InstantSend'
												: isConfirmed
												? ''
												: ' Unconfirmed')}
									</td>
								</tr>
							)
						})}
						{transactions.length === 0 && (
							<tr>
								<td colSpan="5">
									No recent transactions (or still loading, please wait a few seconds)
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		)
	}
}

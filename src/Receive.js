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
	overflow: hidden;
	@media screen and (max-width: 768px) {
		float: none;
		width: 100%;
		font-size: 12px;
	}
`

export class Receive extends Component {
	render = () => {
		var addressLink =
			'https://' +
			this.props.explorer +
			'/address/' +
			this.props.lastUnusedAddress
		return (
			<Panel>
				<h3>Latest address</h3>
				<b>{this.props.lastUnusedAddress}</b>&nbsp;
				<a
					href={addressLink}
					alt="Insight"
					title="Insight"
					target="_blank"
					rel="noopener noreferrer"
				>
					View
				</a>
				<br />
				<img
					src={
						'//chart.googleapis.com/chart?cht=qr&chl=' +
						this.props.lastUnusedAddress +
						'&choe=UTF-8&chs=200x200&chld=L|0'
					}
					alt="QR Code"
					title="QR Code"
				/>
				{this.props.reversedAddresses.length > 1 && (
					<div>
						<h5>Your other addresses</h5>
						{this.props.reversedAddresses.slice(1).map(a => (
							<div key={a} style={{ fontSize: '15px' }}>
								<a
									href={
										'https://' +
										this.props.explorer +
										'/address/' +
										a
									}
									target="_blank"
									rel="noopener noreferrer"
								>
									{a}
								</a>
								<div
									style={{
										float: 'right',
										color:
											this.props.addressBalances && this.props.addressBalances[a] === 0.0100001
												? 'rgb(141, 0, 228)'
												: 'black',
									}}
								>
									{this.props.showAlterdotNumber(
										this.props.addressBalances && this.props.addressBalances[a]
									)}
								</div>
							</div>
						))}
					</div>
				)}
				<br />
				<button
					style={{ float: 'right' }}
					onClick={() =>
						this.props.getUnusedAddress()
					}
				>
					New Address
				</button>
			</Panel>
		)
	}
}

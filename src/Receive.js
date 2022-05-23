import React, { useState, useEffect } from 'react'
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

export function Receive(props) {
	const [addressLink, setAddressLink] = useState(() => getAddressExplorerLink(props.explorer, props.lastUnusedAddress));

	function getAddressExplorerLink(explorer, address) {
		return `https://${explorer}/address/'${address}`;
	};

	useEffect(() => {
		setAddressLink(getAddressExplorerLink(props.explorer, props.lastUnusedAddress));
	}, [props.explorer, props.lastUnusedAddress]);

	return (
		<Panel>
			<h3>Latest address</h3>
			<b>{props.lastUnusedAddress}</b>&nbsp;
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
					props.lastUnusedAddress +
					'&choe=UTF-8&chs=200x200&chld=L|0'
				}
				alt="QR Code"
				title="QR Code"
			/>
			{props.reversedAddresses.length > 1 && (
				<div>
					<h5>Your other addresses</h5>
					{props.reversedAddresses.slice(1).map(a => (
						<div key={a} style={{ fontSize: '15px' }}>
							<a
								href={
									'https://' +
									props.explorer +
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
										props.addressBalances && props.addressBalances[a] === 0.0100001
											? 'rgb(141, 0, 228)'
											: 'black',
								}}
							>
								{props.showAlterdotNumber(
									props.addressBalances && props.addressBalances[a]
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
					props.getUnusedAddress()
				}
			>
				New Address
			</button>
			<button
				style={{ float: 'right', marginRight: '10px' }}

				onClick={() =>
					props.scanWalletAddresses(10)
				}
			>
				Scan Wallet
			</button>
		</Panel>
	)
}

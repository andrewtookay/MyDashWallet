import React, { useState, useEffect } from 'react';

export const Receive = ({
	explorer,
	lastAddress,
	addressBalances,
	reversedAddresses,
	showAlterdotNumber,
	getUnusedAddress,
	scanWalletAddresses,
}) => {
	const getAddressExplorerLink = (explorer, address) => {
		return `https://${explorer}/address/${address}`;
	};

	const [addressLink, setAddressLink] = useState(() =>
		getAddressExplorerLink(explorer, lastAddress)
	);

	const getQrLink = () => {
		return `//chart.googleapis.com/chart?cht=qr&chl=${lastAddress}&choe=UTF-8&chs=200x200&chld=L|0`;
	};

	useEffect(() => {
		setAddressLink(getAddressExplorerLink(explorer, lastAddress));
	}, [explorer, lastAddress]);

	return (
		<div className="panel" style={{ overflow: 'hidden' }}>
			<h3>Latest address</h3>
			<b>{lastAddress}</b>&nbsp;
			<div
				style={{
					float: 'right',
					color:
						addressBalances && addressBalances[lastAddress] === 0.0100001
							? 'rgb(141, 0, 228)'
							: 'black',
				}}
			>
				{showAlterdotNumber(addressBalances && addressBalances[lastAddress])}
			</div>
			<a href={addressLink} alt="Insight" title="Insight" target="_blank" rel="noopener noreferrer">
				View
			</a>
			<img className="qr-code" src={getQrLink()} alt="QR Code" title="QR Code" />
			{reversedAddresses.length > 1 && (
				<div>
					<h5>Your other addresses</h5>
					{reversedAddresses.slice(1).map((a) => (
						<div key={a} style={{ fontSize: '15px' }}>
							<a
								href={`https://${explorer}/address/${a}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{a}
							</a>
							<div
								style={{
									float: 'right',
									color: 'black',
								}}
							>
								{showAlterdotNumber(addressBalances && addressBalances[a])}
							</div>
						</div>
					))}
				</div>
			)}
			<button style={{ float: 'right' }} onClick={() => getUnusedAddress()}>
				New Address
			</button>
			<button
				style={{ float: 'right', marginRight: '10px' }}
				onClick={() => scanWalletAddresses(10)}
			>
				Scan Wallet
			</button>
		</div>
	);
};

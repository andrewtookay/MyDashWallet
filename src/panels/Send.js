import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import QrReader from 'react-qr-reader';
import { Mnemonic, Transaction } from 'alterdot-lib';
import { NotificationManager } from 'react-notifications';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import SkyLight from 'react-skylight';
import * as constants from '../constants/constants.js';

var txFee = 2260 * constants.ADOT_PER_DUFF;

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
		margin-right: 0;
	}
`;

export const Send = (props) => {
	const [destinationAddress, setDestinationAddress] = useState('');
	const [amount, setAmount] = useState({ amountADOT: 0, amountUSD: 0 });
	const [displayedError, setDisplayedError] = useState('');
	const [password, setPassword] = useState('');
	const [qrData, setQrData] = useState({ enableQrScanner: false, addressPreviewResult: '' });
	const [sendTransaction, setSendTransaction] = useState('');

	const confirmSendDialog = useRef(null);
	const successSendDialog = useRef(null);

	const sendAlterdot = () => {
		if (!props.isValidAlterdotAddress(destinationAddress)) {
			NotificationManager.error('Invalid address');
		} else if (
			amount.amountADOT < constants.DUST_AMOUNT_IN_ADOT ||
			amount.amountADOT > props.totalBalance
		) {
			NotificationManager.error('Invalid amount');
			setDisplayedError(
				'Please use an amount you have and a valid address to send to. Unable to create transaction.'
			);
		} else if (!props.isCorrectPasswordHash(password)) {
			setDisplayedError(
				'Please enter your correct password to unlock your wallet for sending ADOT.'
			);
		} else {
			props.setRememberedPassword(password);
			createAndSendRawTx();
			confirmSendDialog.current.hide();
		}
	};

	// TODO_ADOT_MEDIUM keep track of UTXOs locally and use funds from some selected addresses (default: all)
	// TODO_ADOT_HIGH show if the wallet is waiting for tx confirmation
	// TODO_ADOT_FUTURE create getFeePerByte endpoint in API with values for slow, normal, and fast transactions, allow for setting of custom fee

	const createAndSendRawTx = () => {
		const addressesWithUnspentOutputs = getAddressesWithUnspentOutputs();
		console.log(addressesWithUnspentOutputs);

		const amountToSend = amount.amountADOT;
		let amountToUse = 0;
		let utxosToSpend = [];

		// TODO_ADOT_HIGH use already fetched utxos from updateTxFee
		getUnspentOutputs(addressesWithUnspentOutputs, (result) => {
			let utxos = JSON.parse(result);
			console.log(utxos);

			if (!utxos || Object.keys(utxos).length === 0) return; // TODO_ADOT_MEDIUM no usable outputs

			for (let utxo of utxos) {
				let amount = utxo.amount;

				if (amount >= constants.DUST_AMOUNT_INPUTS_IN_ADOT) {
					amountToUse += amount;
					utxosToSpend.push(
						new Transaction.UnspentOutput({
							txId: utxo.txid,
							outputIndex: utxo.vout,
							address: utxo.address,
							script: utxo.scriptPubKey, // add check, make sure Script.fromAddress(address) === utxos[index].scriptPubKey
							satoshis: utxo.satoshis,
						})
					);
				}

				console.log('amountToUse', amountToUse, 'amountToSend', amountToSend, 'txFee', txFee);

				if (amountToUse >= amountToSend + txFee) {
					let sendTo = destinationAddress;
					var tx = new Transaction();

					console.log(utxosToSpend);
					tx.from(utxosToSpend);

					let txSendAmount = parseInt((amountToSend * 100000000).toFixed(0));

					tx.to(sendTo, txSendAmount); // TODO_ADOT_MEDIUM safe ADOT to satoshis/dots
					tx.change(Object.keys(props.addressBalances)[0]);
					tx.fee(txFee * 100000000);

					console.log(tx);

					tx.sign(getAlterdotHDWalletPrivateKeys());
					sendSignedRawTx(tx.serialize());

					return;
				}
			}

			NotificationManager.error('Insufficient funds!');
			setDisplayedError(
				'It looks like you do not have enough funds to complete this transaction. Wait for the next block if you believe your transactions are not confirmed yet.'
			);

			return;
		});
	};

	const getAddressesWithUnspentOutputs = () => {
		var addresses = [];

		for (var key of Object.keys(props.addressBalances)) {
			let amount = props.addressBalances[key];

			if (!isNaN(amount) && amount > constants.DUST_AMOUNT_IN_ADOT) addresses.push(key);
		}

		return addresses;
	};

	const handleErrors = (response) => {
		if (!response.ok) {
			if (typeof response.text === 'function') {
				return response.text().then((errorMessage) => {
					throw Error(response.status + ': ' + errorMessage);
				});
			} else throw Error(response.status + ': ' + response.statusText);
		}

		return response.text();
	};

	const updateTxFee = () => {
		console.log('updateTxFee addressBalances', props.addressBalances);
		var amountToCheck = amount.amountADOT;

		if (
			amount.amountADOT < constants.DUST_AMOUNT_IN_ADOT ||
			amount.amountADOT > parseFloat(props.totalBalance) + constants.DUST_AMOUNT_IN_ADOT
		) {
			//$("#generateButton").css("backgroundColor", "gray").attr("disabled", "disabled"); TODO_ADOT_MEDIUM disable Send button
			if (amount.amountADOT > 0) setAmount({ amountADOT: 0, amountUSD: 0 });
		}

		getUnspentOutputs(getAddressesWithUnspentOutputs(), (result) => {
			let utxos = JSON.parse(result);
			console.log(utxos);

			if (!utxos || Object.keys(utxos).length === 0) return; // TODO_ADOT_MEDIUM no usable outputs

			let numberOfInputs = 0;

			let newTxFee = 0.0078 / 1000;
			let inputTxFee = 0.0148 / 1000;

			amountToCheck += newTxFee;

			for (let utxo of utxos) {
				console.log(utxo);
				let amountToSend = utxo.amount;
				if (amountToSend > 0 && amountToCheck > 0) {
					// do not use outputs with less than dust amount
					numberOfInputs++;
					newTxFee += inputTxFee;
					amountToCheck = amountToCheck - amountToSend + inputTxFee;
				}
			}

			if (!numberOfInputs) return; // TODO_ADOT_MEDIUM no usable outputs

			txFee = props.showNumber(newTxFee, 8);
			if (!txFee) txFee = 1920 * constants.ADOT_PER_DUFF;

			console.log('new txFee:', txFee);
		});
	};

	const getUnspentOutputs = (addresses, callback) => {
		fetch('https://insight.alterdot.network/insight-api/addrs/utxo', {
			mode: 'cors',
			cache: 'no-cache',
			method: 'POST',
			body: `{"addrs": "${addresses.join(',')}"}`,
			headers: { 'Content-Type': 'application/json' },
		})
			.then(handleErrors)
			.then(callback)
			.catch(function (serverError) {
				NotificationManager.error('Server Error!');
				setDisplayedError('Server Error: ' + (serverError.message || serverError));
			});
	};

	const sendSignedRawTx = (signedRawTx) => {
		fetch('https://insight.alterdot.network/insight-api/tx/send', {
			mode: 'cors',
			cache: 'no-cache',
			method: 'POST',
			body: JSON.stringify({ rawtx: signedRawTx }),
			headers: { 'Content-Type': 'application/json' },
		})
			.then(handleErrors)
			.then((finalTx) => {
				var ret = JSON.parse(finalTx);
				// amountToSend and txFee might get here as strings
				var sentAmount = parseFloat(amount.amountADOT);
				txFee = parseFloat(txFee);

				setDisplayedError('');
				setPassword('');
				setAmount({ amountADOT: 0, amountUSD: 0 });
				setSendTransaction(ret.txid);

				NotificationManager.success(
					'Sent ' + props.showAlterdotNumber(sentAmount) + ' to ' + destinationAddress,
					'Success'
				);

				var amountChange = props.addresses.includes(destinationAddress)
					? -txFee
					: -(sentAmount + txFee);
				var newBalance = parseFloat(props.totalBalance) + amountChange;

				if (newBalance < constants.DUST_AMOUNT_IN_ADOT) newBalance = 0;

				NotificationManager.info('New balance: ' + props.showAlterdotNumber(newBalance));
				successSendDialog.current.show();

				props.addTransaction({
					id: ret.txid,
					amountChange: amountChange,
					time: new Date(),
					confirmations: 0,
					size: txFee * 10000000, // 10000 satoshis/kb and size is in bytes
					fees: txFee,
					txlock: false,
				});

				props.updateAllBalances();
			})
			.catch(function (serverError) {
				NotificationManager.error('Server Error!');
				setDisplayedError('Server Error: ' + (serverError.message || serverError));
			});
	};

	const getAlterdotHDWalletPrivateKeys = () => {
		var keys = [];
		var index = 0;
		var mnemonic = new Mnemonic(props.onDecrypt(props.hdSeedE, password));
		var xpriv = mnemonic.toHDPrivateKey();

		Object.keys(props.addressBalances).forEach(() => {
			keys.push(xpriv.derive("m/44'/5'/0'/0/" + index).privateKey);
			index++;
		});

		return keys;
	};

	const handleScan = (data) => {
		if (data) {
			setQrData({
				enableQrScanner: false,
				addressPreviewResult: 'Successfully scanned QR code',
			});

			setDestinationAddress(data.replace('alterdot:', '').split('?')[0]);
		}
	};

	return (
		<div>
			<SkyLight
				dialogStyles={props.popupDialog}
				hideOnOverlayClicked
				ref={confirmSendDialog}
				title="Confirm transaction"
			>
				<div className="d-flex flex-column">
					<span className="mt-3 mb-3">
						Address to send to: <b>{destinationAddress}</b>
					</span>
					<span className="mb-3">
						Amount:{' '}
						<b>
							{props.showAlterdotNumber(amount.amountADOT)} (
							{props.showNumber(amount.amountADOT * props.getSelectedCurrencyAlterdotPrice(), 2)}{' '}
							{props.selectedCurrency})
						</b>
					</span>
					<span className="mb-3">
						{/* TODO_ADOT_HIGH fee loading */}
						Fee:{' '}
						<b>
							{props.showAlterdotNumber(txFee)} (
							{props.showNumber(txFee * props.getSelectedCurrencyAlterdotPrice(), 4)}{' '}
							{props.selectedCurrency})
						</b>
					</span>
				</div>

				<div className="input_box col_6 fl password mt-3 mb-3">
					<span
						style={{
							fontWeight: '600',
							fontSize: '18px',
							color: 'var(--body-color)',
							lineHeight: '25px',
							opacity: '0.55',
						}}
					>
						Enter your password to sign the transaction
					</span>
					<p>
						<input
							type="password"
							style={{ borderBottom: '1px solid gray', fontSize: '16px' }}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</p>
				</div>

				<button
					className="a_btn confirm-btn btn-base btn-orange"
					onClick={() => confirmSendDialog.current.hide()}
				>
					Back
				</button>
				<button
					style={{ float: 'right' }}
					className="a_btn confirm-btn btn-base btn-orange"
					onClick={() => sendAlterdot()}
				>
					Confirm
				</button>
				<div
					className="error dww-error-msg mt-3"
					dangerouslySetInnerHTML={{ __html: displayedError }}
				/>
			</SkyLight>
			<SkyLight
				dialogStyles={props.popupDialog}
				hideOnOverlayClicked
				ref={successSendDialog}
				title="Success"
			>
				<p className="mb-3">Your transaction was successfully sent!</p>

				<p className="mb-3">
					View it on the explorer:{' '}
					<a
						href={`https://${props.explorer}/tx/${sendTransaction}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{sendTransaction}
					</a>
				</p>

				<div className="error" dangerouslySetInnerHTML={{ __html: displayedError }} />
				<button onClick={() => successSendDialog.current.hide()}>Ok</button>
			</SkyLight>
			<Panel>
				<h3>Send Alterdot</h3>
				<div className="send_step_bg_otr section-send-step1">
					<div className="send_step_form_otr step_1_otr">
						<div className="input_box_otr clearfix">
							<div className="input_box col_12 fl">
								<label>Destination Address</label>
								<table style={{ width: '100%' }}>
									<tbody>
										<tr>
											<td style={{ width: 'auto' }}>
												<input
													type="text"
													placeholder="Alterdot Address"
													value={destinationAddress}
													onChange={(e) => setDestinationAddress(e.target.value)}
												/>
											</td>
											<td style={{ width: '35px' }}>
												<FontAwesomeIcon
													icon={faQrcode}
													style={{ marginTop: '3px', fontSize: '32px', float: 'right' }}
													alt="QR Scanner"
													title="Enable QR Scanner"
													onClick={() => {
														if (qrData.enableQrScanner)
															setQrData((prevQrData) => {
																return { ...prevQrData, enableQrScanner: false };
															});
														else
															setQrData({
																enableQrScanner: true,
																addressPreviewResult:
																	'QR Code Scanner ready, please scan an ADOT address!',
															});
													}}
												/>
											</td>
										</tr>
									</tbody>
								</table>
								{qrData.enableQrScanner && (
									<div>
										<QrReader
											delay={300}
											onError={(err) =>
												setQrData((prevQrData) => {
													return {
														...prevQrData,
														addressPreviewResult: err.message,
													};
												})
											}
											onScan={handleScan}
											style={{ width: '100%' }}
										/>
										<p>{qrData.addressPreviewResult}</p>
									</div>
								)}
							</div>

							<div className="full-row mt-3">
								<div className="amount-box">
									<label>Amount ADOT</label>
									<div className="amount-line">
										<input
											type="number"
											value={amount.amountADOT}
											onChange={(e) => {
												var newValue = parseFloat(e.target.value);
												if (newValue < 0 || isNaN(newValue)) newValue = 0;
												setAmount({
													amountADOT: newValue,
													amountUSD: props.showNumber(
														newValue * props.getSelectedCurrencyAlterdotPrice(),
														2
													),
												});
											}}
										/>
										<button
											className="max-amount"
											onClick={() => {
												setAmount({
													amountADOT: props.totalBalance,
													amountUSD: props.showNumber(
														props.totalBalance * props.getSelectedCurrencyAlterdotPrice(),
														2
													),
												});
											}}
										>
											Max
										</button>
									</div>
								</div>
								<div className="amount-box">
									<label>Amount {props.selectedCurrency}</label>
									<div className="amount-line">
										<input
											type="number"
											value={amount.amountUSD}
											onChange={(e) => {
												var newValue = parseFloat(e.target.value);
												if (newValue < 0 || isNaN(newValue)) newValue = 0;
												setAmount({
													amountADOT: props.showNumber(
														newValue / props.getSelectedCurrencyAlterdotPrice(),
														5
													),
													amountUSD: newValue,
												});
											}}
										/>
										<button
											className="max-amount"
											onClick={() => {
												setAmount({
													amountADOT: props.totalBalance,
													amountUSD: props.showNumber(
														props.totalBalance * props.getSelectedCurrencyAlterdotPrice(),
														2
													),
												});
											}}
										>
											Max
										</button>
									</div>
								</div>
							</div>
							<div className="input_box col_12 form_btn fl section-next mt-3">
								<button
									style={{ float: 'right', width: '24%' }}
									onClick={() => {
										if (!props.isValidAlterdotAddress(destinationAddress)) {
											setDisplayedError('Please enter a valid Alterdot destination address.');
										} else if (amount.amountADOT < constants.DUST_AMOUNT_IN_ADOT) {
											setDisplayedError(
												`Make sure to enter a valid amount. Minimum ${constants.DUST_AMOUNT_IN_ADOT} ADOT`
											);
										} else if (amount.amountADOT > props.totalBalance) {
											var balanceError = `You have ${props.showAlterdotNumber(
												props.totalBalance
											)}, the amount to sent was corrected, please check and press Next again.`;
											setAmount({
												amountADOT: props.totalBalance,
												amountUSD: props.totalBalance * props.getSelectedCurrencyAlterdotPrice(),
											});
											setDisplayedError(balanceError);
										} else {
											setDisplayedError('');
											updateTxFee();
											confirmSendDialog.current.show();
										}
									}}
								>
									Next
								</button>
							</div>
							<div className="cleardiv">&nbsp;</div>
							<div className="dww-error-msg">{displayedError}</div>
						</div>
					</div>
				</div>
			</Panel>
		</div>
	);
};

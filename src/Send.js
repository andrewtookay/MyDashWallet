import React, { useState, useRef } from 'react'
import styled from 'styled-components'
import QrReader from 'react-qr-reader'
import { Mnemonic, Transaction } from 'alterdot-lib'
import { NotificationManager } from 'react-notifications'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQrcode } from '@fortawesome/free-solid-svg-icons'
import SkyLight from 'react-skylight'
import * as constants from './constants.js'

var lastKnownNumberOfInputs = 1;
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
		margin-bottom: 10px;
		font-size: 12px;
	}
`

export function Send(props) {
	const [destinationAddress, setDestinationAddress] = useState('');
	const [amount, setAmount] = useState({ amountADOT: 0, amountUSD: 0 });
	const [displayedError, setDisplayedError] = useState('');
	const [password, setPassword] = useState('');
	const [qrData, setQrData] = useState({ enableQrScanner: false, addressPreviewResult: '' });
	const [sendTransaction, setSendTransaction] = useState('');
	
	const confirmSendDialog = useRef(null);
	const successSendDialog = useRef(null);
	
	function sendAlterdot() {
		if (
			amount.amountADOT < constants.DUST_AMOUNT_IN_ADOT ||
			amount.amountADOT > props.totalBalance ||
			!props.isValidAlterdotAddress(destinationAddress)
		) {
			NotificationManager.error(
				!props.isValidAlterdotAddress(destinationAddress)
					? 'Invalid address'
					: 'Invalid amount'
			)
			setDisplayedError('Please use an amount you have and a valid address to send to. Unable to create transaction.');
		} else if (!props.isCorrectPasswordHash(password)) {
			setDisplayedError('Please enter your correct password to unlock your wallet for sending ADOT.');
		} else {
			props.setRememberedPassword(password)
			addNextAddressWithUnspendFundsToRawTx(
				getAddressesWithUnspendFunds(),
				0,
				props.addresses[0], // TODO_ADOT_MEDIUM change goes into the first/main address
				// props.getUnusedAddress(), // ADOT_COMMENT always getting another address for change, unwanted behaviour
				0,
				[],
				[],
				[],
				''
			)
			confirmSendDialog.current.hide();
		}
	}
	
	function getAddressesWithUnspendFunds() {
		var addresses = []
		var addressIndex = 0
		for (var key of Object.keys(props.addressBalances)) {
			var amount = props.addressBalances[key]
			if (!isNaN(amount) && amount > constants.DUST_AMOUNT_IN_ADOT)
				addresses.push({ addressIndex: addressIndex, address: key })
			addressIndex++
		}
		return addresses
	}
	function handleErrors(response) {
		if (!response.ok) {
			if (typeof response.text === 'function') {
				return response.text().then(errorMessage => {
					throw Error(response.status + ': ' + errorMessage)
				})
			} else throw Error(response.status + ': ' + response.statusText)
		}
		return response.json()
	}
	function handleErrorsText(response) {
		if (!response.ok) {
			if (typeof response.text === 'function') {
				return response.text().then(errorMessage => {
					throw Error(response.status + ': ' + errorMessage)
				})
			} else throw Error(response.status + ': ' + response.statusText)
		}
		return response.text()
	}
	// this is only a guess as we don't know how many inputs are on each address, but on a normal hd wallet it is quite ok
	function getNumberOfInputsRequired(amountToSend) {
		var numberOfAddressesToUse = 0
		for (var key of Object.keys(props.addressBalances)) {
			var amount = props.addressBalances[key]
			if (!isNaN(amount) && amount > constants.DUST_AMOUNT_IN_ADOT) {
				numberOfAddressesToUse++
				amountToSend -= amount
				if (amountToSend <= 0) return numberOfAddressesToUse
			}
		}
		return numberOfAddressesToUse
	}
	function updateTxFee(numberOfInputs) {
		if (!numberOfInputs || numberOfInputs <= 0) {
			// Try to figure out how many inputs we would need if we have multiple addresses
			numberOfInputs = 0;
			var amountToCheck = amount.amountADOT;
			for (var address of Object.keys(props.addressBalances)) { // TODO_ADOT_MEDIUM this only takes into account the number of addresses, not actual inputs
				var amountToSend = props.addressBalances[address]
				if (amountToSend > 0 && amountToCheck > 0.00000001) {
					numberOfInputs++;
					amountToCheck -= amountToSend;
				}
			}
			if (numberOfInputs === 0) numberOfInputs = lastKnownNumberOfInputs;
		}
		lastKnownNumberOfInputs = numberOfInputs;
		// mADOT tx fee with 10 dots/byte with default 226 byte tx for 1 input, 374 for 2 inputs (78+148*
		// inputs). All this is recalculated below and on the server side once number of inputs is known. TODO_ADOT_HIGH update comments
		txFee = (0.0078 + 0.0148 * numberOfInputs) / 1000;
		if (!txFee) txFee = 1920 * constants.ADOT_PER_DUFF;
		
		if (
			amount.amountADOT < constants.DUST_AMOUNT_IN_ADOT ||
			amount.amountADOT > parseFloat(props.totalBalance) + constants.DUST_AMOUNT_IN_ADOT
		) {
			//$("#generateButton").css("backgroundColor", "gray").attr("disabled", "disabled");
			if (amount.amountADOT > 0) setAmount({ amountADOT: 0, amountUSD: 0 });
		}
	}
	function getTotalAmountNeededByRecalculatingTxFee(txToUse) {
		// Recalculate txFee, now we know the actual number of inputs needed
		updateTxFee(txToUse.length);
		// Some users had problems with strings being added, make sure we only have numbers here!
		var totalAmountNeeded = parseFloat(amount.amountADOT) + parseFloat(txFee);
		console.log(totalAmountNeeded, txFee);
		// If we send everything, subtract txFee so we can actually send everything
		if (totalAmountNeeded >= props.totalBalance)
			totalAmountNeeded = parseFloat(props.totalBalance);
		return totalAmountNeeded;
	}
	function addNextAddressWithUnspendFundsToRawTx(
		addressesWithUnspendInputs,
		addressesWithUnspendInputsIndex,
		remainingAddress,
		txAmountTotal,
		txToUse,
		txOutputIndexToUse,
		txAddressPathIndices,
		inputListText,
		utxosToSpend = []
	) {
		if (addressesWithUnspendInputsIndex >= addressesWithUnspendInputs.length) {
			NotificationManager.error('Insufficient funds!');
			setDisplayedError("It looks like you do not have enough funds to complete this transaction. If you do, wait for the next block. Please email a.alterdot@gmail.com for assistance.");
			return;
		}
		setDisplayedError('');
		var address = addressesWithUnspendInputs[addressesWithUnspendInputsIndex].address;
		// console.log('addNextAddressWithUnspendFundsToRawTx ' + address + ' index=' + addressesWithUnspendInputsIndex);
		fetch(
			`https://${props.explorer}/insight-api/addr/${addressesWithUnspendInputs[addressesWithUnspendInputsIndex].address}/utxo`,
			{
				mode: 'cors',
				cache: 'no-cache',
			}
		)
			.then(handleErrors)
			.then(utxos => {
				var thisAddressAmountToUse = 0;
				var totalAmountNeeded = getTotalAmountNeededByRecalculatingTxFee(txToUse);
				console.log("utxos:", utxos);
				for (var i = 0; i < utxos.length; i++) {
					var amount = utxos[i]['amount'];
					if (amount >= constants.DUST_AMOUNT_INPUTS_IN_ADOT) {
						txToUse.push(utxos[i]['txid']);
						txOutputIndexToUse.push(utxos[i]['vout']);
						txAddressPathIndices.push(
							addressesWithUnspendInputs[addressesWithUnspendInputsIndex].addressIndex
						);
						thisAddressAmountToUse += amount;
						txAmountTotal += amount;
						utxosToSpend.push(new Transaction.UnspentOutput({
							txId: utxos[i].txid,
							outputIndex: utxos[i].vout,
							address: utxos[i].address,
							script: utxos[i].scriptPubKey, // add check, make sure Script.fromAddress(address) === utxos[index].scriptPubKey
							satoshis: utxos[i].satoshis
						}));
						totalAmountNeeded = getTotalAmountNeededByRecalculatingTxFee(txToUse);
						console.log("here0", txAmountTotal, totalAmountNeeded, txFee);
						if (txAmountTotal >= totalAmountNeeded) break
						console.log("here1");
					}
				}
				inputListText +=
					'https://' +
					props.explorer +
					'/address/' +
					address +
					' (-' +
					props.showAlterdotNumber(thisAddressAmountToUse) +
					')'
				// Add extra offset in case we are very close to the txFee with total amount!
				if (txAmountTotal >= totalAmountNeeded - txFee * 2) { // TODO_ADOT_COMMENT with our wallet calculations will happen locally so we need exact numbers
					// the user must know how much gets sent and how much is spent on fees

					// We have all the inputs we need, we can now create the raw tx
					//$("#transactionPanel").show();
					//debug: inputListText += "<li>Done, got all inputs we need:</li>";
					/* ADOT dev
					var utxosTextWithOutputIndices = ''
					for (var index = 0; index < txToUse.length; index++) {
						//debug: inputListText += "<li>"+txToUse[index]+", "+txOutputIndexToUse[index]+"</li>";
						utxosTextWithOutputIndices += txToUse[index] + '|' + txOutputIndexToUse[index] + '|'
					}
					*/
					var sendTo = destinationAddress;
					//var usePrivateSend = false //TODO: $("#usePrivateSend").is(':checked');
					// Update amountToSend in case we had to reduce it a bit to allow for the txFee
					var amountToSend = props.showNumber(totalAmountNeeded - txFee, 8); // totalAmountNeeded is amountToSend + txFee so this seems useless?
					if (amountToSend !== amount.amountADOT) setAmount({ amountADOT: amountToSend, amountUSD: 0 });
					//var remainingAlterdot = txAmountTotal - totalAmountNeeded
					var tx = new Transaction();
					console.log("txToUse: " + txToUse + " txOutputIndexToUse: " + txOutputIndexToUse + " sendTo: " + sendTo + " amountToSend: " + props.showNumber(amountToSend, 8) +
					" remainingAddress: " + remainingAddress);

					console.log(utxosToSpend);
					tx.from(utxosToSpend);
					console.log("amountToSend pre-parseInt: " + (amountToSend * 100000000).toFixed(0));
					amountToSend = parseInt((amountToSend * 100000000).toFixed(0));
					console.log("amountToSend", amountToSend);
					tx.to(sendTo, amountToSend); // TODO_ADOT_MEDIUM safe ADOT to satoshis/dots
					console.log("here0");
					tx.change(remainingAddress);
					console.log("here1");
					tx.fee(txFee * 100000000);
					console.log("here2");
					console.log(tx);

					// TODO_ADOT_HIGH end of first method, display tx fee info

					tx.sign(getAlterdotHDWalletPrivateKeys());
					sendSignedRawTx(tx.serialize()); // TODO_ADOT_HIGH error checks
					return;
				}
				// Not done yet, get next address
				addressesWithUnspendInputsIndex++;
				if (addressesWithUnspendInputsIndex < addressesWithUnspendInputs.length)
					addNextAddressWithUnspendFundsToRawTx(
						addressesWithUnspendInputs,
						addressesWithUnspendInputsIndex,
						remainingAddress,
						txAmountTotal,
						txToUse,
						txOutputIndexToUse,
						txAddressPathIndices,
						inputListText,
						utxosToSpend
					);
				else {
					NotificationManager.error('Insufficient funds');
					setDisplayedError(
						'Insufficient funds, cannot send ' +
						totalAmountNeeded +
						' Alterdot (including tx fee), you only have ' +
						props.totalBalance +
						' Alterdot. Unable to create transaction (please refresh this site if you have enough Alterdot)! Your inputs so far:<br><ul>' +
						inputListText +
						'</ul>'
					);
				}
			})
			.catch(error => {
				NotificationManager.error('Server error encountered!');
				setDisplayedError(error.message || error);
			});
	}
	function sendSignedRawTx(signedRawTx) {
		fetch('https://insight.alterdot.network/insight-api/tx/send', {
			mode: 'cors',
			cache: 'no-cache',
			method: 'POST',
			body: JSON.stringify({ rawtx: signedRawTx }),
			headers: { 'Content-Type': 'application/json' },
		})
			.then(handleErrorsText)
			.then(finalTx => {
				var ret = JSON.parse(finalTx);
				// amountToSend and txFee might get here as strings
				var sentAmount = parseFloat(amount.amountADOT);
				txFee = parseFloat(txFee);

				console.log("sendSignedRawTx BEFORE");
				setDisplayedError('');
				setPassword('');
				setAmount({ amountADOT: 0, amountUSD: 0 });
				setSendTransaction(ret.txid);

				NotificationManager.success(
					'Sent ' +
						props.showAlterdotNumber(sentAmount) +
					' to ' +
						destinationAddress,
					'Success'
				);
				var amountChange = props.addresses.includes(destinationAddress) ? - txFee : - (sentAmount + txFee);
				var newBalance = parseFloat(props.totalBalance) + amountChange;

				if (newBalance < constants.DUST_AMOUNT_IN_ADOT) newBalance = 0;
				//NotificationManager.info('New balance: ' + props.showAlterdotNumber(newBalance));
				props.setNewTotalBalance(newBalance);
				successSendDialog.current.show();
				console.log(props.addresses, destinationAddress);
				props.addTransaction({
					id: ret.txid,
					amountChange: amountChange,
					time: new Date(),
					confirmations: 0,
					size: txFee * 10000000, // 10000 satoshis/kb and size is in bytes
					fees: txFee,
					txlock: true,
				});
				props.onUpdateBalanceAndAddressesStorage(newBalance, props.addresses);
			})
			.catch(function(serverError) {
				NotificationManager.error('Server Error!');
				setDisplayedError('Server Error: ' + (serverError.message || serverError));
			})
	}
	function getAlterdotHDWalletPrivateKeys() {
		var keys = []
		var index = 0
		var mnemonic = new Mnemonic(props.onDecrypt(props.hdSeedE, password))
		var xpriv = mnemonic.toHDPrivateKey()
		Object.keys(props.addressBalances).forEach(() => {
			keys.push(xpriv.derive("m/44'/5'/0'/0/" + index).privateKey)
			index++
		})
		return keys
	}
	function handleScan(data) {
		if (data) {
			setQrData({ 
				enableQrScanner: false,
				addressPreviewResult: 'Successfully scanned QR code'
			});
			setDestinationAddress(data.replace('dash:', '').split('?')[0]);
		}
	}
	return (
		<div>
			<SkyLight
				dialogStyles={props.popupDialog}
				hideOnOverlayClicked
				ref={confirmSendDialog}
				title="Confirm transaction"
			>
				<br />
				Address to send to: <b>{destinationAddress}</b>
				<br />
				<br />
				Amount in ADOT: <b>{props.showAlterdotNumber(amount.amountADOT)}</b>
				<br />
				Amount in {props.selectedCurrency}:{' '}
				<b>
					{props.showNumber(
						amount.amountADOT * props.getSelectedCurrencyAlterdotPrice(),
						2
					)}
				</b>
				<br />
				<br />
				Fee in ADOT: {props.showAlterdotNumber(txFee)}
				<br />
				Fee in {props.selectedCurrency}:{' '}
				{props.showNumber(txFee * props.getSelectedCurrencyAlterdotPrice(), 4)}
				<br />
				<br />
				<div className="input_box col_6 fl password">
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
							onChange={e => setPassword(e.target.value)}
						/>
					</p>
				</div>
				<br />
				<br />
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
				<div className="cleardiv">&nbsp;</div>
				<div
					className="error dww-error-msg"
					dangerouslySetInnerHTML={{ __html: displayedError }}
				/>
			</SkyLight>
			<SkyLight
				dialogStyles={props.popupDialog}
				hideOnOverlayClicked
				ref={successSendDialog}
				title="Success"
			>
				<br />
				Your transaction was successfully sent.
				<br />
				<a
					href={`https://${props.explorer}/tx/${sendTransaction}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					{sendTransaction}
				</a>
				<br />
				<br />
				<p>Your new balance is {props.showAlterdotNumber(props.totalBalance)}</p>
				<br />
				<div className="error" dangerouslySetInnerHTML={{ __html: displayedError }} />
				<br />
				<br />
				<button onClick={() => successSendDialog.current.hide()}>Ok</button>
			</SkyLight>
			<Panel>
				<h3>Send Alterdot</h3>
				<div className="send_step_bg_otr section-send-step1">
					<div className="send_step_form_otr step_1_otr">
						<div className="input_box_otr clearfix">
							<div className="input_box col_12 fl">
								<label>Destination Address:</label>
								<table style={{ width: '100%' }}>
									<tbody>
										<tr>
											<td style={{ width: 'auto' }}>
												<input
													type="text"
													placeholder="Alterdot Address"
													value={destinationAddress}
													onChange={e => setDestinationAddress(e.target.value)}
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
															setQrData(prevQrData => { return { ...prevQrData, enableQrScanner: false }});
														else
															setQrData({
																enableQrScanner: true,
																addressPreviewResult:
																	'QR Code Scanner ready, please scan an ADOT address!'
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
											onError={err => setQrData(prevQrData => { return { 
												...prevQrData, 
												addressPreviewResult: err.message 
											}})}
											onScan={handleScan}
											style={{ width: '100%' }}
										/>
										<p>{qrData.addressPreviewResult}</p>
									</div>
								)}
							</div>
							<br />
							<div className="input_box col_6 fl dash_currency">
								<label>How much ADOT do you want to send?</label>
								<div className="full-line">
									<input
										style={{ marginRight: '8px' }}
										type="number"
										value={amount.amountADOT}
										onChange={e => {
											var newValue = parseFloat(e.target.value);
											if (newValue < 0 || isNaN(newValue)) newValue = 0;
											setAmount({
												amountADOT: newValue,
												amountUSD: props.showNumber(
													newValue * props.getSelectedCurrencyAlterdotPrice(), 2
												)
											});
										}}
									/>
									<button
										style={{ width: '80px' }}
										onClick={() => {
											setAmount({
												amountADOT: props.totalBalance,
												amountUSD: props.showNumber(
													props.totalBalance * props.getSelectedCurrencyAlterdotPrice(), 2
												)
											});
										}}
									>
										Max
									</button>
								</div>
							</div>
							<br />
							<div className="input_box col_6 fl usd_currency">
								<label>Amount {props.selectedCurrency}:</label>
								<div className="full-line">
									<input
										style={{ marginRight: '8px' }}
										type="number"
										value={amount.amountUSD}
										onChange={e => {
											var newValue = parseFloat(e.target.value);
											if (newValue < 0 || isNaN(newValue)) newValue = 0;
											setAmount({
												amountADOT: props.showNumber(
													newValue / props.getSelectedCurrencyAlterdotPrice(), 5
												),
												amountUSD: newValue
											});
										}}
									/>
									<button
										style={{ width: '80px' }}
										onClick={() => {
											setAmount({
												amountADOT: props.totalBalance,
												amountUSD: props.showNumber(
													props.totalBalance * props.getSelectedCurrencyAlterdotPrice(), 2
												)
											});
										}}
									>
										Max
									</button>
								</div>
							</div>
							<br />
							<div className="input_box col_12 form_btn fl section-next">
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
											var balanceError =
												`You have ${props.showAlterdotNumber(props.totalBalance)}, the amount to sent was corrected, please check and press Next again.`;
											setAmount({
												amountADOT: props.totalBalance,
												amountUSD: props.totalBalance * props.getSelectedCurrencyAlterdotPrice()
											});
											setDisplayedError(balanceError);
										} else {
											setDisplayedError('');
											updateTxFee(getNumberOfInputsRequired(amount.amountADOT));
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
	)
}

import React, { useEffect, useState, useRef } from 'react';
import update from 'immutability-helper';
import { Balances } from '../panels/Balances';
import { Send } from '../panels/Send';
import { Receive } from '../panels/Receive';
import { Transactions } from '../panels/Transactions';
import { Mnemonic } from 'alterdot-lib';
import SkyLight from 'react-skylight';
import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import * as constants from '../constants/network.js';

export const Wallet = ({
	addressBalances,
	totalBalance,
	updateBalanceAddressStorage,
	showNumber,
	explorer,
	updateAddressBalances,
	rememberPassword,
	hdSeedE,
	onDecrypt,
	selectedCurrency,
	priceEur,
	priceGbp,
	priceUsd,
	popupDialog,
	isCorrectPasswordHash,
	setMode,
}) => {
	const [state, setState] = useState({
		transactions: [],
		scanWallet: false,
		password: rememberPassword || '',
		lastAddress:
			addressBalances && Object.keys(addressBalances).length > 0
				? Object.keys(addressBalances)[0]
				: '',
	});

	const [lastAmountChange, setLastAmountChange] = useState();

	const abortController = new AbortController();
	const showPasswordDialog = useRef();

	useEffect(() => {
		let updateBalanceInterval = setInterval(() => balanceCheck(), 20000);

		fillTransactions(Object.keys(addressBalances));

		return () => {
			clearInterval(updateBalanceInterval);
			abortController.abort();
		};
	});

	useEffect(() => {
		fillTransactions(Object.keys(addressBalances));
		setState({
			...state,
			lastAddress: Object.keys(addressBalances)[Object.keys(addressBalances).length - 1],
		});
	}, [Object.keys(addressBalances).length]);

	const addTransaction = (tx) => {
		// If we already got this tx, there is nothing we need to do, new ones are just added on top
		for (var existingTx of state.transactions) if (existingTx.id === tx.id) return;
		// Must be updated with state, see https://jsbin.com/mofekakuqi/7/edit?js,output
		setState((state) => update(state, { transactions: { $push: [tx] } }));
		if (tx.amountChange > 0 && tx.amountChange !== lastAmountChange) {
			setLastAmountChange(tx.amountChange);
			NotificationManager.warning(
				'Incoming transaction',
				'+' + showAlterdotNumber(tx.amountChange)
			);
		}
	};

	const showAlterdotNumber = (amount) => {
		return showNumber(amount, 8) + ' ADOT';
	};

	const fillTransactionFromAddress = (address) => {
		// TODO_ADOT_HIGH get transactions from all addresses in one request, can be paginated
		// move the transactions state to the Transactions component
		// unconfirmed transactions will have a separate array that sits here or just reload transactions after successful send
		fetch('https://' + explorer + '/insight-api/txs/?address=' + address, {
			mode: 'cors',
			cache: 'no-cache',
		})
			.then((response) => response.json())
			.then((data) => {
				const txs = data.txs;
				for (var index = 0; index < txs.length; index++) {
					const tx = txs[index];
					var time = new Date(tx['time'] * 1000);
					var amountChange = 0;
					const vin = tx['vin'];
					for (var i = 0; i < vin.length; i++)
						if (isOwnAddress(vin[i]['addr'], address)) amountChange -= parseFloat(vin[i]['value']);
					const vout = tx['vout'];
					for (var j = 0; j < vout.length; j++)
						if (isOwnAddress(vout[j]['scriptPubKey']['addresses'][0], address))
							amountChange += parseFloat(vout[j]['value']);
					addTransaction({
						id: tx.txid,
						amountChange: amountChange,
						time: time,
						confirmations: tx.confirmations,
						size: tx.size,
						fees: tx.fees,
						txlock: tx.txlock,
					});
				}
			});
	};

	const isOwnAddress = (addressToCheck, sendAddress) => {
		if (addressToCheck === sendAddress) return true;
		return Object.keys(addressBalances).includes(addressToCheck);
	};

	const fillTransactions = (addresses) => {
		for (var address of addresses) fillTransactionFromAddress(address);
	};

	// Loops through all known Alterdot addresses and checks the balance and sums up to total amount we got
	const balanceCheck = () => {
		for (var addressToCheck of Object.keys(addressBalances))
			if (isValidAlterdotAddress(addressToCheck)) {
				updateAddressBalance(addressToCheck);
				fillTransactionFromAddress(addressToCheck);
			}
	};

	const isValidAlterdotAddress = (address) => {
		// TODO_ADOT_MEDIUM extract common utility functions
		return address && address.length >= 34 && (address[0] === 'C' || address[0] === '5');
	};

	const updateAddressBalance = (addressToCheck) => {
		fetch('https://' + explorer + '/insight-api/addr/' + addressToCheck, {
			mode: 'cors',
			cache: 'no-cache',
			signal: abortController.signal,
		})
			.then((response) => response.json())
			.then((data) => {
				if (data && !isNaN(data.balance)) {
					var newBalance = parseFloat(data.balance);

					if (!isNaN(data.unconfirmedBalance)) newBalance += parseFloat(data.unconfirmedBalance);

					console.log('Balance of ' + addressToCheck + ': ' + newBalance);
					// Exclude any masternode amounts TODO_ADOT_HIGH exclusion for MNs
					if (newBalance < constants.DUST_AMOUNT_IN_ADOT) newBalance = 0;

					var addressBalance = {};
					addressBalance[addressToCheck] = newBalance;
					updateAddressBalances(addressBalance);
				}
			})
			.catch((error) => console.log(error));
	};

	const addLastAddress = (lastAddress) => {
		var lastAddressBalance = {};
		lastAddressBalance[lastAddress] = 0;
		updateAddressBalances(lastAddressBalance);
		setState({ ...state, lastAddress: lastAddress });
	};

	const getUnusedAddress = () => {
		if (state.password && state.password.length >= 8 && hdSeedE) {
			var hdS = onDecrypt(hdSeedE, state.password);
			if (hdS === '')
				return 'Unable to obtain unused address, the wallet seed cannot be reconstructed!';
			var mnemonic = new Mnemonic(hdS);
			var xpriv = mnemonic.toHDPrivateKey();
			var lastAddress = xpriv
				.derive("m/44'/5'/0'/0/" + Object.keys(addressBalances).length)
				.privateKey.toAddress()
				.toString();
			addLastAddress(lastAddress);
		} else {
			showPasswordDialog.current.show();
		}
	};

	const scanWalletAddresses = (numberAddresses) => {
		var walletAddresses = {};

		if (state.password && state.password.length >= 8 && hdSeedE) {
			var hdS = onDecrypt(hdSeedE, state.password);
			if (hdS === '')
				return 'Unable to obtain unused address, the wallet seed cannot be reconstructed!';
			var mnemonic = new Mnemonic(hdS);
			var xpriv = mnemonic.toHDPrivateKey();

			for (var i = 0; i < numberAddresses; i++) {
				var nextAddress = xpriv
					.derive("m/44'/5'/0'/0/" + i)
					.privateKey.toAddress()
					.toString();
				walletAddresses[nextAddress] = 0;
			}

			updateAddressBalances(walletAddresses);
			setState({ ...state, scanWallet: false });
			setTimeout(balanceCheck, 1000); // necessary delay as setting the state is async
		} else {
			setState({ ...state, scanWallet: true });
			showPasswordDialog.current.show();
		}
	};

	const getSelectedCurrencyAlterdotPrice = () => {
		return selectedCurrency === 'EUR' ? priceEur : selectedCurrency === 'GBP' ? priceGbp : priceUsd;
	};

	const getPrivateSendBalance = () => {
		var mixedAmount = 0;
		for (var key of Object.keys(addressBalances)) {
			var amount = addressBalances[key];
			// check for supported denominations
			if (
				amount === 0.00100001 ||
				amount === 0.0100001 ||
				amount === 0.100001 ||
				amount === 1.00001 ||
				amount === 10.0001
			)
				mixedAmount += amount;
		}
		return mixedAmount.toFixed(8);
	};

	const onEnteredPassword = () => {
		showPasswordDialog.current.hide();

		if (state.scanWallet) scanWalletAddresses(10);
		else getUnusedAddress();
	};

	return (
		<div id="main" className="main_dashboard_otr">
			<h1>Wallet</h1>
			<div className="main-left">
				<Send
					explorer={explorer}
					popupDialog={popupDialog}
					addressBalances={addressBalances}
					hdSeedE={hdSeedE}
					getSelectedCurrencyAlterdotPrice={getSelectedCurrencyAlterdotPrice}
					selectedCurrency={selectedCurrency}
					isCorrectPasswordHash={isCorrectPasswordHash}
					getUnusedAddress={getUnusedAddress}
					totalBalance={totalBalance}
					addresses={Object.keys(addressBalances)}
					showNumber={showNumber}
					showAlterdotNumber={showAlterdotNumber}
					onDecrypt={onDecrypt}
					addTransaction={addTransaction}
					setRememberedPassword={(rememberPassword) =>
						setState({ ...state, password: rememberPassword })
					}
					balanceCheck={balanceCheck}
					isValidAlterdotAddress={isValidAlterdotAddress}
					updateBalanceAddressStorage={updateBalanceAddressStorage}
				/>
				<Transactions
					explorer={explorer}
					transactions={state.transactions}
					getSelectedCurrencyAlterdotPrice={getSelectedCurrencyAlterdotPrice}
					selectedCurrency={selectedCurrency}
					showAlterdotNumber={showAlterdotNumber}
					showNumber={showNumber}
				/>
			</div>
			<div className="main-right">
				<Balances
					totalBalance={totalBalance}
					privateSendBalance={getPrivateSendBalance()}
					showNumber={showNumber}
					setMode={setMode}
					getSelectedCurrencyAlterdotPrice={getSelectedCurrencyAlterdotPrice}
					selectedCurrency={selectedCurrency}
				/>
				<Receive
					explorer={explorer}
					lastAddress={state.lastAddress}
					getUnusedAddress={getUnusedAddress}
					scanWalletAddresses={scanWalletAddresses}
					addressBalances={addressBalances}
					reversedAddresses={Object.keys(addressBalances).slice().reverse()}
					showAlterdotNumber={showAlterdotNumber}
				/>
			</div>
			<div className="circle1"></div> {/* TODO_ADOT_MEDIUM move to background */}
			<div className="circle2"></div>
			<div className="circle3"></div>
			<SkyLight
				dialogStyles={popupDialog}
				hideOnOverlayClicked
				ref={showPasswordDialog}
				title="Enter your password"
			>
				<p className="mt-3 mb-1">Your password is required to generate or scan wallet addresses.</p>
				<input
					type="password"
					autoFocus={true}
					style={{ borderBottom: '1px solid gray', fontSize: '16px' }}
					value={state.password}
					onChange={(e) => setState({ ...state, password: e.target.value })}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							onEnteredPassword();
						}
					}}
				/>
				<button
					className="mt-3"
					onClick={() => {
						onEnteredPassword();
					}}
				>
					Ok
				</button>
			</SkyLight>
			<NotificationContainer />
		</div>
	);
};

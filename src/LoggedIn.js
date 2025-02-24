﻿import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import update from 'immutability-helper'
import { Balances } from './Balances'
import { Send } from './Send'
import { Receive } from './Receive'
import { Transactions } from './Transactions'
import { Mnemonic } from 'alterdot-lib'
import SkyLight from 'react-skylight'
import { NotificationContainer, NotificationManager } from 'react-notifications'
import 'react-notifications/lib/notifications.css'
import * as constants from './constants.js'

export class LoggedIn extends Component {
	constructor(props) {
		super(props)
		this.state = {
			selectedCurrency: 'USD',
			addresses: props.addresses,
			transactions: [],
			skipInitialTransactionsNotifications: true,
			skipEmptyAddresses: false, // TODO_ADOT_MEDIUM not needed as we don't create new addresses continuously
			password: props.rememberPassword || '',
			lastUnusedAddress:
				props.addresses && props.addresses.length > 0
					? props.addresses[props.addresses.length - 1]
					: '',
		}
		for (var address of props.addresses)
			if (this.isValidAlterdotAddress(address)) props.addressBalances[address] = 0;
		this.updatingBalanceController = new window.AbortController();
		var component = this
		this.skipInitialTxInterval = setTimeout(() => {
			component.setState({ skipInitialTransactionsNotifications: false })
		}, 11873)
		this.skipEmptyAddressesInterval = setTimeout(() => {
			// Only check empty old addresses after 1 minute, then they are not longer checked
			component.setState({ skipEmptyAddresses: false })
		}, 70000)
	}
	componentDidMount() {
		this.checkAndRestoreBalances(this.props.addresses);
		this.fillTransactions(this.props.addresses);

		if (this.props.totalBalance * this.props.priceUsd > 100)
			this.hdWalletTooMuchBalanceWarning.show();
	}
	componentWillUnmount() {
		clearInterval(this.skipInitialTxInterval)
		clearInterval(this.skipEmptyAddressesInterval)
		clearInterval(this.updateBalanceInterval)
		if (this.updatingBalanceController) this.updatingBalanceController.abort();
	}
	addTransaction = tx => {
		// If we already got this tx, there is nothing we need to do, new ones are just added on top
		for (var existingTx of this.state.transactions) if (existingTx.id === tx.id) return
		// Must be updated with state, see https://jsbin.com/mofekakuqi/7/edit?js,output
		this.setState(state => update(state, { transactions: { $push: [tx] } }))
		if (
			!this.state.skipInitialTransactionsNotifications &&
			tx.amountChange > 0 &&
			tx.amountChange !== this.lastAmountChange
		) {
			this.lastAmountChange = tx.amountChange
			NotificationManager.warning(
				'Incoming transaction',
				'+' + this.showAlterdotNumber(tx.amountChange)
			)
		}
	}
	showAlterdotNumber = amount => {
		return this.props.showNumber(amount, 8) + ' ADOT'
	}
	fillTransactionFromAddress = address => {
		fetch(
			'https://' + this.props.explorer + '/insight-api/txs/?address=' + address,
			{
				mode: 'cors',
				cache: 'no-cache',
			})
			.then(response => response.json())
			.then(data => {
				const txs = data.txs;
				for (var index = 0; index < txs.length; index++) {
					const tx = txs[index];
					var time = new Date(tx['time'] * 1000);
					var amountChange = 0;
					const vin = tx['vin'];
					for (var i = 0; i < vin.length; i++)
						if (this.isOwnAddress(vin[i]['addr'], address))
							amountChange -= parseFloat(vin[i]['value']);
					const vout = tx['vout']
					for (var j = 0; j < vout.length; j++)
						if (this.isOwnAddress(vout[j]['scriptPubKey']['addresses'][0], address))
							amountChange += parseFloat(vout[j]['value']);
					this.addTransaction({
						id: tx.txid,
						amountChange: amountChange,
						time: time,
						confirmations: tx.confirmations,
						size: tx.size,
						fees: tx.fees,
						txlock: tx.txlock,
					});
				}
			})
	}
	isOwnAddress = (addressToCheck, sendAddress) => {
		if (addressToCheck === sendAddress) return true;
		return this.state.addresses.includes(addressToCheck);
	}
	fillTransactions = addresses => {
		for (var address of addresses) this.fillTransactionFromAddress(address);
	}
	// Loops through all known Alterdot addresses and checks the balance and sums up to total amount we got
	balanceCheck = () => {
		console.log("balanceCheck addressBalances", this.props.addressBalances);
		for (var addressToCheck of Object.keys(this.props.addressBalances))
			if (this.isValidAlterdotAddress(addressToCheck))
				this.updateAddressBalance(addressToCheck, this.props.addressBalances[addressToCheck]);
		
		this.updateLocalStorageBalancesAndRefreshTotalAmountAndReceivingAddresses();
	}
	isValidAlterdotAddress = address => {
		return (
			address &&
			address.length >= 34 &&
			(address[0] === 'C' || address[0] === '5')
		)
	}
	updateAddressBalance = (addressToCheck, oldBalance) => {
		var component = this;
		fetch(
			'https://' + this.props.explorer + '/insight-api/addr/' + addressToCheck,
			{
				mode: 'cors',
				cache: 'no-cache',
				signal: this.updatingBalanceController.signal,
			})
			.then(response => response.json())
			.then(data => {
				if (data && !isNaN(data.balance)) {
					var newBalance = parseFloat(data.balance);
					if (!isNaN(data.unconfirmedBalance)) newBalance += parseFloat(data.unconfirmedBalance);
					if (!oldBalance || newBalance !== oldBalance) {
						if (oldBalance && oldBalance > 0)
							console.log('Updating balance of ' + addressToCheck + ': ' + newBalance);
						// Exclude any masternode amounts TODO_ADOT_MEDIUM exclusion for MNs
						if (newBalance !== 10000) component.props.addressBalances[addressToCheck] = newBalance;
						if (component.props.addressBalances[addressToCheck] < constants.DUST_AMOUNT_IN_ADOT)
							component.props.addressBalances[addressToCheck] = 0
					}
				}
			})
			.catch(error => console.log(error));
	}
	addLastAddress = lastAddress => {
		var addresses = this.state.addresses;
		addresses.push(lastAddress);
		this.props.addressBalances[lastAddress] = 0;
		this.setState({ addresses: addresses, lastUnusedAddress: lastAddress });
		return addresses;
	}
	updateLocalStorageBalances = () => {
		var totalAmount = 0;
		var cachedText = '';
		for (var key of Object.keys(this.props.addressBalances))
			if (this.isValidAlterdotAddress(key)) {
				var amount = this.props.addressBalances[key];
				totalAmount += amount;
				cachedText += key + '|' + amount + '|';
			}
		localStorage.setItem('addressBalances', cachedText);
		return totalAmount.toFixed(8);
	}
	updateLocalStorageBalancesAndRefreshTotalAmountAndReceivingAddresses = () => {
		var totalAmount = this.updateLocalStorageBalances();
		if (this.props.totalBalance !== totalAmount) {
			if (totalAmount > this.props.totalBalance)
				NotificationManager.info(
					'Successfully updated balance: ' + this.showAlterdotNumber(totalAmount)
				)
			this.props.onUpdateBalanceAndAddressesStorage(
				totalAmount,
				Object.keys(this.props.addressBalances)
			)
		}
		this.fillTransactions(Object.keys(this.props.addressBalances))
	}
	checkAndRestoreBalances = addresses => {
		// Check if we were on this address the last time too, then we can use cached data
		var cachedAddressBalances = localStorage.getItem('addressBalances');
		//https://stackoverflow.com/questions/1208222/how-to-do-associative-array-hashing-in-javascript
		var firstAddress = addresses[0];
		// Was cached and still on the same wallet as last time? Then restore all known address balances
		if (cachedAddressBalances) {
			var parts = cachedAddressBalances.split('|');
			if (firstAddress === parts[0]) { // check first address so we're on the same wallet
				for (var i = 0; i < parts.length / 2; i++)
					if (parts[i * 2].length > 0)
						this.props.addressBalances[parts[i * 2]] = parseFloat(parts[i * 2 + 1])
			}
		}
		var component = this;
		this.updateBalanceInterval = setInterval(() => component.balanceCheck(), 20000)
	}
	fillTransactionFromId = (txId, txIndex) => {
		if (!txId) return;
		fetch(
			'https://' + this.props.explorer + '/insight-api/tx/' + txId,
			{
				mode: 'cors',
				cache: 'no-cache',
			})
			.then(response => response.json())
			.then(tx => {
				this.addTransaction({
					id: txId,
					amountChange: parseFloat(tx.vout[txIndex]['value']),
					time: new Date(tx['time'] * 1000),
					confirmations: tx.confirmations,
					size: tx.size,
					fees: tx.fees,
					txlock: tx.txlock,
				});
			})
	}
	getUnusedAddress = () => {
		if (this.state.password && this.state.password.length >= 8 && this.props.hdSeedE) {
			var hdS = this.props.onDecrypt(this.props.hdSeedE, this.state.password)
			if (hdS === '')
				return 'Unable to obtain unused address, the wallet seed cannot be reconstructed!'
			var mnemonic = new Mnemonic(hdS)
			var xpriv = mnemonic.toHDPrivateKey()
			var lastAddress = xpriv
				.derive("m/44'/5'/0'/0/" + this.state.addresses.length)
				.privateKey.toAddress()
				.toString()
			var addresses = this.addLastAddress(lastAddress);
			this.props.onUpdateBalanceAndAddressesStorage(this.props.totalBalance, addresses)
		} else {
			this.showPasswordDialog.show();
		}
	}
	scanWalletAddresses = (numberAddresses) => {
		var walletAddresses = [];
		
		if (this.state.password && this.state.password.length >= 8 && this.props.hdSeedE) {
			var hdS = this.props.onDecrypt(this.props.hdSeedE, this.state.password)
			if (hdS === '')
				return 'Unable to obtain unused address, the wallet seed cannot be reconstructed!'
			var mnemonic = new Mnemonic(hdS)
			var xpriv = mnemonic.toHDPrivateKey()
			
			for (var i = 0; i < numberAddresses; i++) {
				var nextAddress = xpriv.derive("m/44'/5'/0'/0/" + i)
									.privateKey.toAddress()
									.toString();
				walletAddresses.push(nextAddress);
			}

			this.props.onUpdateBalanceAndAddressesStorage(this.props.totalBalance, walletAddresses)
		} else {
			this.showPasswordDialog.show(); // this goes into getUnusedAddress
		}
	}
	getSelectedCurrencyAlterdotPrice = () => {
		return this.state.selectedCurrency === 'EUR'
			? this.props.priceEur
			: this.state.selectedCurrency === 'GBP'
			? this.props.priceGbp
			: this.props.priceUsd
	}
	getPrivateSendBalance = () => {
		var mixedAmount = 0
		for (var key of Object.keys(this.props.addressBalances)) {
			var amount = this.props.addressBalances[key]
			// check for supported denominations
			if (
				amount === 0.00100001 ||
				amount === 0.0100001 ||
				amount === 0.100001 ||
				amount === 1.00001 ||
				amount === 10.0001
			)
				mixedAmount += amount
		}
		return mixedAmount.toFixed(8)
	}
	render() {
		return (
			<div id="main" className="main_dashboard_otr">
				<h1>{this.props.unlockedText}</h1>
				<div className='main-left'>
					<Send
						explorer={this.props.explorer}
						popupDialog={this.props.popupDialog}
						addressBalances={this.props.addressBalances}
						hdSeedE={this.props.hdSeedE}
						getSelectedCurrencyAlterdotPrice={this.getSelectedCurrencyAlterdotPrice}
						selectedCurrency={this.state.selectedCurrency}
						isCorrectPasswordHash={this.props.isCorrectPasswordHash}
						getUnusedAddress={this.getUnusedAddress}
						totalBalance={this.props.totalBalance}
						addresses={this.state.addresses}
						showNumber={this.props.showNumber}
						showAlterdotNumber={this.showAlterdotNumber}
						onDecrypt={this.props.onDecrypt}
						addTransaction={this.addTransaction}
						setRememberedPassword={rememberPassword => this.setState({ password: rememberPassword })}
						isValidAlterdotAddress={this.isValidAlterdotAddress}
						onUpdateBalanceAndAddressesStorage={this.props.onUpdateBalanceAndAddressesStorage}
						setNewTotalBalance={newBalance =>
							this.props.onUpdateBalanceAndAddressesStorage(newBalance, this.state.addresses)
						}
					/>
					<Transactions
						explorer={this.props.explorer}
						transactions={this.state.transactions}
						getSelectedCurrencyAlterdotPrice={this.getSelectedCurrencyAlterdotPrice}
						selectedCurrency={this.state.selectedCurrency}
						showAlterdotNumber={this.showAlterdotNumber}
						showNumber={this.props.showNumber}
					/>
				</div>
				<div className='main-right'>
					<Balances
						totalBalance={this.props.totalBalance}
						privateSendBalance={this.getPrivateSendBalance()}
						showNumber={this.props.showNumber}
						setMode={this.props.setMode}
						getSelectedCurrencyAlterdotPrice={this.getSelectedCurrencyAlterdotPrice}
						selectedCurrency={this.state.selectedCurrency}
						setSelectedCurrency={value => this.setState({ selectedCurrency: value })}
					/>
					<Receive
						explorer={this.props.explorer}
						lastUnusedAddress={this.state.lastUnusedAddress}
						getUnusedAddress={this.getUnusedAddress}
						scanWalletAddresses={this.scanWalletAddresses}
						addressBalances={this.props.addressBalances}
						reversedAddresses={this.state.addresses.slice().reverse()}
						showAlterdotNumber={this.showAlterdotNumber}
					/>
				</div>
				<div className='circle1'></div> {/* TODO_ADOT_MEDIUM move to background */}
				<div className='circle2'></div>
				<div className='circle3'></div>
				<SkyLight
					dialogStyles={this.props.popupDialog}
					hideOnOverlayClicked
					ref={ref => (this.showPasswordDialog = ref)}
					title="Enter your HD Wallet password"
				>
					<br />
					Your password is required to login and generate your next HD wallet address.
					<input
						type="password"
						autoFocus={true}
						style={{ borderBottom: '1px solid gray', fontSize: '16px' }}
						value={this.state.password}
						onChange={e => this.setState({ password: e.target.value })}
						onKeyDown={e => {
							if (e.key === 'Enter') {
								this.showPasswordDialog.hide();
								this.getUnusedAddress();
							}
						}}
					/>
					<br />
					<br />
					<button
						onClick={() => {
							this.showPasswordDialog.hide();
							this.getUnusedAddress();
						}}
					>
						Ok
					</button>
				</SkyLight>
				<SkyLight
					dialogStyles={this.props.popupDialog}
					hideOnOverlayClicked
					ref={ref => (this.hdWalletTooMuchBalanceWarning = ref)}
					title="Too many funds, use a hardware wallet!"
				>
					<br />
					You have too many funds on your HD Wallet in your browser. This is considered{' '}
					<Link to="/help" onClick={() => this.props.setMode('help')}>
						dangerous
					</Link>
					, only continue if you know what you are doing and are very careful.{' '}
					<a
						href="https://old.mydashwallet.org/AboutHardwareWallets"
						target="_blank"
						rel="noopener noreferrer"
					>
						Please consider using a hardware wallet
					</a>{' '}
					to protect your funds or simply split up your funds into long term storage and only keep a
					small amount here for daily use.
					<br />
					<br />
					<button onClick={() => this.hdWalletTooMuchBalanceWarning.hide()}>Ok</button>
				</SkyLight>
				<NotificationContainer />
			</div>
		)
	}
}

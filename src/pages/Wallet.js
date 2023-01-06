import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import update from 'immutability-helper';
import { Balances } from '../cards/Balances';
import { Send } from '../cards/Send';
import { Receive } from '../cards/Receive';
import { Transactions } from '../cards/Transactions';
import { Mnemonic } from 'alterdot-lib';
import SkyLight from 'react-skylight';
import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';
import * as constants from '../constants/network.js';

export class Wallet extends Component {
	constructor(props) {
		super(props);
		this.state = {
			transactions: [],
			skipInitialTransactionsNotifications: true,
			scanWallet: false,
			skipEmptyAddresses: false, // TODO_ADOT_MEDIUM not needed as we don't create new addresses continuously
			password: props.rememberPassword || '',
			lastAddress:
				props.addressBalances && Object.keys(props.addressBalances).length > 0
					? Object.keys(props.addressBalances)[0]
					: '',
		};
		this.updatingBalanceController = new window.AbortController();
		var component = this;
		this.skipInitialTxInterval = setTimeout(() => {
			component.setState({ skipInitialTransactionsNotifications: false });
		}, 11873);
		this.skipEmptyAddressesInterval = setTimeout(() => {
			// Only check empty old addresses after 1 minute, then they are not longer checked
			component.setState({ skipEmptyAddresses: false });
		}, 70000);
	}

	componentDidMount() {
		var component = this;
		this.updateBalanceInterval = setInterval(() => component.balanceCheck(), 20000);

		if (this.props.totalBalance * this.props.priceUsd > 100)
			this.hdWalletTooMuchBalanceWarning.show();

		this.fillTransactions(Object.keys(this.props.addressBalances));
	}

	componentDidUpdate(prevProps) {
		let sizeAddressBalances = Object.keys(this.props.addressBalances).length;
		let prevSizeAddressBalances = Object.keys(prevProps.addressBalances).length;

		if (sizeAddressBalances !== prevSizeAddressBalances) {
			this.fillTransactions(Object.keys(this.props.addressBalances));
			this.setState({
				lastAddress: Object.keys(this.props.addressBalances)[sizeAddressBalances - 1],
			});
		}
	}

	componentWillUnmount() {
		clearInterval(this.skipInitialTxInterval);
		clearInterval(this.skipEmptyAddressesInterval);
		clearInterval(this.updateBalanceInterval);
		if (this.updatingBalanceController) this.updatingBalanceController.abort();
	}

	addTransaction = (tx) => {
		// If we already got this tx, there is nothing we need to do, new ones are just added on top
		for (var existingTx of this.state.transactions) if (existingTx.id === tx.id) return;
		// Must be updated with state, see https://jsbin.com/mofekakuqi/7/edit?js,output
		this.setState((state) => update(state, { transactions: { $push: [tx] } }));
		if (
			!this.state.skipInitialTransactionsNotifications &&
			tx.amountChange > 0 &&
			tx.amountChange !== this.lastAmountChange
		) {
			this.lastAmountChange = tx.amountChange;
			NotificationManager.warning(
				'Incoming transaction',
				'+' + this.showAlterdotNumber(tx.amountChange)
			);
		}
	};

	showAlterdotNumber = (amount) => {
		return this.props.showNumber(amount, 8) + ' ADOT';
	};

	fillTransactionFromAddress = (address) => {
		// TODO_ADOT_HIGH get transactions from all addresses in one request, can be paginated
		fetch('https://' + this.props.explorer + '/insight-api/txs/?address=' + address, {
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
						if (this.isOwnAddress(vin[i]['addr'], address))
							amountChange -= parseFloat(vin[i]['value']);
					const vout = tx['vout'];
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
			});
	};
	isOwnAddress = (addressToCheck, sendAddress) => {
		if (addressToCheck === sendAddress) return true;
		return Object.keys(this.props.addressBalances).includes(addressToCheck);
	};
	fillTransactions = (addresses) => {
		for (var address of addresses) this.fillTransactionFromAddress(address);
	};
	// Loops through all known Alterdot addresses and checks the balance and sums up to total amount we got
	balanceCheck = () => {
		for (var addressToCheck of Object.keys(this.props.addressBalances))
			if (this.isValidAlterdotAddress(addressToCheck)) {
				this.updateAddressBalance(addressToCheck);
				this.fillTransactionFromAddress(addressToCheck);
			}
	};
	isValidAlterdotAddress = (address) => {
		// TODO_ADOT_MEDIUM extract common utility functions
		return address && address.length >= 34 && (address[0] === 'C' || address[0] === '5');
	};
	updateAddressBalance = (addressToCheck) => {
		var component = this;
		fetch('https://' + this.props.explorer + '/insight-api/addr/' + addressToCheck, {
			mode: 'cors',
			cache: 'no-cache',
			signal: this.updatingBalanceController.signal,
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
					component.props.updateAddressBalances(addressBalance);
				}
			})
			.catch((error) => console.log(error));
	};
	addLastAddress = (lastAddress) => {
		var lastAddressBalance = {};
		lastAddressBalance[lastAddress] = 0;
		this.props.updateAddressBalances(lastAddressBalance);
		this.setState({ lastAddress: lastAddress });
	};
	fillTransactionFromId = (txId, txIndex) => {
		if (!txId) return;
		fetch('https://' + this.props.explorer + '/insight-api/tx/' + txId, {
			mode: 'cors',
			cache: 'no-cache',
		})
			.then((response) => response.json())
			.then((tx) => {
				this.addTransaction({
					id: txId,
					amountChange: parseFloat(tx.vout[txIndex]['value']),
					time: new Date(tx['time'] * 1000),
					confirmations: tx.confirmations,
					size: tx.size,
					fees: tx.fees,
					txlock: tx.txlock,
				});
			});
	};
	getUnusedAddress = () => {
		if (this.state.password && this.state.password.length >= 8 && this.props.hdSeedE) {
			var hdS = this.props.onDecrypt(this.props.hdSeedE, this.state.password);
			if (hdS === '')
				return 'Unable to obtain unused address, the wallet seed cannot be reconstructed!';
			var mnemonic = new Mnemonic(hdS);
			var xpriv = mnemonic.toHDPrivateKey();
			var lastAddress = xpriv
				.derive("m/44'/5'/0'/0/" + Object.keys(this.props.addressBalances).length)
				.privateKey.toAddress()
				.toString();
			this.addLastAddress(lastAddress);
		} else {
			this.showPasswordDialog.show();
		}
	};
	scanWalletAddresses = (numberAddresses) => {
		var walletAddresses = {};

		if (this.state.password && this.state.password.length >= 8 && this.props.hdSeedE) {
			var hdS = this.props.onDecrypt(this.props.hdSeedE, this.state.password);
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

			this.props.updateAddressBalances(walletAddresses);
			this.setState({ scanWallet: false });
			setTimeout(this.balanceCheck, 1000); // necessary delay as setting the state is async
		} else {
			this.setState({ scanWallet: true });
			this.showPasswordDialog.show();
		}
	};
	getSelectedCurrencyAlterdotPrice = () => {
		return this.props.selectedCurrency === 'EUR'
			? this.props.priceEur
			: this.props.selectedCurrency === 'GBP'
			? this.props.priceGbp
			: this.props.priceUsd;
	};
	getPrivateSendBalance = () => {
		var mixedAmount = 0;
		for (var key of Object.keys(this.props.addressBalances)) {
			var amount = this.props.addressBalances[key];
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
	render() {
		return (
			<div id="main" className="main_dashboard_otr">
				<h1>Wallet</h1>
				<div className="main-left">
					<Send
						explorer={this.props.explorer}
						popupDialog={this.props.popupDialog}
						addressBalances={this.props.addressBalances}
						hdSeedE={this.props.hdSeedE}
						getSelectedCurrencyAlterdotPrice={this.getSelectedCurrencyAlterdotPrice}
						selectedCurrency={this.props.selectedCurrency}
						isCorrectPasswordHash={this.props.isCorrectPasswordHash}
						getUnusedAddress={this.getUnusedAddress}
						totalBalance={this.props.totalBalance}
						addresses={Object.keys(this.props.addressBalances)}
						showNumber={this.props.showNumber}
						showAlterdotNumber={this.showAlterdotNumber}
						onDecrypt={this.props.onDecrypt}
						addTransaction={this.addTransaction}
						setRememberedPassword={(rememberPassword) =>
							this.setState({ password: rememberPassword })
						}
						balanceCheck={this.balanceCheck}
						isValidAlterdotAddress={this.isValidAlterdotAddress}
						updateBalanceAddressStorage={this.props.updateBalanceAddressStorage}
					/>
					<Transactions
						explorer={this.props.explorer}
						transactions={this.state.transactions}
						getSelectedCurrencyAlterdotPrice={this.getSelectedCurrencyAlterdotPrice}
						selectedCurrency={this.props.selectedCurrency}
						showAlterdotNumber={this.showAlterdotNumber}
						showNumber={this.props.showNumber}
					/>
				</div>
				<div className="main-right">
					<Balances
						totalBalance={this.props.totalBalance}
						privateSendBalance={this.getPrivateSendBalance()}
						showNumber={this.props.showNumber}
						setMode={this.props.setMode}
						getSelectedCurrencyAlterdotPrice={this.getSelectedCurrencyAlterdotPrice}
						selectedCurrency={this.props.selectedCurrency}
					/>
					<Receive
						explorer={this.props.explorer}
						lastAddress={this.state.lastAddress}
						getUnusedAddress={this.getUnusedAddress}
						scanWalletAddresses={this.scanWalletAddresses}
						addressBalances={this.props.addressBalances}
						reversedAddresses={Object.keys(this.props.addressBalances).slice().reverse()}
						showAlterdotNumber={this.showAlterdotNumber}
					/>
				</div>
				<div className="circle1"></div> {/* TODO_ADOT_MEDIUM move to background */}
				<div className="circle2"></div>
				<div className="circle3"></div>
				<SkyLight
					dialogStyles={this.props.popupDialog}
					hideOnOverlayClicked
					ref={(ref) => (this.showPasswordDialog = ref)}
					title="Enter your HD Wallet password"
				>
					<br />
					Your password is required to login and generate your next HD wallet addresses.
					<input
						type="password"
						autoFocus={true}
						style={{ borderBottom: '1px solid gray', fontSize: '16px' }}
						value={this.state.password}
						onChange={(e) => this.setState({ password: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								this.onEnteredPassword();
							}
						}}
					/>
					<br />
					<br />
					<button
						onClick={() => {
							this.onEnteredPassword();
						}}
					>
						Ok
					</button>
				</SkyLight>
				<SkyLight
					dialogStyles={this.props.popupDialog}
					hideOnOverlayClicked
					ref={(ref) => (this.hdWalletTooMuchBalanceWarning = ref)}
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
		);
	}

	onEnteredPassword() {
		this.showPasswordDialog.hide();

		if (this.state.scanWallet) this.scanWalletAddresses(10);
		else this.getUnusedAddress();
	}
}

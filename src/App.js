import React, { Component } from 'react'
import { Menu } from './Menu'
import { Domains } from './Domains'
import { Help } from './Help'
import { Settings } from './Settings'
import { LoggedIn } from './LoggedIn'
import { Login } from './Login'
import CryptoJS from 'crypto-js'
import { Mnemonic } from 'alterdot-lib'
import ReactGA from 'react-ga'
import styled from 'styled-components'
import './all.css'
import * as constants from './constants.js'

const PageContainer = styled.div`
	background: linear-gradient(to top right, #ed5a2d, #c1616e);
    border-radius: 40px;
    height: 88vh;
    width: 88vw;
	@media screen and (max-width: 1200px) {
		.register_mn_otr {
			position: relative;
		}
	}
`
/*const AlterdotPricePanel = styled.div`
	color: #3778b9;
	-webkit-box-flex: 1;
	-webkit-flex: 1 auto;
	-ms-flex: 1 auto;
	text-align: right;
	display: -webkit-box;
	display: -webkit-flex;
	display: -ms-flexbox;
	display: flex;
	-webkit-box-orient: horizontal;
	-webkit-box-direction: normal;
	-webkit-flex-flow: row wrap;
	-ms-flex-flow: row wrap;
	flex-flow: row wrap;
	-webkit-box-pack: end;
	-webkit-justify-content: flex-end;
	-ms-flex-pack: end;
	justify-content: flex-end;
	-webkit-box-align: center;
	-webkit-align-items: center;
	-ms-flex-align: center;
	align-items: center;
	position: absolute;
	top: 0;
	right: 0;
	float: right;
	text-align: right;
	font-size: 13px;
	div {
		width: 75px;
		margin-top: 5px;
		margin-right: 10px;
	}
`*/
const MainContainer = styled.div`
	display: inline-block;
	vertical-align: middle;
	margin-left: -3px;
	width: ${props => (props.collapsed ? '86%' : props.isSmallScreen ? '97%' : '80%')};
	height: 100%;
	padding-top: 30px;
	padding-left: 50px;
	padding-right: 40px;
	@media screen and (max-width: 1200px) {
		padding-left: 30px;
		padding-right: 20px;
	}
	@media screen and (max-width: 767px) {
		padding-left: 20px;
		padding-right: 0;
	}
`
const Loader = styled.div`
	border-radius: 50%;
	width: 10em;
	height: 10em;
	font-size: 10px;
	position: absolute;
	border-top: 1.1em solid rgba(0, 141, 228, 0.2);
	border-right: 1.1em solid rgba(0, 141, 228, 0.2);
	border-bottom: 1.1em solid rgba(0, 141, 228, 0.2);
	border-left: 1.1em solid #f1592a;
	-webkit-transform: translateZ(0);
	-ms-transform: translateZ(0);
	transform: translateZ(0);
	-webkit-animation: load8 1.1s infinite linear;
	animation: load8 1.1s infinite linear;
	left: 55%;
	top: 40%;
	padding: 30px;
	padding-left: 25px;
`

export default class App extends Component {
	constructor(props) {
		super(props);
		var lastLoginTime = localStorage.getItem('lastLoginTime');
		var encryptedPasswordHash = localStorage.getItem('encryptedPasswordHash');
		var hdSeedE = localStorage.getItem('hdSeedE');

		var yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		// Max. keep cache 24 hours!
		if (
			lastLoginTime &&
			new Date(parseInt(lastLoginTime)) > yesterday &&
			encryptedPasswordHash &&
			hdSeedE
		) {
			this.state = {
				priceUsd: 0.02,
				priceEur: 0.018,
				priceGbp: 0.015,
				priceBtc: 0.00000040,
				addressBalances: {},
				totalBalance: 0,
				encryptedPasswordHash: encryptedPasswordHash,
				hdSeedE: hdSeedE,
				loading: false,
				mode: this.getModeFromUrl(),
				collapsed: window.innerWidth < 768,
				explorer: 'insight.alterdot.network',
			};
		} else
			this.state = {
				priceUsd: 0.02,
				priceEur: 0.018,
				priceGbp: 0.015,
				priceBtc: 0.00000040,
				addressBalances: {},
				totalBalance: 0,
				hdSeedE: hdSeedE, // allows login from stored encrypted seed, password is unknown so it must match the hash
				mode: this.getModeFromUrl(),
				collapsed: window.innerWidth < 768,
				explorer: 'insight.alterdot.network',
			};
		
		window.onpopstate = () => {
			if (this.state.mode !== this.getModeFromUrl()) this.setMode(this.getModeFromUrl());
		};
		window.onpushstate = () => {
			if (this.state.mode !== this.getModeFromUrl()) this.setMode(this.getModeFromUrl());
		};
		
		/*will happen for too many users with adblockers on
		fetch('https://api.coinmarketcap.com/v1/ticker/dash?convert=EUR')
			.then(response => response.json())
			.then(data => {
				this.setState({
					priceUsd: data[0].price_usd,
					priceEur: data[0].price_eur,
					priceGbp: data[0].price_eur*0.89,
					priceBtc: data[0].price_btc,
				})
			}).catch(function () {
				*/
		// If coinmarketcap api was blocked by adblocker or is not longer responding prices, use fallback
		//https://stackoverflow.com/questions/54904517/coinmarketcap-api-blocked-by-adblock
		// TODO_ADOT_MEDIUM
		/*
		fetch('https://old.mydashwallet.org/getPrice', {
			mode: 'cors',
			cache: 'no-cache',
		})
			.then(response => response.json())
			.then(data => {
				this.setState({
					priceUsd: data.price_usd,
					priceEur: data.price_eur,
					priceGbp: data.price_gbp,
					priceBtc: data.price_btc,
				})
			})
		//})*/
		ReactGA.initialize('UA-25232431-3')
		ReactGA.pageview('/')
	}
	componentDidMount = () => {
		this.restoreAddressesAndTotalBalance();
	}
	updateLocalStorageAddressesAndTotalBalance = () => {
		var totalAmount = 0;
		var cachedText = '';
		for (var address of Object.keys(this.state.addressBalances))
			if (this.isValidAlterdotAddress(address)) {
				var amount = this.state.addressBalances[address];
				totalAmount += amount;
				cachedText += address + '|' + amount + '|';
			}
		localStorage.setItem('addressBalances', cachedText);
		if (parseFloat(totalAmount.toFixed(8)) !== this.state.totalBalance)
			console.log("Calculated total balance of addresses different from state.", totalAmount.toFixed(8), this.state.totalBalance);
		localStorage.setItem('totalBalance', totalAmount.toFixed(8));
	}
	// TODO_ADOT_HIGH move to constructor 
	restoreAddressesAndTotalBalance = () => {
		// Check if we were on this address the last time too, then we can use cached data
		var cachedAddressBalances = localStorage.getItem('addressBalances');
		var cachedTotalBalance = localStorage.getItem('totalBalance');
		//https://stackoverflow.com/questions/1208222/how-to-do-associative-array-hashing-in-javascript
		var restoredAddressBalances = {};
		var restoredTotalBalance = 0;
		// Was cached and still on the same wallet as last time? Then restore all known address balances.
		if (cachedAddressBalances) {
			var parts = cachedAddressBalances.split('|');
			for (var i = 0; i < parts.length / 2; i++)
				if (parts[i * 2].length > 0) {
					var balance = parseFloat(parts[i * 2 + 1]);
					restoredAddressBalances[parts[i * 2]] = balance;
					restoredTotalBalance += balance;
				}
		}
		console.log("restoredAddressBalances", restoredAddressBalances);
		restoredTotalBalance = parseFloat(restoredTotalBalance.toFixed(8));
		cachedTotalBalance = parseFloat(cachedTotalBalance);
		if (restoredTotalBalance !== cachedTotalBalance)
			console.log("ERROR: Inconsistency in cache: restoredTotalBalance", restoredTotalBalance, "cachedTotalBalance", cachedTotalBalance);
		this.setState({ addressBalances: restoredAddressBalances, totalBalance: restoredTotalBalance });
		// TODO_ADOT_HIGH updateBalanceInterval = setInterval(() => balanceCheck(), 20000);
	}
	// TODO_ADOT_LOW might become expensive for many addresses with a lot of activity
	updateAddressBalances = (newAddressBalances) => {
		console.log("newAddressBalances", newAddressBalances);
		console.log("old totalBalance", this.state.totalBalance);
		console.log("old addressBalances", this.state.addressBalances);
		this.setState(prevState => {
			let addressBalances = Object.assign({}, prevState.addressBalances);
			let totalBalance = prevState.totalBalance;
			console.log("prevState totalBalance", prevState.totalBalance);
			// TODO_ADOT_MEDIUM check for negative values
			for (var address of Object.keys(newAddressBalances)) {
				if (typeof addressBalances[address] === 'number' && !isNaN(addressBalances[address]))
					totalBalance = totalBalance + newAddressBalances[address] - addressBalances[address];
				else
					totalBalance = totalBalance + newAddressBalances[address];
				addressBalances[address] = newAddressBalances[address];
			}
			console.log("inner totalBalance", totalBalance);
			console.log("inner typeof totalBalance", typeof totalBalance);
			totalBalance = parseFloat(totalBalance.toFixed(8));
			console.log("inner totalBalance", totalBalance);
			console.log("inner typeof totalBalance", typeof totalBalance);
			return { addressBalances: addressBalances, totalBalance: totalBalance };
		});
		localStorage.setItem('lastLoginTime', new Date().getTime().toString());
		this.updateLocalStorageAddressesAndTotalBalance(); // TODO_ADOT_HIGH do on interval
		var component = this;
		setTimeout(() => {
			console.log("new totalBalance", component.state.totalBalance);
			console.log("new addressBalances", component.state.addressBalances);
		}, 1000);
	}
	isValidAlterdotAddress = address => {
		return (
			address &&
			address.length >= 34 &&
			(address[0] === 'C' || address[0] === '5')
		)
	}
	getModeFromUrl = () => {
		return window.location.href.endsWith('domains')
			? 'domains'
			: window.location.href.endsWith('help') || window.location.href.includes('about')
			? 'help'
			: '';
	}
	setMode = newMode => {
		if (this.state.mode === newMode) return
		this.setState({ mode: newMode })
		if (!window.location.href.endsWith(newMode))
			window.history.replaceState(null, 'MyAlterdotWallet - ' + newMode, newMode)
		ReactGA.pageview('/' + newMode)
	}
	loginWallet = password => {
		if (!this.state.hdSeedE)
			return 'No wallet available to unlock!';
		var encryptedPasswordHash = this.getEncryptedPasswordHash(password)
		var decrypted = this.decrypt(this.state.hdSeedE, password)
		if (!decrypted) return 'Invalid wallet password!';
		var mnemonic = new Mnemonic(decrypted)
		var xpriv = mnemonic.toHDPrivateKey()
		var addressBalances = {};
		addressBalances[
			xpriv
				.derive("m/44'/5'/0'/0/0")
				.privateKey.toAddress()
				.toString()
		] = 0;
		this.setState({
			ledger: undefined,
			trezor: undefined,
			encryptedPasswordHash: encryptedPasswordHash,
			addressBalances: addressBalances,
			loading: false,
			mode: '',
			rememberPassword: password,
		});
		this.restoreAddressBalances();
		localStorage.setItem('lastLoginTime', new Date().getTime().toString())
		localStorage.setItem('encryptedPasswordHash', encryptedPasswordHash);
		this.updateLocalStorageTotalBalanceAndAddresses();
	}
	getEncryptedPasswordHash = password => {
		// The password is never stored, we derive it and only check if the hash is equal
		var passwordHash = this.deriveHash(password)
		return this.encrypt(passwordHash, '9ADE0896B2594184BA36E757C8E6EFD7')
	}
	deriveHash = password => {
		return CryptoJS.SHA256(password).toString()
	}
	encrypt = (text, key) => {
		try {
			var iv = CryptoJS.enc.Hex.parse('F2EBAE2CDF804895B5C091D0310169C9')
			var cfg = { mode: CryptoJS.mode.CBC, iv: iv, padding: CryptoJS.pad.Pkcs7 }
			var ciphertext = CryptoJS.AES.encrypt(text, key, cfg)
			return ciphertext.toString()
		} catch (err) {
			console.log(err)
			return ''
		}
	}
	decrypt = (encryptedData, key) => {
		try {
			var iv = CryptoJS.enc.Hex.parse('F2EBAE2CDF804895B5C091D0310169C9')
			var cfg = { mode: CryptoJS.mode.CBC, iv: iv, padding: CryptoJS.pad.Pkcs7 }
			var decrypted = CryptoJS.AES.decrypt(encryptedData, key, cfg)
			return decrypted.toString(CryptoJS.enc.Utf8)
		} catch (err) {
			console.log(err)
			return ''
		}
	}
	isCorrectPasswordHash = password => {
		return (
			this.deriveHash(password) ===
			this.decrypt(this.state.encryptedPasswordHash, '9ADE0896B2594184BA36E757C8E6EFD7')
		)
	}
	loginHardwareWallet = async (ledger, trezor) => {
		var addresses = []
		if (ledger) {
			const result = await ledger.getWalletPublicKey("44'/5'/0'/0/0")
			addresses.push(result.bitcoinAddress)
		} else {
			for (var used of trezor.usedAddresses) addresses.push(used.address)
			// Show first unused address, the rest (trezor.unusedAddresses) is used once this is used
			addresses.push(trezor.address)
		}
		this.setState({
			ledger,
			trezor,
			hdSeedE: 'h',
			encryptedPasswordHash: 'w',
			addresses,
			totalBalance: trezor ? trezor.balance * constants.ADOT_PER_DUFF : 0,
			loading: false,
			mode: '',
			rememberPassword: '',
		})
		localStorage.setItem('lastLoginTime', new Date().getTime().toString())
		localStorage.setItem('addresses', addresses.join(' '))
	}
	createWallet = (newSeed, password) => {
		var newAddressBalances = {};
		newAddressBalances[
			newSeed
				.toHDPrivateKey()
				.derive("m/44'/5'/0'/0/0")
				.privateKey.toAddress()
				.toString()
		] = 0;
		
		var encryptedHdSeed = this.encrypt(newSeed.toString(), password)
		var encryptedPasswordHash = this.getEncryptedPasswordHash(password)
		this.setState({
			ledger: undefined,
			trezor: undefined,
			hdSeedE: encryptedHdSeed,
			encryptedPasswordHash: encryptedPasswordHash,
			totalBalance: 0,
			addressBalances: newAddressBalances,
			loading: false,
			mode: '',
			rememberPassword: password,
		})
		localStorage.setItem('lastLoginTime', new Date().getTime().toString())
		localStorage.setItem('encryptedPasswordHash', encryptedPasswordHash)
		localStorage.setItem('hdSeedE', encryptedHdSeed)
		this.updateLocalStorageTotalBalanceAndAddresses();
	}
	logout = deleteAll => {
		localStorage.removeItem('lastLoginTime')
		localStorage.removeItem('encryptedPasswordHash')
		if (deleteAll) {
			localStorage.removeItem('hdSeedE')
			localStorage.removeItem('addressBalances');
			this.setState({ addressBalances: {} });
		}
		localStorage.removeItem('totalBalance')
		window.history.pushState({ urlPath: '/' }, '', '/')
		this.setState({
			encryptedPasswordHash: undefined,
			hdSeedE: deleteAll ? undefined : this.state.hdSeedE,
			mode: '',
			loading: false,
		})
	}
	showNumber = (amount, decimals) => {
		var oldResult;
		var powerOf10 = 10 ** decimals;
		var result = parseFloat(Math.round(amount * powerOf10) / powerOf10).toFixed(decimals);

		if (decimals === 3) {
			oldResult = parseFloat(Math.round(amount * 1000) / 1000).toFixed(decimals)
		} else if (decimals === 4) {
			oldResult = parseFloat(Math.round(amount * 10000) / 10000).toFixed(decimals)
			// If we have more than 1 leading digits before the . remove the last digit after the dot
			if (oldResult.length > 6 && amount > 0) oldResult = oldResult.substring(0, oldResult.length - 1)
		} else if (decimals === 5) {
			oldResult = parseFloat(Math.round(amount * 100000) / 100000).toFixed(decimals)
			// If we have more than 1 leading digits before the . remove the last digit after the dot
			if (oldResult.length > 7 && amount > 0) oldResult = oldResult.substring(0, oldResult.length - 1)
		} else if (decimals === 6)
			oldResult = parseFloat(Math.round(amount * 1000000) / 1000000).toFixed(decimals)
		else if (decimals === 7)
			oldResult = parseFloat(Math.round(amount * 10000000) / 10000000).toFixed(decimals)
		else if (decimals === 8)
			oldResult = parseFloat(Math.round(amount * 100000000) / 100000000).toFixed(decimals)
		else oldResult = parseFloat(amount).toFixed(decimals)
		
		if (result !== oldResult)
			console.log("showNumber ERROR, new result: ", result, "old result: ", oldResult);

		// Always cut off the last bunch of zeros (except if we requested 2 decimals for currencies)
		if (decimals > 2) {
			for (var i = 0; i < 9; i++) {
				var isDot = result.endsWith('.')
				if (result.endsWith('0') || isDot) {
					result = result.substring(0, result.length - 1)
					if (isDot) break;
				} else break;
			}
		}

		if (result === '' || isNaN(result))
			return 0;

		return result;
	}
	selectExplorer = change => {
		console.log('Selected explorer: ' + change.value)
		this.setState({ explorer: change.value })
	}
	render() {
		var url = window.location.href.toLowerCase()
		if (url.includes('/mixing') || url.includes('/redeem') || url.includes('/?redeem')) {
			if (url.includes('https://mydashwallet.org'))
				window.location = window.location.href.replace(
					'https://mydashwallet.org',
					'https://old.mydashwallet.org'
				)
			else if (url.includes('http://localhost:3000'))
				window.location = window.location.href.replace(
					'http://localhost:3000',
					'https://old.mydashwallet.org'
				)
			return <div />
		}
		var popupDialog = {
			position: 'absolute',
			textAlign: 'left',
			borderRadius: '8px',
			border: 'solid 1px #979797',
			width: '96%',
			maxWidth: '740px',
			height: 'auto',
			minHeight: 'auto',
			top: '5%',
			left: '24px',
			right: '4px',
			margin: '5% auto',
			padding: '24px',
			marginBottom: '50px',
		}
		return (
			<PageContainer>
				<Menu
					onLogout={this.logout}
					mode={this.state.mode}
					setMode={this.setMode}
					hardwareWallet={this.state.ledger || this.state.trezor}
					isUnlocked={this.state.hdSeedE && this.state.encryptedPasswordHash}
					setCollapsed={value => this.setState({ collapsed: value })}
				/>
				<MainContainer
					collapsed={this.state.collapsed || window.innerWidth < 768}
					isSmallScreen={window.innerWidth < 768}
				>
					{/*this.state.mode === 'mix' ? (
						<Mix
							popupDialog={popupDialog}
							addressBalances={addressBalances}
							addresses={this.state.addresses}
							showNumber={this.showNumber}
							setMode={this.setMode}
							totalBalance={this.state.totalBalance}
							onDecrypt={this.decrypt}
							isWalletAvailable={this.state.hdSeedE && this.state.encryptedPasswordHash}
							ledger={this.state.ledger}
							trezor={this.state.trezor}
							hdSeedE={this.state.hdSeedE}
							encryptedPasswordHash={this.state.encryptedPasswordHash}
							isCorrectPasswordHash={this.isCorrectPasswordHash}
						/>
					) : this.state.mode === 'tip' ? (
						<Tip />
					) : this.state.mode === 'chat' ? (
						<Chat />
					) : this.state.mode === 'stats' ? (
						<Stats />
					) : this first half is disabled*/
					this.state.mode === 'domains' && this.state.hdSeedE && this.state.encryptedPasswordHash ? ( // TODO_ADOT_HIGH domains page
						<Domains
							explorer={this.state.explorer}
							popupDialog={popupDialog}
							addressBalances={this.state.addressBalances}
							unlockedText={
								(this.state.trezor ? 'Trezor' : this.state.ledger ? 'Ledger' : 'Wallet')
							}
							rememberPassword={this.state.rememberPassword}
							showNumber={this.showNumber}
							totalBalance={this.state.totalBalance}
							priceUsd={this.state.priceUsd}
							priceEur={this.state.priceEur}
							priceGbp={this.state.priceGbp}
							addresses={this.state.addresses}
							ledger={this.state.ledger}
							trezor={this.state.trezor}
							hdSeedE={this.state.hdSeedE}
							encryptedPasswordHash={this.state.encryptedPasswordHash}
							isCorrectPasswordHash={this.isCorrectPasswordHash}
							onDecrypt={this.decrypt}
							onEncrypt={this.encrypt}
							setMode={this.setMode}
						/>
					) : this.state.mode === 'settings' ? (
						<Settings
							explorer={this.state.explorer}
							onSelectExplorer={this.selectExplorer}
						/>
					) : this.state.mode === 'help' ? (
						<Help />
					//) : this.state.mode === 'scripthack' ? (
					//	<ScriptHack />
					) : this.state.hdSeedE && this.state.encryptedPasswordHash ? (
						<LoggedIn
							explorer={this.state.explorer}
							popupDialog={popupDialog}
							addressBalances={this.state.addressBalances}
							unlockedText={
								(this.state.trezor ? 'Trezor' : this.state.ledger ? 'Ledger' : 'Wallet')
							}
							rememberPassword={this.state.rememberPassword}
							showNumber={this.showNumber}
							totalBalance={this.state.totalBalance}
							priceUsd={this.state.priceUsd}
							priceEur={this.state.priceEur}
							priceGbp={this.state.priceGbp}
							addresses={this.state.addresses}
							ledger={this.state.ledger}
							trezor={this.state.trezor}
							hdSeedE={this.state.hdSeedE}
							encryptedPasswordHash={this.state.encryptedPasswordHash}
							isCorrectPasswordHash={this.isCorrectPasswordHash}
							onDecrypt={this.decrypt}
							onEncrypt={this.encrypt}
							setMode={this.setMode}
							updateAddressBalances={this.updateAddressBalances}
						/>
					) : (
						<Login
							popupDialog={popupDialog}
							isWalletAvailable={this.state.hdSeedE}
							setMode={this.setMode}
							isCorrectPasswordHash={this.isCorrectPasswordHash}
							onLoginWallet={this.loginWallet}
							onCreateWallet={this.createWallet}
							onLoginHardwareWallet={this.loginHardwareWallet}
							onLogout={this.logout}
						/>
					)}
					{this.state.loading && <Loader>ADOT</Loader>}
				</MainContainer>
				{/*
				<AlterdotPricePanel>
					<div title="Data from CoinMarketCap.com">
						<b>1 ADOT</b>
						<br />${this.showNumber(this.state.priceUsd, 2)}
						<br />€{this.showNumber(this.state.priceEur, 2)}
						<br />
						{window.innerWidth > 768 && <span>{this.showNumber(this.state.priceBtc, 4)} BTC</span>}
					</div>
					{window.innerWidth > 768 && (
						<div title="1 mADOT = 0.001 ADOT. Data from CoinMarketCap.com">
							<b>1 mADOT</b>
							<br />${this.showNumber(this.state.priceUsd / 1000.0, 2)}
							<br />€{this.showNumber(this.state.priceEur / 1000.0, 2)}
							<br />
							Tx:${this.showNumber(this.state.priceUsd * 0.00002260, 5)}
						</div>
					)}
				</AlterdotPricePanel>*/}
			</PageContainer>
		)
	}
}

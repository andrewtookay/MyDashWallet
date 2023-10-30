﻿import React, { useEffect, useState } from 'react';
import { Menu } from './Menu';
import { Domains } from './pages/Domains';
import { Help } from './pages/Help';
import { Settings } from './pages/Settings';
import { Wallet } from './pages/Wallet';
import { Login } from './pages/Login';
import CryptoJS from 'crypto-js';
import { Mnemonic } from 'alterdot-lib';
import styled from 'styled-components';
import { popupDialog } from './constants/styling.js';
import { Browser } from './pages/Browser';
import './all.css';

const PageContainer = styled.div`
	background: linear-gradient(to top right, #ed5a2d, #c1616e);
	border-radius: 40px;
	display: inherit;
	height: ${(props) => !props.isSmallScreen ? "max(88vh, 800px)" : "fit-content"};
	width: max(88vw, 1200px);
	@media screen and (max-width: 1200px) {
		.register_mn_otr {
			position: relative;
		}
	}
`;
const MainContainer = styled.div`
	display: inline-block;
	vertical-align: middle;
	width: ${(props) => (props.collapsed ? '94%' : props.isSmallScreen ? '96%' : '80%')};
	height: 100%;
	padding: 30px 50px;
	@media screen and (max-width: 1200px) {
		padding: 20px 30px;
	}
	@media screen and (max-width: 767px) {
		padding: 10px 14px;
	}
`;
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
`;

function App() {
	const [state, setState] = useState(getInitialState());

	useEffect(() => {
		window.onpopstate = () => {
			if (state.mode !== getModeFromUrl()) setMode(getModeFromUrl());
		};
		window.onpushstate = () => {
			if (state.mode !== getModeFromUrl()) setMode(getModeFromUrl());
		};

		return () => {
			window.onpopstate = null;
			window.onpushstate = null;
		}
	}, []);

	function getInitialState() {
		const lastLoginTime = localStorage.getItem('lastLoginTime');
		const encryptedPasswordHash = localStorage.getItem('encryptedPasswordHash');
		const hdSeedE = localStorage.getItem('hdSeedE');

		const baseState = {
			selectedCurrency: 'USD',
			priceUsd: 0.02,
			priceEur: 0.018,
			priceGbp: 0.015,
			priceBtc: 0.0000004,
			hdSeedE: hdSeedE,
			mode: getModeFromUrl(),
			collapsed: window.innerWidth < 768,
			explorer: 'insight.alterdot.network'
		}

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		// Keep cache maximum 24 hours!
		if (lastLoginTime &&
			new Date(parseInt(lastLoginTime)) > yesterday &&
			encryptedPasswordHash && hdSeedE
		) {
			const { cachedAddressBalances, cachedTotalBalance } = getCachedAddressesAndTotalBalance();
			return {
				...baseState,
				addressBalances: cachedAddressBalances,
				totalBalance: cachedTotalBalance,
				encryptedPasswordHash: encryptedPasswordHash
			};
		} else
			return {
				...baseState,
				addressBalances: {},
				totalBalance: 0,
			};
	};

	const updateLocalStorageAddressesAndTotalBalance = () => {
		var totalAmount = 0;
		var cachedText = '';
		for (var address of Object.keys(state.addressBalances))
			if (isValidAlterdotAddress(address)) {
				var amount = state.addressBalances[address];
				totalAmount += amount;
				cachedText += address + '|' + amount + '|';
			}
		localStorage.setItem('addressBalances', cachedText);
		if (parseFloat(totalAmount.toFixed(8)) !== state.totalBalance)
			console.log(
				'Calculated total balance of addresses different from state.',
				totalAmount.toFixed(8),
				state.totalBalance
			);
		localStorage.setItem('totalBalance', totalAmount.toFixed(8));
	};

	function getCachedAddressesAndTotalBalance() {
		var cachedAddressBalances = localStorage.getItem('addressBalances');
		var cachedTotalBalance = localStorage.getItem('totalBalance');
		var restoredAddressBalances = {};
		var restoredTotalBalance = 0;

		if (cachedAddressBalances) {
			var parts = cachedAddressBalances.split('|');
			for (var i = 0; i < parts.length / 2; i++)
				if (parts[i * 2].length > 0) {
					var balance = parseFloat(parts[i * 2 + 1]);
					restoredAddressBalances[parts[i * 2]] = balance;
					restoredTotalBalance += balance;
				}
		}

		console.log('restoredAddressBalances', restoredAddressBalances);
		restoredTotalBalance = parseFloat(restoredTotalBalance.toFixed(8));
		cachedTotalBalance = parseFloat(cachedTotalBalance);

		if (restoredTotalBalance !== cachedTotalBalance)
			console.log(
				'ERROR: Inconsistency in cache: restoredTotalBalance',
				restoredTotalBalance,
				'cachedTotalBalance',
				cachedTotalBalance
			);

		return { cachedAddressBalances: restoredAddressBalances, cachedTotalBalance: restoredTotalBalance };
	};

	// TODO_ADOT_LOW might become expensive for many addresses with a lot of activity
	const updateAddressBalances = (newAddressBalances) => {
		setState((prevState) => {
			let addressBalances = Object.assign({}, prevState.addressBalances);
			let totalBalance = prevState.totalBalance;
			// TODO_ADOT_MEDIUM check for negative values
			for (var address of Object.keys(newAddressBalances)) {
				if (typeof addressBalances[address] === 'number' && !isNaN(addressBalances[address]))
					totalBalance = totalBalance + newAddressBalances[address] - addressBalances[address];
				else totalBalance = totalBalance + newAddressBalances[address];
				addressBalances[address] = newAddressBalances[address];
			}
			totalBalance = parseFloat(totalBalance.toFixed(8));
			return { ...prevState, addressBalances: addressBalances, totalBalance: totalBalance };
		});
		localStorage.setItem('lastLoginTime', new Date().getTime().toString());
		updateLocalStorageAddressesAndTotalBalance(); // TODO_ADOT_HIGH do on interval
	};

	const isValidAlterdotAddress = (address) => {
		return address && address.length >= 34 && (address[0] === 'C' || address[0] === '5');
	};

	function getModeFromUrl() {
		return window.location.href.endsWith('domains')
			? 'domains'
			: window.location.href.endsWith('browser')
				? 'browser'
				: window.location.href.endsWith('help') || window.location.href.includes('about')
					? 'help'
					: '';
	};

	const setMode = (newMode) => {
		if (state.mode === newMode) return;
		setState({ ...state, mode: newMode });
		if (!window.location.href.endsWith(newMode))
			window.history.replaceState(null, 'MyAlterdotWallet - ' + newMode, newMode);
	};

	const loginWallet = (password) => {
		if (!state.hdSeedE) return 'No wallet available to unlock!';
		var encryptedPasswordHash = getEncryptedPasswordHash(password);
		var decrypted = decrypt(state.hdSeedE, password);
		if (!decrypted) return 'Invalid wallet password!';
		var mnemonic = new Mnemonic(decrypted);
		var xpriv = mnemonic.toHDPrivateKey();
		var addressBalances = {};
		addressBalances[xpriv.derive("m/44'/5'/0'/0/0").privateKey.toAddress().toString()] = 0;

		setState((prevState) => ({
			...prevState,
			ledger: undefined,
			trezor: undefined,
			encryptedPasswordHash: encryptedPasswordHash,
			addressBalances: addressBalances,
			loading: false,
			mode: '',
			rememberPassword: password,
		}));

		const { cachedAddressBalances, cachedTotalBalance } = getCachedAddressesAndTotalBalance();
		setState((prevState) => ({ ...prevState, addressBalances: cachedAddressBalances, totalBalance: cachedTotalBalance }));

		localStorage.setItem('lastLoginTime', new Date().getTime().toString());
		localStorage.setItem('encryptedPasswordHash', encryptedPasswordHash);
		updateLocalStorageAddressesAndTotalBalance();
	};

	useEffect(() => {
		console.log(state);
	}, [state]);

	const getEncryptedPasswordHash = (password) => {
		// The password is never stored, we derive it and only check if the hash is equal
		var passwordHash = deriveHash(password);
		return encrypt(passwordHash, '9ADE0896B2594184BA36E757C8E6EFD7');
	};

	const deriveHash = (password) => {
		return CryptoJS.SHA256(password).toString();
	};

	const encrypt = (text, key) => {
		try {
			var iv = CryptoJS.enc.Hex.parse('F2EBAE2CDF804895B5C091D0310169C9');
			var cfg = { mode: CryptoJS.mode.CBC, iv: iv, padding: CryptoJS.pad.Pkcs7 };
			var ciphertext = CryptoJS.AES.encrypt(text, key, cfg);
			return ciphertext.toString();
		} catch (err) {
			console.log(err);
			return '';
		}
	};

	const decrypt = (encryptedData, key) => {
		try {
			var iv = CryptoJS.enc.Hex.parse('F2EBAE2CDF804895B5C091D0310169C9');
			var cfg = { mode: CryptoJS.mode.CBC, iv: iv, padding: CryptoJS.pad.Pkcs7 };
			var decrypted = CryptoJS.AES.decrypt(encryptedData, key, cfg);
			return decrypted.toString(CryptoJS.enc.Utf8);
		} catch (err) {
			console.log(err);
			return '';
		}
	};
	const isCorrectPasswordHash = (password) => {
		return (
			deriveHash(password) ===
			decrypt(state.encryptedPasswordHash, '9ADE0896B2594184BA36E757C8E6EFD7')
		);
	};

	const createWallet = (newSeed, password) => {
		var newAddressBalances = {};
		newAddressBalances[
			newSeed.toHDPrivateKey().derive("m/44'/5'/0'/0/0").privateKey.toAddress().toString()
		] = 0;

		var encryptedHdSeed = encrypt(newSeed.toString(), password);
		var encryptedPasswordHash = getEncryptedPasswordHash(password);
		setState({
			...state,
			ledger: undefined,
			trezor: undefined,
			hdSeedE: encryptedHdSeed,
			encryptedPasswordHash: encryptedPasswordHash,
			totalBalance: 0,
			addressBalances: newAddressBalances,
			loading: false,
			mode: '',
			rememberPassword: password,
		});
		localStorage.setItem('lastLoginTime', new Date().getTime().toString());
		localStorage.setItem('encryptedPasswordHash', encryptedPasswordHash);
		localStorage.setItem('hdSeedE', encryptedHdSeed);
		updateLocalStorageAddressesAndTotalBalance();
	};

	const logout = (deleteAll) => {
		if (deleteAll) {
			localStorage.removeItem('hdSeedE');
			localStorage.removeItem('addressBalances');
			localStorage.removeItem('totalBalance');
			
			setState((prevState) => ({
				...prevState,
				addressBalances: {},
				hdSeedE: undefined,
			}));
		}

		localStorage.removeItem('lastLoginTime');
		localStorage.removeItem('encryptedPasswordHash');

		setState((prevState) => ({
			...prevState,
			encryptedPasswordHash: undefined,
			mode: '',
			loading: false,
		}));

		window.history.pushState({ urlPath: '/' }, '', '/');
	};

	const showNumber = (amount, decimals) => {
		var oldResult;
		var powerOf10 = 10 ** decimals;
		var result = parseFloat(Math.round(amount * powerOf10) / powerOf10).toFixed(decimals);

		if (decimals === 3) {
			oldResult = parseFloat(Math.round(amount * 1000) / 1000).toFixed(decimals);
		} else if (decimals === 4) {
			oldResult = parseFloat(Math.round(amount * 10000) / 10000).toFixed(decimals);
			// If we have more than 1 leading digits before the . remove the last digit after the dot
			if (oldResult.length > 6 && amount > 0)
				oldResult = oldResult.substring(0, oldResult.length - 1);
		} else if (decimals === 5) {
			oldResult = parseFloat(Math.round(amount * 100000) / 100000).toFixed(decimals);
			// If we have more than 1 leading digits before the . remove the last digit after the dot
			if (oldResult.length > 7 && amount > 0)
				oldResult = oldResult.substring(0, oldResult.length - 1);
		} else if (decimals === 6)
			oldResult = parseFloat(Math.round(amount * 1000000) / 1000000).toFixed(decimals);
		else if (decimals === 7)
			oldResult = parseFloat(Math.round(amount * 10000000) / 10000000).toFixed(decimals);
		else if (decimals === 8)
			oldResult = parseFloat(Math.round(amount * 100000000) / 100000000).toFixed(decimals);
		else oldResult = parseFloat(amount).toFixed(decimals);

		if (result !== oldResult)
			console.log('showNumber ERROR, new result: ', result, 'old result: ', oldResult);

		// Always cut off the last bunch of zeros (except if we requested 2 decimals for currencies)
		if (decimals > 2) {
			for (var i = 0; i < 9; i++) {
				var isDot = result.endsWith('.');
				if (result.endsWith('0') || isDot) {
					result = result.substring(0, result.length - 1);
					if (isDot) break;
				} else break;
			}
		}

		if (result === '' || isNaN(result)) return 0;

		return parseFloat(result);
	};

	const selectExplorer = (change) => {
		console.log('Selected explorer: ' + change.value);
		setState({ ...state, explorer: change.value });
	};

	return (
		<PageContainer>
			<Menu
				onLogout={logout}
				mode={state.mode}
				setMode={setMode}
				hardwareWallet={state.ledger || state.trezor}
				isUnlocked={state.hdSeedE && state.encryptedPasswordHash}
				setAppCollapsed={(value) => setState({ ...state, collapsed: value })}
			/>
			<MainContainer
				collapsed={state.collapsed || window.innerWidth < 768}
				isSmallScreen={window.innerWidth < 768}
			>
				{state.mode === 'domains' &&
					state.hdSeedE &&
					state.encryptedPasswordHash ? ( // TODO_ADOT_HIGH domains page
					<Domains />
				) : state.mode === 'browser' ? (
					<Browser />
				) : state.mode === 'settings' ? (
					<Settings
						explorer={state.explorer}
						onSelectExplorer={selectExplorer}
						selectedCurrency={state.selectedCurrency}
						setSelectedCurrency={(value) => setState({ ...state, selectedCurrency: value })}
					/>
				) : state.mode === 'help' ? (
					<Help />
				) : state.hdSeedE && state.encryptedPasswordHash ? (
					<Wallet
						explorer={state.explorer}
						popupDialog={popupDialog}
						addressBalances={state.addressBalances}
						rememberPassword={state.rememberPassword}
						showNumber={showNumber}
						totalBalance={state.totalBalance}
						priceUsd={state.priceUsd}
						priceEur={state.priceEur}
						priceGbp={state.priceGbp}
						ledger={state.ledger}
						trezor={state.trezor}
						hdSeedE={state.hdSeedE}
						encryptedPasswordHash={state.encryptedPasswordHash}
						isCorrectPasswordHash={isCorrectPasswordHash}
						onDecrypt={decrypt}
						onEncrypt={encrypt}
						setMode={setMode}
						updateAddressBalances={updateAddressBalances}
						selectedCurrency={state.selectedCurrency}
					/>
				) : (
					<Login
						popupDialog={popupDialog}
						isWalletAvailable={state.hdSeedE}
						setMode={setMode}
						onLoginWallet={loginWallet}
						onCreateWallet={createWallet}
						onLogout={logout}
					/>
				)}
				{state.loading && <Loader>Alterdot</Loader>}
			</MainContainer>
		</PageContainer>
	);
}

export default App;

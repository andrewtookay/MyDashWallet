import React, { useEffect, useState } from 'react';
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

const CRYPTO_CONFIG = {
	mode: CryptoJS.mode.CBC,
	iv: CryptoJS.enc.Hex.parse('F2EBAE2CDF804895B5C091D0310169C9'),
	padding: CryptoJS.pad.Pkcs7
};

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
			encryptedPasswordHash && hdSeedE) {
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

	function updateLocalStorageAddressesAndTotalBalance() {
		let totalAmount = 0;
		let addressBalancesStr = '';

		for (const address of Object.keys(state.addressBalances)) {
			if (isValidAlterdotAddress(address)) {
				const amount = state.addressBalances[address];
				totalAmount += amount;
				addressBalancesStr += address + '|' + amount + '|';
			}
		}

		if (parseFloat(totalAmount.toFixed(8)) !== state.totalBalance) {
			console.error(`Computed total balance of addresses (${totalAmount.toFixed(8)}) different from state balance (${state.totalBalance}).`);
		}

		localStorage.setItem('addressBalances', addressBalancesStr);
		localStorage.setItem('totalBalance', totalAmount.toFixed(8));
	};

	function getCachedAddressesAndTotalBalance() {
		const storedAddressBalances = localStorage.getItem('addressBalances');
		const cachedAddressBalances = {};
		let storedTotalBalance = localStorage.getItem('totalBalance');
		let cachedTotalBalance = 0;

		if (storedAddressBalances) {
			const parts = storedAddressBalances.split('|');
			for (let i = 0; i < parts.length / 2; i++)
				if (parts[i * 2].length > 0) {
					const balance = parseFloat(parts[i * 2 + 1]);
					cachedAddressBalances[parts[i * 2]] = balance;
					cachedTotalBalance += balance;
				}
		}

		cachedTotalBalance = parseFloat(cachedTotalBalance.toFixed(8));
		storedTotalBalance = parseFloat(storedTotalBalance);

		if (cachedTotalBalance !== storedTotalBalance) {
			console.error(`Inconsistency in cache: the stored total balance (${storedTotalBalance}) is different from the computed stored total balance (${storedTotalBalance})`);
		}

		return { cachedAddressBalances: cachedAddressBalances, cachedTotalBalance: cachedTotalBalance };
	};

	function updateAddressBalances(newAddressBalances) {
		setState((prevState) => {
			const addressBalances = Object.assign({}, prevState.addressBalances);
			let totalBalance = prevState.totalBalance;

			for (const address of Object.keys(newAddressBalances)) {
				if (typeof addressBalances[address] === 'number' && !isNaN(addressBalances[address])) {
					totalBalance = totalBalance + newAddressBalances[address] - addressBalances[address];
				} else {
					totalBalance = totalBalance + newAddressBalances[address];
				}

				addressBalances[address] = newAddressBalances[address];
			}

			totalBalance = parseFloat(totalBalance.toFixed(8));
			return { ...prevState, addressBalances: addressBalances, totalBalance: totalBalance };
		});

		localStorage.setItem('lastLoginTime', new Date().getTime().toString());
		updateLocalStorageAddressesAndTotalBalance();
	};

	function isValidAlterdotAddress(address) {
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

	function setMode(newMode) {
		if (state.mode === newMode) {
			return;
		}

		setState({ ...state, mode: newMode });

		if (!window.location.href.endsWith(newMode)) {
			window.history.replaceState(null, 'a.wallet - ' + newMode, newMode);
		}
	};

	function loginWallet(password) {
		if (!state.hdSeedE) {
			return 'No wallet available to unlock!';
		}

		const encryptedPasswordHash = getEncryptedPasswordHash(password);
		const decrypted = decrypt(state.hdSeedE, password);

		if (!decrypted) {
			return 'Invalid wallet password!';
		}

		const { addressBalances, totalBalance } = getInitialAddressesAndTotalBalance(decrypted);

		setState((prevState) => ({
			...prevState,
			ledger: undefined,
			trezor: undefined,
			encryptedPasswordHash: encryptedPasswordHash,
			addressBalances: addressBalances,
			totalBalance: totalBalance,
			loading: false,
			mode: '',
			rememberPassword: password,
		}));

		localStorage.setItem('lastLoginTime', new Date().getTime().toString());
		localStorage.setItem('encryptedPasswordHash', encryptedPasswordHash);
		updateLocalStorageAddressesAndTotalBalance();

		function getInitialAddressesAndTotalBalance(decrypted) {
			const { cachedAddressBalances, cachedTotalBalance } = getCachedAddressesAndTotalBalance();

			if (Object.keys(cachedAddressBalances).length > 0) {
				return { addressBalances: cachedAddressBalances, totalBalance: cachedTotalBalance };
			}

			const mnemonic = new Mnemonic(decrypted);
			const xpriv = mnemonic.toHDPrivateKey();

			const addressBalances = {};
			addressBalances[xpriv.derive("m/44'/5'/0'/0/0").privateKey.toAddress().toString()] = 0;

			return { addressBalances: addressBalances, totalBalance: 0 };
		}
	};

	function getEncryptedPasswordHash(password) {
		// The password is never stored, we derive it and only check if the hash is equal
		const passwordHash = deriveHash(password);
		return encrypt(passwordHash, '9ADE0896B2594184BA36E757C8E6EFD7');
	};

	function deriveHash(password) {
		return CryptoJS.SHA256(password).toString();
	};

	function encrypt(text, key) {
		try {
			return CryptoJS.AES.encrypt(text, key, CRYPTO_CONFIG).toString();
		} catch (err) {
			console.log(err);
			return '';
		}
	};

	function decrypt(encryptedData, key) {
		try {
			return CryptoJS.AES.decrypt(encryptedData, key, CRYPTO_CONFIG).toString(CryptoJS.enc.Utf8);
		} catch (err) {
			console.log(err);
			return '';
		}
	};

	function isCorrectPasswordHash(password) {
		return (
			deriveHash(password) ===
			decrypt(state.encryptedPasswordHash, '9ADE0896B2594184BA36E757C8E6EFD7')
		);
	};

	function createWallet(newSeed, password) {
		const newAddressBalances = {};
		newAddressBalances[newSeed.toHDPrivateKey().derive("m/44'/5'/0'/0/0").privateKey.toAddress().toString()] = 0;

		const encryptedHdSeed = encrypt(newSeed.toString(), password);
		const encryptedPasswordHash = getEncryptedPasswordHash(password);

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

	function logout(deleteAll) {
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

	function showNumber(amount, decimals) {
		const powerOf10 = 10 ** decimals;
		let result = parseFloat(Math.round(amount * powerOf10) / powerOf10).toFixed(decimals);

		// Remove trailing zeros (except for 2 decimal places for currencies)
		if (decimals > 2) {
			while (result.endsWith('0') || result.endsWith('.')) {
				result = result.slice(0, -1);
			}
		}

		return parseFloat(result) || 0;
	};

	function selectExplorer(change) {
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
					state.encryptedPasswordHash ? (
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

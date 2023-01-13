import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SkyLight from 'react-skylight';
import styled from 'styled-components';
import { Mnemonic } from 'alterdot-lib';

const UnlockBlock = styled.div`
	float: left;
	width: 40%;
	min-width: 230px;
`;
const HelpBlock = styled.div`
	float: right;
	width: 60%;
	@media screen and (max-width: 850px) {
		float: left;
		width: 100%;
	}
`;
const LoginButton = styled.div`
	color: #fff;
	background-color: #1c75bc;
	cursor: pointer;
	display: inline-block;
	font-weight: bold;
	font-size: 18px;
	margin-bottom: 0;
	text-align: center;
	-ms-touch-action: manipulation;
	touch-action: manipulation;
	vertical-align: middle;
	white-space: nowrap;
	padding: 15px 20px;
	border-radius: 0;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
	min-width: 228px;
	height: 94px;
	padding-top: 30px;
`;

export const Login = ({
	onLoginWallet,
	isWalletAvailable,
	popupDialog,
	onCreateWallet,
	onLogout,
	setMode,
}) => {
	const [state, setState] = useState({
		loginMode: 'Login',
		password: '',
		passwordConfirm: '',
		seed: '',
		agree: false,
		helpExpanded: 0,
	});

	const walletDialog = useRef();
	const passwordInput = useRef();
	const showSeedDialog = useRef();
	const deleteConfirmDialog = useRef();

	const setError = (message) => {
		setState({
			...state,
			walletMessage: message,
			walletMessageColor: 'red',
		});
	};

	const loginWalletClick = () => {
		if (state.password.length < 8) setError('Please enter your password.');
		else setState({ ...state, walletMessage: onLoginWallet(state.password) });
	};

	const createWalletClick = () => {
		if (state.seed.length < 12 || state.seed.split(' ').length !== 12)
			setError('Please enter a 12 word HD wallet seed');
		else if (state.password !== state.passwordConfirm)
			setError('Please enter the same password twice');
		else if (!state.agree) setError('Please agree to the terms of use');
		else {
			walletDialog.current.hide();
			showSeedDialog.current.show();
		}
	};

	const createWallet = (restore) => {
		setState({
			...state,
			walletMessage: isWalletAvailable
				? 'Enter your password to unlock your wallet'
				: "Make sure your device is safe & no one is watching, don't show this to anyone.",
			walletMessageColor: 'black',
			seed: isWalletAvailable || restore ? '' : new Mnemonic().toString(),
			password: '',
			passwordConfirm: '',
		});

		walletDialog.current.show();
		passwordInput.current.focus();
	};

	return (
		<div>
			<UnlockBlock>
				<h1>Open Wallet</h1>
				<div data-i18n="HardwareSafestOption" style={{ fontSize: 'small', marginBottom: '4px' }}>
					Hardware wallets are the safest option via{' '}
					<a
						href="https://en.wikipedia.org/wiki/Universal_2nd_Factor"
						target="_blank"
						rel="noopener noreferrer"
					>
						Chrome <span data-i18n="Or">or</span> Opera
					</a>
				</div>
				<br />
				<div style={{ fontSize: 'small', marginBottom: '10px' }}>
					API supported by insight.alterdot.network. Check transactions and addresses fully private
					at
				</div>
				<a href="https://insight.alterdot.network" target="_blank" rel="noopener noreferrer">
					<img
						style={{ marginLeft: '20px' }}
						width="160"
						src="https://blockchair.com/images/new/logo.svg"
						alt="Explorer support via Insight"
						title="Explorer and API support via Insight"
					/>
				</a>
				<br />
				<br />
				<div style={{ fontSize: 'small', marginBottom: '4px' }}>
					Create or open HD Wallets in your browser locally.
				</div>
				<LoginButton
					style={{ paddingTop: '0' }}
					onClick={() => {
						setState({ ...state, loginMode: 'Wallet' });
						createWallet();
					}}
				>
					{!isWalletAvailable && (
						<div style={{ fontSize: '55px', fontWeight: 'normal', float: 'left' }}>+</div>
					)}
					{isWalletAvailable ? (
						<div style={{ marginTop: '34px' }}>Open HD Wallet</div>
					) : (
						<div style={{ marginTop: '34px' }}>Create HD Wallet</div>
					)}
				</LoginButton>
				<br />
				<br />
				<LoginButton
					style={{ paddingTop: '0' }}
					onClick={() => {
						setState({ ...state, loginMode: 'Wallet', restore: true });
						createWallet(true);
					}}
				>
					<div style={{ marginTop: '34px' }}>Restore from Seed</div>
				</LoginButton>
				<br />
				<span style={{ fontSize: 'small' }}>
					Private key and file imports are not currently supported.
				</span>
				<SkyLight
					dialogStyles={popupDialog}
					hideOnOverlayClicked
					ref={walletDialog}
					title={
						isWalletAvailable
							? 'Enter password to unlock wallet'
							: state.restore
							? 'Restore HD Wallet from Seed'
							: 'Create HD Wallet'
					}
				>
					<a style={{ float: 'right' }} href="/help" target="_blank" rel="noopener noreferrer">
						Help
					</a>
					<br />
					<span style={{ color: state.walletMessageColor }}>{state.walletMessage}</span>
					{!isWalletAvailable && (
						<div>
							<br />
							<br />
							{state.restore
								? 'Enter your 12 word HD Wallet Seed you want to import'
								: 'Locally generated HD Wallet Seed'}
							<br />
							<input
								type="text"
								style={{ width: '100%', fontWeight: 'bold' }}
								value={state.seed}
								onChange={(e) => setState({ ...state, seed: e.target.value })}
							/>
							<br />
							<br />
							Protect with a password (minimum 8 characters).
						</div>
					)}
					<input
						autoFocus={true}
						type="password"
						ref={passwordInput}
						value={state.password}
						onChange={(e) => setState({ ...state, password: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === 13 && isWalletAvailable) loginWalletClick();
						}}
					/>
					<br />
					{!isWalletAvailable && (
						<div>
							Repeat your password.
							<br />
							<input
								type="password"
								value={state.passwordConfirm}
								onChange={(e) => setState({ ...state, passwordConfirm: e.target.value })}
							/>
							<br />
						</div>
					)}
					<br />
					{!isWalletAvailable && (
						<div>
							<input
								type="checkbox"
								value={state.agree}
								onChange={(e) => setState({ ...state, agree: e.target.value })}
							/>{' '}
							I agree to the{' '}
							<a href="/help" target="_blank" rel="noopener noreferrer">
								Terms and Conditions
							</a>
							<br />
							<br />
						</div>
					)}
					{isWalletAvailable ? (
						<div>
							<button
								style={{ backgroundColor: 'gray', fontSize: '12px' }}
								onClick={() => deleteConfirmDialog.current.show()}
							>
								Delete Wallet
							</button>
							<button style={{ float: 'right' }} onClick={loginWalletClick}>
								Unlock Wallet
							</button>
						</div>
					) : (
						<button style={{ float: 'right' }} onClick={createWalletClick}>
							Create Wallet
						</button>
					)}
				</SkyLight>
				<SkyLight
					dialogStyles={popupDialog}
					hideOnOverlayClicked
					ref={showSeedDialog}
					title="Write down your Seed!"
				>
					<br />
					Write down your seed on a piece of paper, password manager or USB stick and store it in a
					safe location. It will NEVER be displayed again and it is the only way to restore your
					wallet on any supported HD wallet application. Your seed is stored encrypted with your
					password locally in your browser, it cannot be restored if you forget your password.
					<br />
					<br />
					<b>{state.seed}</b>
					<br />
					<br />
					<button
						onClick={() => {
							showSeedDialog.current.hide();
							try {
								setState({
									...state,
									walletMessage: onCreateWallet(new Mnemonic(state.seed), state.password),
								});
							} catch (error) {
								walletDialog.current.show();
								setError('Failed to create HD wallet from seed: ' + error);
							}
						}}
					>
						Ok
					</button>
				</SkyLight>
				<SkyLight
					dialogStyles={popupDialog}
					hideOnOverlayClicked
					ref={deleteConfirmDialog}
					title="Delete your wallet from this browser"
				>
					<br />
					Are you sure? This will delete all data from this browser, you can still restore your
					wallet using your seed. Make sure you still have it!
					<br />
					<br />
					<button
						onClick={() => {
							onLogout(true);
							walletDialog.current.hide();
							deleteConfirmDialog.current.hide();
						}}
					>
						YES
					</button>
					<button style={{ float: 'right' }} onClick={() => deleteConfirmDialog.current.hide()}>
						NO
					</button>
				</SkyLight>
			</UnlockBlock>
			<HelpBlock>
				<br />
				<br />
				<br />
				<h3>About</h3>
				<ul>
					<li>Free & open-source</li>
					<li>Client-side (runs in your browser)</li>
					<li>YOU are your own bank</li>
				</ul>
				<br />
				<h3>Help</h3>
				<ul>
					<li>
						<Link to="/help" onClick={() => setMode('help')}>
							What is MyAlterdotWallet.org?
						</Link>
					</li>
					<li>
						<a
							data-i18n="AboutImportantQuestions4"
							href="https://old.mydashwallet.org/AboutCreateNewWallet"
						>
							How to create a new wallet
						</a>
					</li>
					<li>
						<a
							data-i18n="AboutImportantQuestions5"
							href="https://old.mydashwallet.org/AboutMyAlterdotWallet"
						>
							Why is MyAlterdotWallet so fast? How does it work?
						</a>
					</li>
					<li>
						<a
							data-i18n="AboutImportantQuestions6"
							href="https://old.mydashwallet.org/AboutTransactionFees"
						>
							Why are ADOT transactions so cheap on MyAlterdotWallet?
						</a>
					</li>
				</ul>
			</HelpBlock>
		</div>
	);
};

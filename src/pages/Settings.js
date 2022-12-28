import React, { Component } from 'react'
import Dropdown from 'react-dropdown'

const explorerOptions = ['insight.alterdot.network', 'insight.dash.org']

export class Settings extends Component {
	render() {
		return (
			<div>
                <div className='full-line'>
                    <span style={{ fontSize: '12px', fontWeight: '600', marginRight: '8px' }}>API:</span>
                    <Dropdown
                        options={explorerOptions}
                        onChange={this.props.onSelectExplorer}
                        value={this.props.explorer}
                        placeholder="Blockchain Explorer"
                    />
				</div>
				<h1>Terms and conditions</h1>
				<div className="box-info">
					<span data-i18n="AboutOverview">
						Please take some time to understand this for your own safety.
					</span>
					<br />
					<br />
					<section className="row align-items-center">
						<div className="col col-sm-7">
							<h3 data-i18n="AboutWhatIsMyDashWallet">What is MyDashWallet.org?</h3>
							<ul>
								<li data-i18n="AboutWhatIsMyDashWallet1">
									MyDashWallet is a free,{' '}
									<a href="https://github.com/DeltaEngine/MyDashWallet">open-source</a>, client-side
									interface.
								</li>
								<li data-i18n="AboutWhatIsMyDashWallet2">
									We allow you to interact directly with the blockchain while remaining in full
									control of your keys &amp; your funds.
								</li>
								<li data-i18n="[html]AboutWhatIsMyDashWallet3">
									Includes support for great features of Dash:{' '}
									<a href="/AboutInstantSend">InstantSend</a> and{' '}
									<a href="/AboutPrivateSend">PrivateSend</a>
								</li>
								<li data-i18n="AboutWhatIsMyDashWallet4">
									You and only you are responsible for your security.
								</li>
								<li data-i18n="AboutWhatIsMyDashWallet5">
									We cannot recover your funds or freeze your account if you visit a phishing site
									or lose your private key. Using a hardware wallet is MUCH safer as no one will
									ever have access to your private keys.
								</li>
							</ul>
						</div>
						<div className="col col-sm-4 offset-sm-1">
							<img
								src="/images/alterdotLogoWithName.png"
								style={{
									width: '400px',
								}}
								alt="Alterdot"
							/>
						</div>
					</section>
				</div>
			</div>
		)
	}
}

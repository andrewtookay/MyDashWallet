import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
	faBars,
	faWallet,
	faQuestion,
	faTags,
	faCogs,
	faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import 'react-dropdown/style.css';

const Container = styled.div`
	transition: all linear 0.2s;
	width: ${(props) => (props.collapsed ? '96px' : '18%')};
	height: 100%;
	border-radius: 40px;
	min-height: ${(props) => (props.collapsed ? '800px' : '600px')};
	background-color: #621b57;
	background-image: linear-gradient(#621b57, #621b32);
	position: relative;
	z-index: 2;
	float: none;
	display: inline-block;
	vertical-align: top;
	color: white;
	padding-left: ${(props) => (props.collapsed ? '0' : '5px')};
	padding-right: ${(props) => (props.collapsed ? '0' : '5px')};
	@media screen and (max-width: 767px) {
		width: ${(props) => (props.collapsed ? '44px' : '100%')};
		position: relative;
		height: ${(props) => (props.collapsed ? '100%' : 'auto')};
	}
	a {
		color: white;
	}
	a:hover,
	a:focus {
		color: #f6a803;
		text-decoration: none;
	}
`;
const ToggleButton = styled.div`
	font-size: 22px;
	margin-top: 10px;
	padding: 15px 20px;
	cursor: pointer;
	span {
		font-size: 20px;
		width: 100%;
		position: relative;
		font-weight: 500;
		margin-left: 14px;
		margin-top: -5px;
	}
	svg {
		min-width: 24px;
	}
`;
const Logo = styled.div`
	display: ${(props) => (props.collapsed ? 'none' : 'block')};
	@media screen and (max-width: 767px) {
		display: none;
	}
	text-align: center;
	max-width: 242px;
	width: 90%;
	height: 80px;
	min-height: 80px;
	background: url(/images/alterdotLogoWithName.png) no-repeat center center;
	background-size: 100%;
	margin-top: 20px;
	margin-bottom: 20px;
	margin-left: auto;
	margin-right: auto;
`;
const Illustration = styled.div`
	display: ${(props) => (props.collapsed ? 'none' : 'block')};
	@media screen and (max-width: 767px) {
		display: none;
	}
	@media screen and (max-height: 866px) {
		display: none;
	}
	text-align: center;
	max-width: 366px;
	width: 90%;
	height: 210px;
	min-height: 40px;
	background: url(/images/alterdotLogo.png) no-repeat center center;
	background-size: 100%;
	opacity: 30%;
	margin-top: 0;
	margin-bottom: 0;
	margin-left: auto;
	margin-right: auto;
`;
const MenuElements = styled.div`
	ul {
		padding: 0;
	}
	ul li {
		list-style: none;
		padding: 15px 20px;
	}
	ul li a svg {
		min-width: 24px;
	}
	ul li a span {
		display: ${(props) => (props.collapsed ? 'none' : 'inline')};
		font-size: 20px;
		margin-left: 14px;
		position: relative;
		font-weight: 500;
	}
	margin-bottom: 40px;
`;
const MenuFooter = styled.div`
	display: ${(props) => (props.collapsed ? 'none' : 'block')};
	position: absolute;
	bottom: 0;
	padding: 5px;
	width: 96%;
	div {
		display: flex;
		justify-content: center;
		padding: 4px 0px;
	}
`;
const SocialMediaIcon = styled.div`
	background: ${(props) => "url('" + props.image + "')"};
	width: 30px;
	height: 30px;
	-ms-background-size: 30px 30px;
	background-size: 30px 30px;
	margin: 0px 4px;
	:hover {
		background: ${(props) => "url('" + props.hoverImage + "')"};
		width: 30px;
		height: 30px;
		-ms-background-size: 30px 30px;
		background-size: 30px 30px;
	}
	@media screen and (max-width: 767px) {
		width: 24px;
		height: 24px;
		-ms-background-size: 24px 24px;
		background-size: 24px 24px;
		margin-left: 4px;
		:hover {
			width: 24px;
			height: 24px;
			-ms-background-size: 24px 24px;
			background-size: 24px 24px;
		}
	}
`;
const FooterText = styled.div`
	clear: both;
	display: ${(props) => (props.collapsed ? 'none' : 'block')};
	font-size: 11px;
	text-align: center;
	margin: auto;
	padding-right: 10px;
`;

export class Menu extends Component {
	constructor(props) {
		super(props);
		this.state = { collapsed: window.innerWidth < 768 };
	}
	componentWillMount() {
		document.addEventListener('mousedown', this.handleClick, false);
	}
	componentWillUnmount() {
		document.removeEventListener('mousedown', this.handleClick, false);
	}
	toggleNavbar = () => {
		this.props.setCollapsed(!this.state.collapsed);
		this.setState({ collapsed: !this.state.collapsed });
	};

	render() {
		var collapsed = this.state && this.state.collapsed;
		return (
			<Container collapsed={collapsed} ref={(menu) => (this.menu = menu)}>
				<Logo collapsed={collapsed} onClick={() => this.props.setMode('')} />
				<ToggleButton onClick={this.toggleNavbar} alt="Toggle collapse menu">
					<FontAwesomeIcon icon={faBars} />
					{!collapsed && <span>Menu</span>}
				</ToggleButton>
				<MenuElements collapsed={collapsed}>
					<ul className={this.state.collapsed && 'd-flex flex-column'}>
						<li>
							<Link to="/" onClick={() => this.props.setMode('')}>
								<FontAwesomeIcon icon={faWallet} size="2x" />
								<span>{!this.props.isUnlocked ? 'Open ' : ''}Wallet</span>
							</Link>
						</li>
						{/*
						<li>
							<a href="https://old.mydashwallet.org/mixing">
								<FontAwesomeIcon icon={faRandom} />
								<span>Mix</span>
							</a>
							unused, and not very helpful <Link to="/mix" onClick={() => this.props.setMode('mix')}>
								<FontAwesomeIcon icon={faRandom} />
								<span>Mix</span>
							</Link>
						</li>
						<li> TODO_ADOT_FUTURE implement tipping mechanism for light wallets
							<Link to="/tip" onClick={() => this.props.setMode('tip')}>
								<FontAwesomeIcon icon={faGift} />
								<span>Tip</span>
							</Link>
						</li>
						TODO: implement on top of dash platform <li>
							<Link to="/chat" onClick={() => this.props.setMode('chat')}>
								<FontAwesomeIcon icon={faComments} />
								<span>Chat</span>
							</Link>
						</li>*/}
						<li>
							<Link to="/domains" onClick={() => this.props.setMode('domains')}>
								<FontAwesomeIcon icon={faTags} size="2x" />
								<span>Domains</span>
							</Link>
						</li>
						<li>
							<Link to="/settings" onClick={() => this.props.setMode('settings')}>
								<FontAwesomeIcon icon={faCogs} size="2x" />
								<span>Settings</span>
							</Link>
						</li>
						<li>
							<Link to="/help" onClick={() => this.props.setMode('help')}>
								<FontAwesomeIcon icon={faQuestion} size="2x" />
								<span>Help</span>
							</Link>
						</li>
						{/*<li>
							<a href="https://old.mydashwallet.org">
								<FontAwesomeIcon icon={faSitemap} />
								<span>Old Website</span>
							</a>
						</li>*/}
						<li style={{ display: this.props.isUnlocked ? 'auto' : 'none' }}>
							<Link to="/" onClick={() => this.props.onLogout()}>
								<FontAwesomeIcon icon={faSignOutAlt} size="2x" />
								<span>Logout</span>
							</Link>
						</li>
					</ul>
				</MenuElements>
				<Illustration collapsed={collapsed} />
				<MenuFooter collapsed={collapsed}>
					<div>
						<a
							href="https://discord.com/invite/86eTp6m7p9"
							target="_blank"
							rel="noopener noreferrer"
						>
							<SocialMediaIcon
								image="/images/SocialMediaIcon_Discord_Default.png"
								hoverImage="/images/SocialMediaIcon_Discord_Hover.png"
								title="Alterdot Community on Discord"
							/>
						</a>
						<a href="https://twitter.com/AlterdotNetwork" target="_blank" rel="noopener noreferrer">
							<SocialMediaIcon
								image="/images/SocialMediaIcon_Twitter_Default.png"
								hoverImage="/images/SocialMediaIcon_Twitter_Hover.png"
								title="Twitter"
							/>
						</a>
						{/*
						<a href="https://www.reddit.com/user/mydashwallet/comments/" target="_blank" rel="noopener noreferrer" >
							<SocialMediaIcon
								image="/images/SocialMediaIcon_Reddit_Default.png"
								hoverImage="/images/SocialMediaIcon_Reddit_Hover.png"
								title="MyDashWallet on Reddit"
							/>
						</a>
						<a href="https://t.me/MyDashWalletBot" target="_blank" rel="noopener noreferrer">
							<SocialMediaIcon
								image="/images/SocialMediaIcon_Telegram_Default.png"
								hoverImage="/images/SocialMediaIcon_Telegram_Hover.png"
								title="MyDashWallet on Telegram"
							/>
						</a>
						*/}
						<a
							href="https://github.com/Alterdot/web-wallet"
							target="_blank"
							rel="noopener noreferrer"
						>
							<SocialMediaIcon
								image="/images/SocialMediaIcon_Github_Default.png"
								hoverImage="/images/SocialMediaIcon_Github_Hover.png"
								title="Open Source Code on GitHub"
							/>
						</a>
						<a href="mailto:a.alterdot@gmail.com">
							<SocialMediaIcon
								image="/images/SocialMediaIcon_Mail_Default.png"
								hoverImage="/images/SocialMediaIcon_Mail_Hover.png"
								title="Contact Support"
							/>
						</a>
					</div>
					<FooterText collapsed={collapsed}>&copy; 2022 Alterdot (ADOT) Developers</FooterText>
					<FooterText collapsed={collapsed}>
						<a href="/help" target="_blank" rel="noopener noreferrer">
							Terms of Use
						</a>
					</FooterText>
				</MenuFooter>
			</Container>
		);
	}
}

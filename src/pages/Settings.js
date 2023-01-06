import React, { Component } from 'react';
import Dropdown from 'react-dropdown';

const explorerOptions = ['insight.alterdot.network'];
const currencyOptions = ['USD', 'EUR', 'GBP'];

export class Settings extends Component {
	render() {
		return (
			<div>
				<h1>Settings</h1>
				<div className="d-flex align-items-center mb-3">
					<span className="mr-2">API:</span>
					<Dropdown
						options={explorerOptions}
						value={this.props.explorer}
						onChange={this.props.onSelectExplorer} // TODO_ADOT_MEDIUM keep in local storage
					/>
				</div>
				<div className="d-flex align-items-center">
					<span className="mr-2">Currency:</span>
					<Dropdown
						options={currencyOptions}
						value={this.props.selectedCurrency}
						onChange={(e) => this.props.setSelectedCurrency(e.value)} // TODO_ADOT_MEDIUM keep in local storage
					/>
				</div>
			</div>
		);
	}
}

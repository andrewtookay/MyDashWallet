import React from 'react';
import Dropdown from 'react-dropdown';

const explorerOptions = ['insight.alterdot.network'];
const currencyOptions = ['USD', 'EUR', 'GBP'];

// TODO_ADOT_MEDIUM keep user settings (selected currency, explorer, etc.) in local storage

export const Settings = ({ explorer, onSelectExplorer, selectedCurrency, setSelectedCurrency }) => {
	return (
		<div>
			<h1>Settings</h1>
			<div className="d-flex align-items-center mb-3">
				<span className="mr-2">API:</span>
				<Dropdown options={explorerOptions} value={explorer} onChange={onSelectExplorer} />
			</div>
			<div className="d-flex align-items-center">
				<span className="mr-2">Currency:</span>
				<Dropdown
					options={currencyOptions}
					value={selectedCurrency}
					onChange={(e) => setSelectedCurrency(e.value)}
				/>
			</div>
		</div>
	);
};

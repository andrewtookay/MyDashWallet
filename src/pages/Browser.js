import React from 'react';

export const Browser = () => {
	return (
		<div id="main" className="main_dashboard_otr">
			<input type="text" placeholder="Lookup Domain"></input>
			<iframe
				title="IPFS Frame"
				className="ipfs-frame"
				src="https://bafybeiexi6auaceujeb4hy2neuycpm5kvum4afqzpadbvvzl6s3ngclzsm.ipfs.dweb.link/"
			></iframe>
		</div>
	);
};

import React from 'react';
import ReactMarkdown from 'react-markdown';
import Header from './Header';
import aboutContent from '../content/about.md?raw';

const About: React.FC = () => {
	return (
		<div className="page-container">
			<Header title="About" />
			<div className="view-body padded-content">
				<div style={{ maxWidth: '600px', margin: '0 auto' }}>
					<ReactMarkdown>{aboutContent}</ReactMarkdown>
				</div>
			</div>
		</div>
	);
};

export default About;

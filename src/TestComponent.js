const React = require('react');

const test = "This is Jenna's test yo ya!"

function TestComponent({id}) {
	
	let items = [1,2,3,4,5].map((n) => <li>{`${n}`}</li>);
	
	return (
			<div id={id}>
				<span>{test}</span>
				<ul>
					{items}
				</ul>
			</div>
		);
};

TestComponent.defaultProps = {
	id: "root"
};

TestComponent.propTypes = {
	id: String,
};

exports.TestComponent = TestComponent;
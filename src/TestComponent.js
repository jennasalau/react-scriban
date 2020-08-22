const React = require('react');

const test = "This is Jenna's test yo!"

function TestComponent({id}) {
	return (
			<div id={id}>
				{test}
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
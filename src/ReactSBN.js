import ReactReconciler from 'react-reconciler';
import fs from 'fs';

import {renderTemplate} from './ReactScribanRenderer'; 

const _publicContext = {};
const _rootHostContext = {};
const _childHostContext = {};

// https://www.konabos.com/blog/bootstrap-4-components-getting-fancy-with-scriban-sitecore-sxa.html
// https://doc.sitecore.com/developers/sxa/93/sitecore-experience-accelerator/en/the-embedded-functions-for-the-scriban-template.html

const hostConfig = {
	now: Date.now,
	
	getPublicInstance: () => {
		return _publicContext;
	},

	getRootHostContext: () => {
		return _rootHostContext;
	},

	getChildHostContext: () => {
		return _childHostContext;
	},

	prepareForCommit: () => {
		console.log('prepareForCommit()');
	},

	resetAfterCommit: () => {
		console.log('resetAfterCommit()');
	},

	createInstance: (type, props, rootContainerInstance, _currentHostContext, workInProgress) => {
		
		//TODO: isRoot?
		return renderTemplate(type, props, rootContainerInstance);
	},

	appendInitialChild: (parent, child) => {
		if (typeof parent.children === 'array') {
			parent.children.push(child);
		} else {
			parent.children = [child];
		}
	},

	finalizeInitialChildren: (element, type, props) => {
		//element.children.push(renderTemplate(type, props, {propTypes: {}}));
		//console.log('finalizeInitialChildren()', domElement);
	},

	prepareUpdate(domElement, oldProps, newProps) {
		console.log('prepareUpdate()');
		return true;
	},

	shouldSetTextContent: (type, props) => {
		console.log('shouldSetTextContent()');
		return typeof props.children === 'string' || typeof props.children === 'number';
	},

	createTextInstance: text => {
		console.log('createTextInsfdsfdsatance()');
		return `${text}`;
	},

	scheduleTimeout: () => {},
	cancelTimeout: () => {},
	noTimeout: () => {},
	isPrimaryRenderer: false,
	warnsIfNotActing: false,
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,
	getFundamentalComponentInstance: () => {console.log('getFundamentalComponentInstance()');},
	mountFundamentalComponent: () => {console.log('mountFundamentalComponent()');},
	shouldUpdateFundamentalComponent: () => {console.log('shouldUpdateFundamentalComponent()');},
	getInstanceFromNode: () => {console.log('getInstanceFromNode()');},
	isOpaqueHydratingObject: () => {console.log('isOpaqueHydratingObject()');},
	makeOpaqueHydratingObject: () => {console.log('makeOpaqueHydratingObject()');},
	makeClientId: () => {console.log('makeClientId()');},
	makeClientIdInDEV: () => {console.log('makeClientIdInDEV()');},
	beforeActiveInstanceBlur: () => {console.log('beforeActiveInstanceBlur()');},
	afterActiveInstanceBlur: () => {console.log('afterActiveInstanceBlur()');},
	preparePortalMount: () => {console.log('preparePortalMount()');},
	prepareScopeUpdate: () => {console.log('prepareScopeUpdate()');},
	getInstanceFromScope: () => {console.log('getInstanceFromScope()');},
	clearContainer: () => {console.log('getInstanceFromScope()');},
	appendChildToContainer: (container, child) => {

		const _renderChildren = (children, out = '', depth = 1) => {
			if (children && children.length) {
				
				children.forEach((child) => {
					let lead = '';
					for(let i=0;i<depth;i++) {
						lead += '\t';
					}
					if (child.children && child.children.length) {
						out += lead + child.header + '\n';
						_renderChildren(child.children, out, depth + 1);
						out += lead + child.footer + '\n';
					} else {
						out += lead + child.header + child.children + child.footer + '\n';
					}
				});
			}

			return out;
		};

		let stream = `{{ # Template auto generated ${(new Date()).toString()} }}\n\n`;
		stream += child.header + '\n';
		stream += _renderChildren(child.children);
		stream += child.footer + '\n';

		fs.writeFile(container.path, stream, function (err) {
			if (err) throw err;
			console.log('Replaced!');
		});

		console.log('"%s" was created successfully', container.path);
	},
};


const ReactSBN = ReactReconciler(hostConfig);

let internalContainerStructure;
module.exports = {
	render(element, props, path, callback) {

		// We must do this only once
		if (!internalContainerStructure) {
			internalContainerStructure = ReactSBN.createContainer(
				{
					propTypes: element.propTypes,
					path: path,
				},
				false,
				false
			);
		}

		let _element;
		if (typeof element === 'function') {
			_element = element({
				...element.defaultProps || {},
				...props || {},
			});
		} else {
			_element = element;
		}

		ReactSBN.updateContainer(_element, internalContainerStructure, null, callback);
	}
};

import ReactReconciler from 'react-reconciler';
import React from 'react';
import fs from 'fs';

import DOMProperty from './DOMProperty';
import ReactScribanRenderer from './ReactScribanRenderer'; 

const publicContext = {};
const rootHostContext = {};
const childHostContext = {};

// https://www.konabos.com/blog/bootstrap-4-components-getting-fancy-with-scriban-sitecore-sxa.html
// https://doc.sitecore.com/developers/sxa/93/sitecore-experience-accelerator/en/the-embedded-functions-for-the-scriban-template.html

const __DEV__ = true;

const hasOwnProperty = Object.prototype.hasOwnProperty;
const STYLE = 'style';
const RESERVED_PROPS = {
	children: null,
	dangerouslySetInnerHTML: null,
	suppressContentEditableWarning: null,
	suppressHydrationWarning: null,
};

// function validateRenderResult(child, type) {
// 	if (child === undefined) {
// 	  invariant(
// 		false,
// 		'%s(...): Nothing was returned from render. This usually means a ' +
// 		  'return statement is missing. Or, to render nothing, ' +
// 		  'return null.',
// 		getComponentName(type) || 'Component',
// 	  );
// 	}
//   }

  const omittedCloseTags = {
	area: true,
	base: true,
	br: true,
	col: true,
	embed: true,
	hr: true,
	source: true,
	track: true,
	wbr: true,
	// NOTE: menuitem's close tag should be omitted, but that causes problems.
  };

/**
 * Escapes special characters and HTML entities in a given html string.
 *
 * @param  {string} string HTML string to escape for later insertion
 * @return {string}
 * @public
 */
const matchHtmlRegExp = /["'&<>]/;
function escapeHtml(string) {
	const str = '' + string;
	const match = matchHtmlRegExp.exec(str);
  
	if (!match) {
	  return str;
	}
  
	let escape;
	let html = '';
	let index;
	let lastIndex = 0;
  
	for (index = match.index; index < str.length; index++) {
	  switch (str.charCodeAt(index)) {
		case 34: // "
		  escape = '&quot;';
		  break;
		case 38: // &
		  escape = '&amp;';
		  break;
		case 39: // '
		  escape = '&#x27;'; // modified from escape-html; used to be '&#39'
		  break;
		case 60: // <
		  escape = '&lt;';
		  break;
		case 62: // >
		  escape = '&gt;';
		  break;
		default:
		  continue;
	  }
  
	  if (lastIndex !== index) {
		html += str.substring(lastIndex, index);
	  }
  
	  lastIndex = index + 1;
	  html += escape;
	}
  
	return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
  }
  // end code copied and modified from escape-html

/**
 * Escapes text to prevent scripting attacks.
 *
 * @param {*} text Text value to escape.
 * @return {string} An escaped string.
 */
function escapeTextForBrowser(text) {
	if (typeof text === 'boolean' || typeof text === 'number') {
	  // this shortcircuit helps perf for types that we know will never have
	  // special characters, especially given that this function is used often
	  // for numeric dom ids.
	  return '' + text;
	}
	return escapeHtml(text);
  }


function getNonChildrenInnerMarkup(props) {
	const innerHTML = props.dangerouslySetInnerHTML;
	if (innerHTML != null) {
	  if (innerHTML.__html != null) {
		return innerHTML.__html;
	  }
	} else {
	  const content = props.children;
	  if (typeof content === 'string' || typeof content === 'number') {
		return escapeTextForBrowser(content);
	  }
	}
	return null;
}

/**
 * Escapes attribute value to prevent scripting attacks.
 *
 * @param {*} value Value to escape.
 * @return {string} An escaped string.
 */
function quoteAttributeValueForBrowser(value) {
	return '"' + escapeTextForBrowser(value) + '"';
}

function templateAttributePropForScriban(value) {
	return '"' + escapeTextForBrowser(value) + '"';
}

function shouldIgnoreAttribute(att, propertyInfo, isCustomComponent){
	return DOMProperty.shouldIgnoreAttribute(att, propertyInfo, isCustomComponent);
}


function createMarkupForProperty(name, value, isSbn) {
	const propertyInfo = DOMProperty.getPropertyInfo(name);
	if (name !== 'style' && shouldIgnoreAttribute(name, propertyInfo, false)) {
		return '';
	}
	// if (shouldRemoveAttribute(name, value, propertyInfo, false)) {
	//   return '';
	// }
	if (propertyInfo !== null) {
		const attributeName = propertyInfo.attributeName;
		const {type} = propertyInfo;
		if (type === BOOLEAN || (type === OVERLOADED_BOOLEAN && value === true)) {
			return attributeName + '=""';
		} else {
			if (propertyInfo.sanitizeURL) {
				value = '' + value;
				JSON.stringify(value);
			}
			return attributeName + '=' + quoteAttributeValueForBrowser(value);
		}
	} else if (isSbn) {
		return `${name}="#{{ i_item.${name} }}"`;
		
	} else if (DOMProperty.isAttributeNameSafe(name)) {
		return name + '=' + quoteAttributeValueForBrowser(value);
	}
	return '';
}

function createMarkupForCustomAttribute(
	name,
	value,
  ) {
	if (!DOMProperty.isAttributeNameSafe(name) || value == null) {
	  return '';
	}
	return name + '=' + '"' + value + '"';
  }

const styleNameCache = {};
const processStyleName = function(styleName) {
  if (styleNameCache.hasOwnProperty(styleName)) {
	return styleNameCache[styleName];
  }
  const result = hyphenateStyleName(styleName);
  styleNameCache[styleName] = result;
  return result;
};

function createMarkupForStyles(styles) {
	let serialized = '';
	let delimiter = '';
	for (const styleName in styles) {
	  if (!styles.hasOwnProperty(styleName)) {
		continue;
	  }
	  const isCustomProperty = styleName.indexOf('--') === 0;
	  const styleValue = styles[styleName];
	  if (__DEV__) {
		if (!isCustomProperty) {
		  warnValidStyle(styleName, styleValue);
		}
	  }
	  if (styleValue != null) {
		serialized +=
		  delimiter +
		  (isCustomProperty ? styleName : processStyleName(styleName)) +
		  ':';
		serialized += dangerousStyleValue(
		  styleName,
		  styleValue,
		  isCustomProperty,
		);
  
		delimiter = ';';
	  }
	}
	return serialized || null;
  }

function isCustomComponentFn(tagName) {
	if (tagName.indexOf('-') === -1) {
		return false;
	}
	return true;
}


const newlineEatingTags = {
	listing: true,
	pre: true,
	textarea: true,
};

const hostConfig = {
	now: Date.now,
	
	getPublicInstance: () => {
		return publicContext;
	},

	getRootHostContext: () => {
		return rootHostContext;
	},

	getChildHostContext: () => {
		return childHostContext;
	},

	prepareForCommit: () => {
		console.log('prepareForCommit()');
	},

	resetAfterCommit: () => {
		console.log('resetAfterCommit()');
	},

	createInstance: (type, props, rootContainerInstance, _currentHostContext, workInProgress) => {

		console.log('rootContainerInstance ===> ', rootContainerInstance);
		
		const tag = type.toLowerCase();
		let out = createOpenTagMarkup(tag, props, rootContainerInstance);
		let footer = '';
		if (omittedCloseTags.hasOwnProperty(tag)) {
			out += '/>';
		} else {
			out += '>';
			footer = '</' + tag + '>';
		}

		

		let children;
		const innerMarkup = getNonChildrenInnerMarkup(props);
		if (innerMarkup != null) {
			children = [];
			if (
				newlineEatingTags.hasOwnProperty(tag) &&
				innerMarkup.charAt(0) === '\n'
			) {
				out += '\n';
			}
			out += innerMarkup;
		} else {
			children = React.Children.toArray(props.children);
		}

		return out + footer;

		// console.log(newProps);
		// const {children} = newProps;
		
		// let element = ``;

		// console.log('createInstance()');

		// Object.keys(newProps).forEach(propName => {
		// 	const propValue = newProps[propName];
		// 	if (propName === 'children') {
		// 		if (typeof propValue === 'string' || typeof propValue === 'number') {
		// 			element = `${element}${propValue}`;
		// 		}
		// 	} else if (propName === 'onClick') {
		// 		domElement.addEventListener('click', propValue);
		// 	} else if (propName === 'className') {
		// 		domElement.setAttribute('class', propValue);
		// 	} else {
		// 		const propValue = newProps[propName];
		// 		domElement.setAttribute(propName, propValue);
		// 	}
		// });

		// <${type}
		// return element;
	},

	appendInitialChild: (parent, child) => {
		console.log('appendInitialChild()');
		return `${parent}${child}`;
	},

	finalizeInitialChildren: (domElement, type, props) => {
		console.log('finalizeInitialChildren()');
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

		fs.writeFile(container.path, child, function (err) {
			if (err) throw err;
			console.log('Replaced!');
		});

		//console.log('appendChildToContainer()', container, child);
	},
};
const ReactScriban = ReactReconciler(hostConfig);

let internalContainerStructure;
module.exports = {
	render(element, props, path, callback) {

		let _element;
		if (typeof element === 'function') {
			_element = element({
				...element.defaultProps || {},
				...props || {},
			});
		} else {
			_element = element;
		}

		// We must do this only once
		if (!internalContainerStructure) {
			internalContainerStructure = ReactScriban.createContainer(
				{
					propTypes: element.propTypes,
					path: path,
				},
				false,
				false
			);
		}



		ReactScriban.updateContainer(_element, internalContainerStructure, null, callback);
	}
};

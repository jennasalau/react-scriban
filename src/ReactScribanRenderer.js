
import React from 'react';
import {getPropertyInfo, shouldIgnoreAttribute, isAttributeNameSafe} from './utils/DOMProperty';
import escapeTextForBrowser from './utils/escapeTextForBrowser';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const STYLE = 'style';
const RESERVED_PROPS = {
	children: null,
	dangerouslySetInnerHTML: null,
	suppressContentEditableWarning: null,
	suppressHydrationWarning: null,
};

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

function createMarkupForCustomAttribute(name, value) {
	if (!isAttributeNameSafe(name) || value == null) {
		return '';
	}
	return name + '=' + '"' + value + '"';
}

function createMarkupForScribanAttribute(name, value) {
	if (!isAttributeNameSafe(name) || value == null) {
		return '';
	}
	return name + '=' + '"#{{ ' + name + ' }}"';
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

function createMarkupForProperty(name, value, isSbn) {
	const propertyInfo = getPropertyInfo(name);
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
		return createMarkupForScribanAttribute(name, value);
		
	} else if (isAttributeNameSafe(name)) {
		return name + '=' + quoteAttributeValueForBrowser(value);
	}
	return '';
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

export function createOpenTagMarkup(
	tag,
	props,
	rootContainerInstance
) {
	let ret = '<' + tag;

	const isCustomComponent = isCustomComponentFn(tag);

	for (const propKey in props) {
		if (!hasOwnProperty.call(props, propKey)) {
			continue;
		}
		let propValue = props[propKey];
		if (propValue == null) {
			continue;
		}
		if (propKey === STYLE) {
			propValue = createMarkupForStyles(propValue);
		}
		let markup = null;
		if (isCustomComponent) {
			if (!RESERVED_PROPS.hasOwnProperty(propKey)) {
				markup = createMarkupForCustomAttribute(propKey, propValue, rootContainerInstance.propTypes.hasOwnProperty(propKey));
			}
		} else {
			markup = createMarkupForProperty(propKey, propValue, rootContainerInstance.propTypes.hasOwnProperty(propKey));
		}
		if (markup) {
			ret += ' ' + markup;
		}
	}

	return ret;
}

export function renderTemplate(type, props, rootContainerInstance) {
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

	return {header: out, footer: footer, children: children};
}

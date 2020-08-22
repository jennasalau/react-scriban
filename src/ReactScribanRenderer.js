

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

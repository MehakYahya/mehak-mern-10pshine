
import '@testing-library/jest-dom';

if (typeof global.alert === 'undefined') {
	global.alert = () => {};
}

// make sure window.alert exists too 
if (typeof window !== 'undefined' && typeof window.alert === 'undefined') {
  window.alert = global.alert;
}

const _origConsoleError = console.error.bind(console);
console.error = (...args) => {
	try {
		const message = args[0];
		if (typeof message === 'string' && (message.includes('not wrapped in act(') || message.includes('Not implemented: window.alert'))) {
			return;
		}
		if (message && typeof message.message === 'string' && (message.message.includes('not wrapped in act(') || message.message.includes('Not implemented: window.alert'))) {
			return;
		}
	} catch (e) {
		
	}
	_origConsoleError(...args);
};

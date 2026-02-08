require('@testing-library/jest-dom');

// jsdom: scrollIntoView is missing or not a function; mock for App's useEffect
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};
}

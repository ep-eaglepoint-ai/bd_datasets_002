import '@testing-library/jest-dom'
import React from 'react'

// Ensure any imports of `react-dom/test-utils.act` delegate to `React.act`
// This prevents the deprecation warning that occurs when libraries call
// the old `react-dom/test-utils.act` helper.
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const rdt = require('react-dom/test-utils')
	if (rdt && typeof rdt.act === 'function' && typeof React.act === 'function') {
		rdt.act = React.act
	}
} catch (e) {
	// ignore if module not present in environment
}

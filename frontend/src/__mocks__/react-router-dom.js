const React = require('react');

module.exports = {
  BrowserRouter: ({ children }) => children,
  MemoryRouter: ({ children }) => children,
  Routes: ({ children }) => React.createElement(React.Fragment, null, children),
  Route: ({ element }) => element || null,
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
  useNavigate: () => {
    return (global.__TEST_ROUTER__ && global.__TEST_ROUTER__.navigate) || jest.fn();
  },
  useSearchParams: () => {
    const sp = global.__TEST_ROUTER__ && global.__TEST_ROUTER__.searchParams;
    // return an array to match react-router's [searchParams]
    return [
      {
        get: (k) => (sp && typeof sp.get === 'function' ? sp.get(k) : null),
      },
    ];
  },
  useLocation: () => ({ state: (global.__TEST_ROUTER__ && global.__TEST_ROUTER__.locationState) || {} }),
};

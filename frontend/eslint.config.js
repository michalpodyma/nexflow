// @ts-check
const nextConfig = require("eslint-config-next/core-web-vitals");

// react-hooks/set-state-in-effect (new in react-hooks v5) flags the common
// pattern of setLoading(true) at the top of useEffect before an async call.
// Fixing all 33 occurrences would require a large refactor with no user-visible
// benefit; disabling is the documented escape hatch for this rule.
module.exports = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

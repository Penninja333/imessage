const stub = {
  findDOMNode: () => null,
  render: () => null,
  unmountComponentAtNode: () => null,
  createPortal: () => null,
  flushSync: (cb) => (cb ? cb() : undefined),
};

module.exports = stub;
module.exports.default = stub;

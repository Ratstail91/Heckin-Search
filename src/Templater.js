const templaterOptions = {
  pattern: /\{(.*?)\}/g,
  template: '',
  middleware: () => {}
}

const templater = {
  setOptions: function (_options) {
    templaterOptions.pattern = _options.pattern || templaterOptions.pattern
    templaterOptions.template = _options.template || templaterOptions.template
    if (typeof _options.middleware === 'function') {
      templaterOptions.middleware = _options.middleware
    }
  },

  compile: function (data) {
    return templaterOptions.template.replace(templaterOptions.pattern, function (match, prop) {
      const value = templaterOptions.middleware(prop, data[prop], templaterOptions.template)
      if (typeof value !== 'undefined') {
        return value
      }
      return data[prop] || match
    })
  }
}
function FuzzySearchStrategy (string, crit) {
    if (string === null) {
      return false
    }

    fuzzysearch = require('fuzzysearch')

    return fuzzysearch(crit.toLowerCase(), string.toLowerCase())
  }function jsonLoader (location, callback) {
  function createStateChangeListener (xhr, callback) {
    return function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          callback(null, JSON.parse(xhr.responseText))
        } catch (err) {
          callback(err, null)
        }
      }
    }
  }
  
  function getXHR () {
    return window.XMLHttpRequest ? new window.XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP')
  }

  const xhr = getXHR()
  xhr.open('GET', location, true)
  xhr.onreadystatechange = createStateChangeListener(xhr, callback)
  xhr.send()
}function LiteralSearchStrategy (str, crit) {
    if (!str) return false
    str = str.trim().toLowerCase()
    crit = crit.endsWith(' ') ? [crit.toLowerCase()] : crit.trim().toLowerCase().split(' ')

    return crit.filter(word => str.indexOf(word) >= 0).length === crit.length
  }
function OptionsValidator (params) {
  if (!validateParams(params)) {
    throw new Error('-- OptionsValidator: required options missing')
  }

  if (!(this instanceof OptionsValidator)) {
    return new OptionsValidator(params)
  }

  const requiredOptions = params.required

  this.getRequiredOptions = function () {
    return requiredOptions
  }

  this.validate = function (parameters) {
    const errors = []
    requiredOptions.forEach(function (requiredOptionName) {
      if (typeof parameters[requiredOptionName] === 'undefined') {
        errors.push(requiredOptionName)
      }
    })
    return errors
  }

  function validateParams (params) {
    if (!params) {
      return false
    }
    return typeof params.required !== 'undefined' && params.required instanceof Array
  }
}
function NoSort () {
  return 0
}

const data = []
let opt = {}

opt.fuzzy = false
opt.limit = 10
opt.searchStrategy = opt.fuzzy ? FuzzySearchStrategy : LiteralSearchStrategy
opt.sort = NoSort
opt.exclude = []

function repository_put (data) {
  if (isObject(data)) {
    return addObject(data)
  }
  if (isArray(data)) {
    return addArray(data)
  }
  return undefined
}
function clear () {
  data.length = 0
  return data
}

function isObject (obj) {
  return Boolean(obj) && Object.prototype.toString.call(obj) === '[object Object]'
}

function isArray (obj) {
  return Boolean(obj) && Object.prototype.toString.call(obj) === '[object Array]'
}

function addObject (_data) {
  data.push(_data)
  return data
}

function addArray (_data) {
  const added = []
  clear()
  for (let i = 0, len = _data.length; i < len; i++) {
    if (isObject(_data[i])) {
      added.push(addObject(_data[i]))
    }
  }
  return added
}

function repository_search (crit) {
  if (!crit) {
    return []
  }
  return findMatches(data, crit, opt.searchStrategy, opt).sort(opt.sort)
}

function repository_setOptions (_opt) {
  opt = _opt || {}

  opt.fuzzy = _opt.fuzzy || false
  opt.limit = _opt.limit || 10
  opt.searchStrategy = _opt.fuzzy ? FuzzySearchStrategy : LiteralSearchStrategy
  opt.sort = _opt.sort || NoSort
  opt.exclude = _opt.exclude || []
}

function findMatches (data, crit, strategy, opt) {
  const matches = []
  for (let i = 0; i < data.length && matches.length < opt.limit; i++) {
    const match = findMatchesInObject(data[i], crit, strategy, opt)
    if (match) {
      matches.push(match)
    }
  }
  return matches
}

function findMatchesInObject (obj, crit, strategy, opt) {
  for (const key in obj) {
    if (!isExcluded(obj[key], opt.exclude) && strategy(obj[key], crit)) {
      return obj
    }
  }
}

function isExcluded (term, excludedTerms) {
  for (let i = 0, len = excludedTerms.length; i < len; i++) {
    const excludedTerm = excludedTerms[i]
    if (new RegExp(excludedTerm).test(term)) {
      return true
    }
  }
  return false
}const templaterOptions = {
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

  let options = {
    searchInput: null,
    resultsContainer: null,
    json: [],
    success: Function.prototype,
    searchResultTemplate: '<li><a href="{url}" title="{desc}">{title}</a></li>',
    templateMiddleware: Function.prototype,
    sortMiddleware: function () {
      return 0
    },
    noResultsText: 'No results found',
    limit: 10,
    fuzzy: false,
    debounceTime: null,
    exclude: [],
    onSearch: Function.prototype
  }

  let debounceTimerHandle
  const debounce = function (func, delayMillis) {
    if (delayMillis) {
      clearTimeout(debounceTimerHandle)
      debounceTimerHandle = setTimeout(func, delayMillis)
    } else {
      func.call()
    }
  }

  const requiredOptions = ['searchInput', 'resultsContainer', 'json']

  const optionsValidator = OptionsValidator({
    required: requiredOptions
  })

  window.SimpleJekyllSearch = function (_options) {
    const errors = optionsValidator.validate(_options)
    if (errors.length > 0) {
      throwError('You must specify the following required options: ' + requiredOptions)
    }

    options = utils.merge(options, _options)

    templater.setOptions({
      template: options.searchResultTemplate,
      middleware: options.templateMiddleware
    })

    repository_setOptions({
      fuzzy: options.fuzzy,
      limit: options.limit,
      sort: options.sortMiddleware,
      exclude: options.exclude
    })

    if (utils.isJSON(options.json)) {
      initWithJSON(options.json)
    } else {
      initWithURL(options.json)
    }

    const rv = {
      search: search
    }

    typeof options.success === 'function' && options.success.call(rv)
    return rv
  }

  function initWithJSON (json) {
    repository_put(json)
    registerInput()
  }

  function initWithURL (url) {
    jsonLoader(url, function (err, json) {
      if (err) {
        throwError('failed to get JSON (' + url + ')')
      }
      initWithJSON(json)
    })
  }

  function emptyResultsContainer () {
    options.resultsContainer.innerHTML = ''
  }

  function appendToResultsContainer (text) {
    options.resultsContainer.innerHTML += text
  }

  function registerInput () {
    options.searchInput.addEventListener('input', function (e) {
      if (isWhitelistedKey(e.which)) {
        emptyResultsContainer()
        debounce(function () { search(e.target.value) }, options.debounceTime)
      }
    })
  }

  function search (query) {
    if (isValidQuery(query)) {
      emptyResultsContainer()
      render(repository_search(query), query)

      typeof options.onSearch === 'function' && options.onSearch.call()
    }
  }

  function render (results, query) {
    const len = results.length
    if (len === 0) {
      return appendToResultsContainer(options.noResultsText)
    }
    for (let i = 0; i < len; i++) {
      results[i].query = query
      appendToResultsContainer(templater.compile(results[i]))
    }
  }

  function isValidQuery (query) {
    return query && query.length > 0
  }

  function isWhitelistedKey (key) {
    return [13, 16, 20, 37, 38, 39, 40, 91].indexOf(key) === -1
  }

  function throwError (message) {
    throw new Error('SimpleJekyllSearch --- ' + message)
  }

const utils = {

merge: function(defaultParams, mergeParams) {
  const mergedOptions = {}
  for (const option in defaultParams) {
    mergedOptions[option] = defaultParams[option]
    if (typeof mergeParams[option] !== 'undefined') {
      mergedOptions[option] = mergeParams[option]
    }
  }
  return mergedOptions
},

isJSON: function(json) {
  try {
    if (json instanceof Object && JSON.parse(JSON.stringify(json))) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}
}